import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { cleanupVolumeScratch } from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";
import { getUploadsDir } from "@/lib/storage-paths";

/** New saves can sit on disk briefly before the DB row commits. */
const KEEP_FRESH_MS = 60 * 60 * 1000;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

let scheduled = false;

/** One pass after boot. Not on the request path. */
export function scheduleOrphanUploadPurge() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    void purgeDeletedServerData();
  }, 20_000);
}

async function dropRowsForDeletedListings() {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ListingImage" WHERE "listingId" NOT IN (SELECT "id" FROM "Listing")`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ListingView" WHERE "listingId" NOT IN (SELECT "id" FROM "Listing")`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "PurchaseOffer" WHERE "listingId" NOT IN (SELECT "id" FROM "Listing")`,
  );
}

async function reclaimSqliteFreePages() {
  const rows = await prisma.$queryRawUnsafe<Array<{ auto_vacuum: number | bigint }>>(
    `PRAGMA auto_vacuum`,
  );
  if (Number(rows[0]?.auto_vacuum) !== 2) return;
  await prisma.$executeRawUnsafe(`PRAGMA incremental_vacuum(200)`);
}

/** Remove upload files and leftover rows that no longer belong to a listing. */
export async function purgeDeletedServerData() {
  try {
    cleanupVolumeScratch(KEEP_FRESH_MS);
  } catch {
    // scratch dirs are optional
  }

  try {
    await dropRowsForDeletedListings();
  } catch (error) {
    console.error("[purge] leftover rows", error);
  }

  const dir = getUploadsDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }

  const rows = await prisma.listingImage.findMany({ select: { url: true } });
  const live = new Set<string>();
  for (const row of rows) {
    if (row.url.startsWith("/uploads/")) live.add(path.basename(row.url));
  }

  const cutoff = Date.now() - KEEP_FRESH_MS;
  let removed = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    if (name.startsWith(".") || live.has(name)) continue;
    if (!IMAGE_EXT.has(path.extname(name).toLowerCase())) continue;
    const full = path.join(dir, name);
    try {
      const st = await stat(full);
      if (!st.isFile() || st.mtimeMs > cutoff) continue;
      await unlink(full);
      removed += 1;
    } catch {
      // already gone or in use
    }
    if (i % 200 === 199) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  try {
    await reclaimSqliteFreePages();
  } catch {
    // full vacuum is intentionally not used
  }

  if (removed > 0) {
    console.log(`[purge] removed ${removed} unreferenced uploads`);
  }
}
