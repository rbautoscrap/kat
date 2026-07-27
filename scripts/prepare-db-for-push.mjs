/**
 * Run before `prisma db push` so schema changes that require clean data
 * (e.g. unique listingId+userId on PurchaseOffer) do not crash boot.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

function resolvePrismaCli() {
  try {
    const pkgJson = require.resolve("prisma/package.json");
    return path.join(path.dirname(pkgJson), "build", "index.js");
  } catch {
    return null;
  }
}

const prismaCli = resolvePrismaCli();
if (!prismaCli || !existsSync(prismaCli)) {
  console.warn("[prepare-db] prisma CLI not found — skipping");
  process.exit(0);
}

const statements = [
  // Keep newest row per member+listing (legacy multi-offer rows from old 3-cap).
  `DELETE FROM "PurchaseOffer"
   WHERE "rowid" NOT IN (
     SELECT MAX("rowid") FROM "PurchaseOffer" GROUP BY "listingId", "userId"
   );`,
];

for (const sql of statements) {
  console.log("[prepare-db] Running pre-push SQL…");
  const result = spawnSync(
    process.execPath,
    [prismaCli, "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
    {
      input: sql,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    // Table may not exist on first boot — continue to db push.
    console.warn(
      `[prepare-db] SQL skipped or failed (code ${result.status}) — continuing`,
    );
  } else {
    console.log("[prepare-db] OK");
  }
}
