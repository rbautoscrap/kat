import "server-only";

import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getUploadsDir } from "@/lib/storage-paths";

const MAX_BACKUPS = 5;
const require = createRequire(path.join(process.cwd(), "package.json"));

type ArchiverFactory = (
  format: string,
  options?: { zlib?: { level?: number } },
) => {
  pipe: (dest: NodeJS.WritableStream) => unknown;
  file: (filepath: string, data: { name: string }) => unknown;
  directory: (dirpath: string, destpath: string | false) => unknown;
  append: (
    source: string | Buffer,
    data: { name: string },
  ) => unknown;
  finalize: () => Promise<void> | void;
  on: (event: string, cb: (err: Error & { code?: string }) => void) => unknown;
};

function loadArchiver(): ArchiverFactory {
  const mod = require("archiver") as ArchiverFactory | { default: ArchiverFactory };
  if (typeof mod === "function") return mod;
  if (mod && typeof mod.default === "function") return mod.default;
  throw new Error("archiver 모듈을 불러오지 못했습니다.");
}

export function getDataDir() {
  return (
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "/app/data"
      : path.join(process.cwd(), "data"))
  );
}

export function getDbFilePath() {
  const fromUrl = process.env.DATABASE_URL?.trim();
  if (fromUrl?.startsWith("file:")) {
    const raw = fromUrl.slice("file:".length);
    // Prisma may use relative file: URLs; resolve against cwd.
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
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
      const full = path.join(dir, name);
      const st = safeStat(full);
      // Remove empty/corrupt leftovers from failed runs
      if (!st || st.size <= 0) {
        try {
          unlinkSync(full);
        } catch {
          // ignore
        }
        return null;
      }
      return {
        name,
        size: st.size,
        sizeLabel: formatBytes(st.size),
        createdAt: st.mtime.toISOString(),
      };
    })
    .filter((row): row is BackupInfo => Boolean(row))
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

export function deleteBackup(name: string): { ok: true } | { ok: false; error: string } {
  const filePath = getBackupFilePath(name);
  if (!filePath) {
    return { ok: false, error: "백업 파일을 찾을 수 없습니다." };
  }
  try {
    unlinkSync(filePath);
    return { ok: true };
  } catch (error) {
    console.error("[deleteBackup]", error);
    return { ok: false, error: "백업 삭제에 실패했습니다." };
  }
}

function copyDbSnapshot(tempDir: string) {
  const dbPath = getDbFilePath();
  mkdirSync(tempDir, { recursive: true });

  if (!existsSync(dbPath)) {
    throw new Error(`데이터베이스 파일이 없습니다: ${dbPath}`);
  }

  const base = path.basename(dbPath);
  copyFileSync(dbPath, path.join(tempDir, base));

  for (const suffix of ["-wal", "-shm"]) {
    const side = `${dbPath}${suffix}`;
    if (existsSync(side)) {
      copyFileSync(side, path.join(tempDir, `${base}${suffix}`));
    }
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "알 수 없는 오류가 발생했습니다.";
}

export async function createBackupZip(): Promise<BackupInfo> {
  const archiver = loadArchiver();
  const backupsDir = ensureBackupsDir();
  const name = `kat-backup-${backupStamp()}.zip`;
  const outPath = path.join(backupsDir, name);
  // Keep temp files on the same volume as the zip output (more reliable than /tmp).
  const tempDir = path.join(backupsDir, `.tmp-${backupStamp()}-${process.pid}`);

  try {
    mkdirSync(tempDir, { recursive: true });
    copyDbSnapshot(tempDir);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver("zip", { zlib: { level: 1 } });
      let settled = false;

      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        reject(err instanceof Error ? err : new Error(errorMessage(err)));
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      output.on("close", ok);
      output.on("error", fail);
      archive.on("error", fail);
      archive.on("warning", (err) => {
        // Missing optional files are fine; real IO issues should fail.
        if (err.code !== "ENOENT") fail(err);
      });

      archive.pipe(output);

      for (const file of readdirSync(tempDir)) {
        archive.file(path.join(tempDir, file), { name: `db/${file}` });
      }

      const uploadsDir = getUploadsDir();
      if (existsSync(uploadsDir)) {
        archive.directory(uploadsDir, "uploads");
      }

      archive.append(
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            service: "korea-auto-trade",
            dbFile: path.basename(getDbFilePath()),
            uploadsDir,
          },
          null,
          2,
        ),
        { name: "backup-info.json" },
      );

      Promise.resolve(archive.finalize()).catch(fail);
    });
  } catch (error) {
    try {
      if (existsSync(outPath)) unlinkSync(outPath);
    } catch {
      // ignore
    }
    throw new Error(`백업 생성 실패: ${errorMessage(error)}`);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  const st = safeStat(outPath);
  if (!st || st.size <= 0) {
    try {
      unlinkSync(outPath);
    } catch {
      // ignore
    }
    throw new Error("백업 파일이 비어 있습니다. 다시 시도해 주세요.");
  }

  pruneOldBackups();
  return {
    name,
    size: st.size,
    sizeLabel: formatBytes(st.size),
    createdAt: st.mtime.toISOString(),
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

  const [listings, available, reserved, sold, users, statements, offers] =
    await Promise.all([
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
