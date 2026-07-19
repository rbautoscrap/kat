/**
 * Point SQLite + uploads at a Railway Volume.
 * Recommended mount path: /app/data
 *
 * Layout:
 *   /app/data/prod.db
 *   /app/data/uploads/*
 *   /app/public/uploads -> /app/data/uploads  (Next.js serves /uploads/…)
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
  symlinkSync,
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
  if (!isDir(srcDir) || isSymlink(srcDir)) return;
  let entries = [];
  try {
    entries = readdirSync(srcDir);
  } catch {
    return;
  }
  if (entries.length === 0) return;
  mkdirSync(destDir, { recursive: true });
  for (const name of entries) {
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    if (existsSync(to)) continue;
    cpSync(from, to, { recursive: true });
  }
  console.error(`[persist] Migrated uploads ${srcDir} → ${destDir}`);
}

mkdirSync(uploadsPersistent, { recursive: true });
mkdirSync(path.join(cwd, "public"), { recursive: true });

migrateFile(path.join(cwd, "prisma", "prod.db"), dbPath);
migrateFile(path.join(cwd, "prod.db"), dbPath);
migrateUploadsTree(publicUploads, uploadsPersistent);

if (!isSymlink(publicUploads)) {
  if (existsSync(publicUploads)) {
    migrateUploadsTree(publicUploads, uploadsPersistent);
    rmSync(publicUploads, { recursive: true, force: true });
  }
  symlinkSync(uploadsPersistent, publicUploads, "dir");
  console.error(`[persist] Symlink ${publicUploads} → ${uploadsPersistent}`);
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

// Parsed by start-prod (stdout only — keep logs on stderr)
process.stdout.write(
  [
    `DATA_DIR=${dataDir}`,
    `DATABASE_URL=${dbUrl}`,
    `UPLOAD_DIR=${uploadsPersistent}`,
    `PERSIST_VOLUME=${volumeAttached ? "1" : "0"}`,
  ].join("\n") + "\n",
);
