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

function applyPersistEnv() {
  const script = path.join(process.cwd(), "scripts", "ensure-persistent-data.mjs");
  if (!existsSync(script)) {
    console.warn("[start-prod] ensure-persistent-data.mjs missing");
    return;
  }
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`[start-prod] ensure-persistent-data failed: ${result.status}`);
    process.exit(result.status ?? 1);
  }
  for (const line of (result.stdout || "").split("\n")) {
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && value) process.env[key] = value;
  }
}

// 1) Bind DB + uploads to Volume (/app/data) before anything else
applyPersistEnv();

// 2) Never use Postgres plugin URLs — this app is SQLite-only
const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
if (!dbUrl.startsWith("file:")) {
  process.env.DATABASE_URL = "file:/app/data/prod.db";
  console.log("[start-prod] DATABASE_URL forced to file:/app/data/prod.db");
}

if (!process.env.UPLOAD_DIR?.trim()) {
  process.env.UPLOAD_DIR = "/app/data/uploads";
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
console.log(`[start-prod] DATA_DIR=${process.env.DATA_DIR ?? "(unset)"}`);
console.log(`[start-prod] DATABASE_URL=${process.env.DATABASE_URL}`);
console.log(`[start-prod] UPLOAD_DIR=${process.env.UPLOAD_DIR}`);
console.log(
  `[start-prod] PERSIST_VOLUME=${process.env.PERSIST_VOLUME === "1" ? "yes" : "NO — attach Volume at /app/data"}`,
);
console.log(`[start-prod] AUTH_URL=${process.env.AUTH_URL ?? "(unset)"}`);
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

const ensureAdmin = path.join(process.cwd(), "scripts", "ensure-admin.mjs");
if (existsSync(ensureAdmin)) {
  console.log("[start-prod] Ensuring ADMIN account…");
  const ensured = spawnSync(process.execPath, [ensureAdmin], {
    stdio: "inherit",
    env: process.env,
  });
  if (ensured.status !== 0) {
    console.error(`[start-prod] ensure-admin failed with code ${ensured.status}`);
    process.exit(ensured.status ?? 1);
  }
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
