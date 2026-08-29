/**
 * Exit 0 when the live SQLite file already has the tables this build needs.
 * Used so production boot can skip `prisma db push` (that call locks the DB).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const requiredTables = ["Listing", "User", "SiteStats", "SiteSetting"];

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table'`,
    );
    const names = new Set(
      (Array.isArray(rows) ? rows : []).map((row) => String(row.name ?? "")),
    );
    const missing = requiredTables.filter((name) => !names.has(name));
    if (missing.length > 0) {
      console.log(`[schema-ready] missing ${missing.join(", ")}`);
      process.exit(1);
    }
    console.log("[schema-ready] OK — skip prisma db push");
    process.exit(0);
  } catch (error) {
    console.warn("[schema-ready] check failed", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
