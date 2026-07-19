import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const port = String(process.env.PORT || "8080");
const bindHost = "0.0.0.0";

function resolveBin(pkg, ...parts) {
  try {
    const pkgJson = require.resolve(`${pkg}/package.json`);
    return path.join(path.dirname(pkgJson), ...parts);
  } catch {
    return null;
  }
}

// This app uses SQLite in prisma/schema.prisma — ignore Postgres-style URLs from Railway plugins
const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!dbUrl.startsWith("file:")) {
  process.env.DATABASE_URL = "file:./prod.db";
  console.log(
    `[start-prod] DATABASE_URL ${dbUrl ? "was not a file: URL" : "unset"} → using file:./prod.db`,
  );
}

if (!process.env.AUTH_SECRET?.trim()) {
  process.env.AUTH_SECRET = randomBytes(32).toString("hex");
  console.warn(
    "[start-prod] AUTH_SECRET unset → generated temporary secret (set AUTH_SECRET in Railway Variables)",
  );
}

if (!process.env.AUTH_URL?.trim()) {
  const domain =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    process.env.RAILWAY_STATIC_URL?.trim();
  if (domain) {
    process.env.AUTH_URL = domain.startsWith("http")
      ? domain
      : `https://${domain}`;
    console.log(`[start-prod] AUTH_URL → ${process.env.AUTH_URL}`);
  }
}

console.log("[start-prod] Boot checks");
console.log(`[start-prod] NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`);
console.log(`[start-prod] PORT=${port}`);
console.log(`[start-prod] bind=${bindHost}`);
console.log(`[start-prod] AUTH_URL=${process.env.AUTH_URL ?? "(unset)"}`);
console.log(`[start-prod] DATABASE_URL=${process.env.DATABASE_URL}`);
console.log("[start-prod] AUTH_SECRET=(set)");

const prismaCli = resolveBin("prisma", "build", "index.js");
const nextCli =
  resolveBin("next", "dist", "bin", "next") ||
  resolveBin("next", "dist", "bin", "next.js");

if (!prismaCli || !existsSync(prismaCli)) {
  console.error("[start-prod] prisma CLI not found");
  process.exit(1);
}
if (!nextCli || !existsSync(nextCli)) {
  console.error("[start-prod] next CLI not found");
  process.exit(1);
}

console.log("[start-prod] Running prisma db push…");
const push = spawnSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
  stdio: "inherit",
  env: process.env,
});
if (push.status !== 0) {
  console.error(`[start-prod] prisma db push failed with code ${push.status}`);
  process.exit(push.status ?? 1);
}

console.log(`[start-prod] Starting Next.js on http://${bindHost}:${port}`);
const next = spawnSync(
  process.execPath,
  [nextCli, "start", "--hostname", bindHost, "--port", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: port,
    },
  },
);
process.exit(next.status ?? 1);
