/**
 * Ensure SQLite schema matches prisma/schema.prisma and regenerate client.
 * Run: node scripts/sync-db.mjs
 */
import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

run("npx prisma db push --skip-generate");
run("npx prisma generate");
console.log("sync-db: ok");
