import "server-only";

import {
  copyFileSync,
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createZipArchiver } from "@/lib/create-zip-archiver";
import { extractZipSafe } from "@/lib/extract-zip";
import { disconnectPrisma, prisma } from "@/lib/prisma";
import { getUploadsDir } from "@/lib/storage-paths";

const MAX_BACKUPS = 5;

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
  const archive = await createZipArchiver({ zlib: { level: 1 } });
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
      if (existsSync(uploadsDir) && archive.directory) {
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

export type RestoreResult = {
  ok: true;
  listings: number;
  users: number;
  uploadsFiles: number;
};

function findRestoredDbFile(dbDir: string): string {
  if (!existsSync(dbDir)) {
    throw new Error("백업에 데이터베이스 폴더(db/)가 없습니다.");
  }
  const files = readdirSync(dbDir).filter((name) => !name.startsWith("."));
  const preferred = path.basename(getDbFilePath());
  if (files.includes(preferred)) {
    return path.join(dbDir, preferred);
  }
  const dbFiles = files.filter(
    (name) => name.endsWith(".db") && !name.includes("-wal") && !name.includes("-shm"),
  );
  if (dbFiles.length === 0) {
    throw new Error("백업에 SQLite 데이터베이스 파일이 없습니다.");
  }
  return path.join(dbDir, dbFiles[0]!);
}

function removeDbSidecars(dbPath: string) {
  for (const suffix of ["-wal", "-shm"]) {
    const side = `${dbPath}${suffix}`;
    if (existsSync(side)) {
      try {
        unlinkSync(side);
      } catch {
        // ignore
      }
    }
  }
}

function replaceFile(fromPath: string, toPath: string) {
  mkdirSync(path.dirname(toPath), { recursive: true });
  const tmp = `${toPath}.restoring`;
  try {
    if (existsSync(tmp)) unlinkSync(tmp);
  } catch {
    // ignore
  }
  copyFileSync(fromPath, tmp);
  try {
    if (existsSync(toPath)) unlinkSync(toPath);
  } catch {
    // ignore — rename may overwrite on some platforms
  }
  renameSync(tmp, toPath);
}

function replaceUploadsDir(fromUploads: string, uploadsDir: string) {
  const parent = path.dirname(uploadsDir);
  mkdirSync(parent, { recursive: true });
  const staging = path.join(parent, `.uploads-restore-${backupStamp()}-${process.pid}`);
  const previous = path.join(parent, `.uploads-prev-${backupStamp()}-${process.pid}`);

  try {
    if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    if (existsSync(fromUploads)) {
      cpSync(fromUploads, staging, { recursive: true });
    }

    if (existsSync(uploadsDir)) {
      if (existsSync(previous)) rmSync(previous, { recursive: true, force: true });
      renameSync(uploadsDir, previous);
    }
    renameSync(staging, uploadsDir);

    if (existsSync(previous)) {
      try {
        rmSync(previous, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup; restore already applied.
      }
    }
  } catch (error) {
    // Attempt rollback if we moved the live uploads aside.
    try {
      if (!existsSync(uploadsDir) && existsSync(previous)) {
        renameSync(previous, uploadsDir);
      }
    } catch {
      // ignore
    }
    try {
      if (existsSync(staging)) rmSync(staging, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw error;
  }
}

/**
 * Restore DB + uploads from a KAT backup ZIP on disk.
 * Disconnects Prisma while swapping files, then verifies with a count query.
 */
export async function restoreFromBackupZip(zipPath: string): Promise<RestoreResult> {
  if (!existsSync(zipPath)) {
    throw new Error("백업 ZIP 파일을 찾을 수 없습니다.");
  }
  const st = safeStat(zipPath);
  if (!st || st.size <= 0) {
    throw new Error("백업 ZIP 파일이 비어 있습니다.");
  }

  const workRoot = path.join(
    getBackupsDir(),
    `.restore-${backupStamp()}-${process.pid}`,
  );
  const extractRoot = path.join(workRoot, "extracted");

  try {
    mkdirSync(extractRoot, { recursive: true });
    await extractZipSafe(zipPath, extractRoot);

    const dbSource = findRestoredDbFile(path.join(extractRoot, "db"));
    const uploadsSource = path.join(extractRoot, "uploads");
    const dbTarget = getDbFilePath();
    const uploadsDir = getUploadsDir();

    // Marker so monitoring still sees a healthy volume after restore.
    try {
      const marker = path.join(getDataDir(), ".kat-persist");
      mkdirSync(getDataDir(), { recursive: true });
      if (!existsSync(marker)) {
        writeFileSync(marker, `${new Date().toISOString()}\n`);
      }
    } catch {
      // ignore
    }

    await disconnectPrisma();

    removeDbSidecars(dbTarget);
    replaceFile(dbSource, dbTarget);

    // Restore WAL/SHM from the backup when present (same basename).
    const sourceBase = path.basename(dbSource);
    for (const suffix of ["-wal", "-shm"]) {
      const sideSource = path.join(path.dirname(dbSource), `${sourceBase}${suffix}`);
      if (existsSync(sideSource)) {
        replaceFile(sideSource, `${dbTarget}${suffix}`);
      }
    }

    if (existsSync(uploadsSource)) {
      replaceUploadsDir(uploadsSource, uploadsDir);
    } else {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Force a fresh connection against the restored file.
    const listings = await prisma.listing.count();
    const users = await prisma.user.count();
    const uploads = dirStats(uploadsDir);

    return {
      ok: true,
      listings,
      users,
      uploadsFiles: uploads.files,
    };
  } catch (error) {
    throw new Error(`복원 실패: ${errorMessage(error)}`);
  } finally {
    try {
      rmSync(workRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export async function restoreFromBackupName(name: string): Promise<RestoreResult> {
  const filePath = getBackupFilePath(name);
  if (!filePath) {
    throw new Error("백업 파일을 찾을 수 없습니다.");
  }
  return restoreFromBackupZip(filePath);
}

/** Save an uploaded ZIP into the backups folder (keeps naming convention). */
export function storeUploadedBackupZip(
  sourcePath: string,
  originalName?: string,
): BackupInfo {
  ensureBackupsDir();
  let name =
    originalName && isSafeBackupName(originalName)
      ? originalName
      : `kat-backup-${backupStamp()}.zip`;
  if (!isSafeBackupName(name)) {
    name = `kat-backup-${backupStamp()}.zip`;
  }

  const dest = path.join(getBackupsDir(), name);
  if (path.resolve(sourcePath) !== path.resolve(dest)) {
    copyFileSync(sourcePath, dest);
  }

  pruneOldBackups();
  const st = safeStat(dest);
  if (!st || st.size <= 0) {
    throw new Error("업로드된 백업 파일이 비어 있습니다.");
  }
  return {
    name,
    size: st.size,
    sizeLabel: formatBytes(st.size),
    createdAt: st.mtime.toISOString(),
  };
}

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
