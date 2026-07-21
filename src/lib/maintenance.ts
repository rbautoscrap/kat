import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import archiver from "archiver";
import { prisma } from "@/lib/prisma";
import { getUploadsDir } from "@/lib/storage-paths";

const MAX_BACKUPS = 5;

export function getDataDir() {
  return (
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    (process.env.NODE_ENV === "production" ? "/app/data" : path.join(process.cwd(), "data"))
  );
}

export function getDbFilePath() {
  const fromUrl = process.env.DATABASE_URL?.trim();
  if (fromUrl?.startsWith("file:")) {
    return fromUrl.slice("file:".length);
  }
  return path.join(getDataDir(), "prod.db");
}

export function getBackupsDir() {
  return path.join(path.dirname(getDbFilePath()), "backups");
}

function backupStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function ensureBackupsDir() {
  const dir = getBackupsDir();
  mkdirSync(dir, { recursive: true });
  return dir;
}

function safeStat(filePath: string) {
  try {
    if (!existsSync(filePath)) return null;
    return statSync(filePath);
  } catch {
    return null;
  }
}

function dirStats(dirPath: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  if (!existsSync(dirPath)) return { files, bytes };

  const walk = (current: string) => {
    let entries: string[] = [];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(current, name);
      const st = safeStat(full);
      if (!st) continue;
      if (st.isDirectory()) walk(full);
      else {
        files += 1;
        bytes += st.size;
      }
    }
  };
  walk(dirPath);
  return { files, bytes };
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatUptime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${mins}분`;
  return `${mins}분`;
}

export type BackupInfo = {
  name: string;
  size: number;
  sizeLabel: string;
  createdAt: string;
};

export function listBackups(): BackupInfo[] {
  const dir = getBackupsDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => name.startsWith("kat-backup-") && name.endsWith(".zip"))
    .map((name) => {
      const st = safeStat(path.join(dir, name));
      const created = st?.mtime ?? new Date(0);
      return {
        name,
        size: st?.size ?? 0,
        sizeLabel: formatBytes(st?.size ?? 0),
        createdAt: created.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function pruneOldBackups() {
  const backups = listBackups();
  for (const old of backups.slice(MAX_BACKUPS)) {
    try {
      unlinkSync(path.join(getBackupsDir(), old.name));
    } catch {
      // ignore
    }
  }
}

export function isSafeBackupName(name: string) {
  return /^kat-backup-\d{8}-\d{6}\.zip$/.test(name);
}

export function getBackupFilePath(name: string) {
  if (!isSafeBackupName(name)) return null;
  const full = path.join(getBackupsDir(), name);
  if (!existsSync(full)) return null;
  return full;
}

/** Snapshot DB sidecars next to a temp copy for a consistent-ish zip entry set. */
function copyDbSnapshot(tempDir: string) {
  const dbPath = getDbFilePath();
  mkdirSync(tempDir, { recursive: true });
  const base = path.basename(dbPath);
  const copied: string[] = [];

  if (existsSync(dbPath)) {
    const dest = path.join(tempDir, base);
    copyFileSync(dbPath, dest);
    copied.push(dest);
  }
  for (const suffix of ["-wal", "-shm"]) {
    const side = `${dbPath}${suffix}`;
    if (existsSync(side)) {
      const dest = path.join(tempDir, `${base}${suffix}`);
      copyFileSync(side, dest);
      copied.push(dest);
    }
  }
  return copied;
}

export async function createBackupZip(): Promise<BackupInfo> {
  const backupsDir = ensureBackupsDir();
  const name = `kat-backup-${backupStamp()}.zip`;
  const outPath = path.join(backupsDir, name);
  const tempDir = mkdtempSync(path.join(tmpdir(), "kat-backup-"));

  try {
    copyDbSnapshot(tempDir);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver("zip", { zlib: { level: 1 } });

      output.on("close", () => resolve());
      output.on("error", reject);
      archive.on("error", reject);
      archive.on("warning", (err: Error & { code?: string }) => {
        if (err.code !== "ENOENT") reject(err);
      });

      archive.pipe(output);

      for (const file of readdirSync(tempDir)) {
        archive.file(path.join(tempDir, file), { name: `db/${file}` });
      }

      const uploadsDir = getUploadsDir();
      if (existsSync(uploadsDir)) {
        archive.directory(uploadsDir, "uploads");
      }

      const meta = {
        createdAt: new Date().toISOString(),
        service: "korea-auto-trade",
        dbFile: path.basename(getDbFilePath()),
      };
      archive.append(JSON.stringify(meta, null, 2), { name: "backup-info.json" });

      void archive.finalize();
    });
  } catch (error) {
    try {
      if (existsSync(outPath)) unlinkSync(outPath);
    } catch {
      // ignore
    }
    throw error;
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  pruneOldBackups();
  const st = safeStat(outPath);
  return {
    name,
    size: st?.size ?? 0,
    sizeLabel: formatBytes(st?.size ?? 0),
    createdAt: (st?.mtime ?? new Date()).toISOString(),
  };
}

export type MaintenanceSnapshot = {
  time: string;
  uptimeLabel: string;
  nodeVersion: string;
  persistence: {
    volumeMounted: boolean;
    dataDir: string;
    dbFileExists: boolean;
    uploadsDirExists: boolean;
    markerOk: boolean;
    ready: boolean;
  };
  storage: {
    dbSizeLabel: string;
    uploadsFiles: number;
    uploadsSizeLabel: string;
    backupsCount: number;
  };
  counts: {
    listings: number;
    available: number;
    reserved: number;
    sold: number;
    users: number;
    statements: number;
    offers: number;
  };
};

export async function collectMaintenanceSnapshot(): Promise<MaintenanceSnapshot> {
  const dataDir = getDataDir();
  const dbPath = getDbFilePath();
  const uploadsDir = getUploadsDir();
  const markerPath = path.join(dataDir, ".kat-persist");
  const volumeMounted = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);
  const dbStat = safeStat(dbPath);
  const uploads = dirStats(uploadsDir);

  const [
    listings,
    available,
    reserved,
    sold,
    users,
    statements,
    offers,
  ] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({ where: { saleStatus: "AVAILABLE" } }),
    prisma.listing.count({ where: { saleStatus: "RESERVED" } }),
    prisma.listing.count({ where: { saleStatus: "SOLD" } }),
    prisma.user.count(),
    prisma.transactionStatement.count(),
    prisma.purchaseOffer.count(),
  ]);

  return {
    time: new Date().toISOString(),
    uptimeLabel: formatUptime(process.uptime()),
    nodeVersion: process.version,
    persistence: {
      volumeMounted,
      dataDir,
      dbFileExists: Boolean(dbStat),
      uploadsDirExists: existsSync(uploadsDir),
      markerOk: existsSync(markerPath),
      ready: volumeMounted
        ? existsSync(markerPath) && Boolean(dbStat) && existsSync(uploadsDir)
        : Boolean(dbStat) && existsSync(uploadsDir),
    },
    storage: {
      dbSizeLabel: formatBytes(dbStat?.size ?? 0),
      uploadsFiles: uploads.files,
      uploadsSizeLabel: formatBytes(uploads.bytes),
      backupsCount: listBackups().length,
    },
    counts: {
      listings,
      available,
      reserved,
      sold,
      users,
      statements,
      offers,
    },
  };
}
