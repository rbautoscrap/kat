/**
 * Ensure User signup-guard columns/indexes exist even when `prisma db push`
 * was skipped or failed. Prevents admin/users crashing with "no such column".
 *
 * Usage:
 *   node scripts/ensure-signup-columns.mjs columns
 *   node scripts/ensure-signup-columns.mjs indexes
 *   node scripts/ensure-signup-columns.mjs   (both)
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const phase = process.argv[2] || "all";

async function columnNames(prisma, table) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return new Set(rows.map((r) => r.name));
}

async function ensureColumn(prisma, table, name, decl) {
  const cols = await columnNames(prisma, table);
  if (cols.has(name)) return false;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN "${name}" ${decl}`,
  );
  console.log(`[ensure-signup] added ${table}.${name}`);
  return true;
}

async function ensureColumns(prisma) {
  await ensureColumn(prisma, "User", "phoneKey", "TEXT");
  await ensureColumn(prisma, "User", "signupIpHash", "TEXT");
  await ensureColumn(prisma, "User", "signupDeviceId", "TEXT");
}

async function ensureIndexes(prisma) {
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneKey_key" ON "User"("phoneKey")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "User_signupIpHash_idx" ON "User"("signupIpHash")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "User_signupDeviceId_idx" ON "User"("signupDeviceId")`,
  );
  console.log("[ensure-signup] indexes OK");
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    if (phase === "columns" || phase === "all") {
      await ensureColumns(prisma);
      console.log("[ensure-signup] columns OK");
    }
    if (phase === "indexes" || phase === "all") {
      await ensureIndexes(prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-signup] failed:", err);
  process.exit(0);
});
