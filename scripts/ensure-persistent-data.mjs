/**
 * Point SQLite + uploads at a Railway Volume.
 * Recommended mount path: /app/data
 *
 * Layout:
 *   /app/data/prod.db
 *   /app/data/uploads/*   ← photos (served by src/app/uploads/[...path]/route.ts)
 *
 * Prints KEY=value lines to stdout for start-prod to apply.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dataDir =
  process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
  process.env.DATA_DIR?.trim() ||
  "/app/data";

const dbPath = path.join(dataDir, "prod.db");
const uploadsPersistent = path.join(dataDir, "uploads");
const publicUploads = path.join(cwd, "public", "uploads");
const markerPath = path.join(dataDir, ".kat-persist");

function isDir(p) {
  try {
    return existsSync(p) && lstatSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isSymlink(p) {
  try {
    return existsSync(p) && lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function migrateFile(src, dest) {
  if (!existsSync(src) || existsSync(dest)) return;
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.error(`[persist] Migrated DB ${src} → ${dest}`);
}

function migrateUploadsTree(srcDir, destDir) {
  if (!isDir(srcDir) && !isSymlink(srcDir)) return;
  let realSrc = srcDir;
  try {
    if (isSymlink(srcDir)) {
      // already points at volume — nothing to migrate from public
      return;
    }
  } catch {
    return;
  }
  let entries = [];
  try {
    entries = readdirSync(realSrc);
  } catch {
    return;
  }
  if (entries.length === 0) return;
  mkdirSync(destDir, { recursive: true });
  for (const name of entries) {
    const from = path.join(realSrc, name);
    const to = path.join(destDir, name);
    if (existsSync(to)) continue;
    cpSync(from, to, { recursive: true });
  }
  console.error(`[persist] Migrated uploads ${realSrc} → ${destDir}`);
}

const tmpPersistent = path.join(dataDir, "tmp");
mkdirSync(uploadsPersistent, { recursive: true });
mkdirSync(tmpPersistent, { recursive: true });
mkdirSync(path.join(cwd, "public"), { recursive: true });

migrateFile(path.join(cwd, "prisma", "prod.db"), dbPath);
migrateFile(path.join(cwd, "prod.db"), dbPath);
migrateUploadsTree(publicUploads, uploadsPersistent);

// Remove public/uploads so Next does not 404 on a dead/empty static dir.
// Photos are served by App Router: /uploads/[...path] → Volume files.
if (existsSync(publicUploads)) {
  try {
    rmSync(publicUploads, { recursive: true, force: true });
    console.error(
      "[persist] Removed public/uploads (serving via /uploads route → Volume)",
    );
  } catch (err) {
    console.error("[persist] Could not remove public/uploads", err);
  }
}

try {
  writeFileSync(
    markerPath,
    `ok ${new Date().toISOString()} volume=${Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH)}\n`,
  );
} catch (err) {
  console.error("[persist] WARNING: cannot write marker on data dir", err);
}

const dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
const volumeAttached = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);

if (!volumeAttached) {
  console.error(
    "[persist] WARNING: RAILWAY_VOLUME_MOUNT_PATH is unset. " +
      "Attach a Volume mounted at /app/data or data will be lost on redeploy.",
  );
} else {
  console.error(
    `[persist] Volume mounted at ${process.env.RAILWAY_VOLUME_MOUNT_PATH}`,
  );
}

process.stdout.write(
  [
    `DATA_DIR=${dataDir}`,
    `DATABASE_URL=${dbUrl}`,
    `UPLOAD_DIR=${uploadsPersistent}`,
    `KAT_TMP_DIR=${tmpPersistent}`,
    `TMPDIR=${tmpPersistent}`,
    `TMP=${tmpPersistent}`,
    `TEMP=${tmpPersistent}`,
    // Keep large decode work in RAM so libvips does not flood tiny container /tmp.
    `VIPS_DISC_THRESHOLD=512m`,
    `PERSIST_VOLUME=${volumeAttached ? "1" : "0"}`,
  ].join("\n") + "\n",
);
