import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  getBackupsDir,
  isSafeBackupName,
  restoreFromBackupName,
  restoreFromBackupZip,
  storeUploadedBackupZip,
} from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Large ZIP upload + extract on Railway */
export const maxDuration = 300;

async function requireAdminUser() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) return null;
  return dbUser;
}

async function saveUploadedZip(file: File): Promise<{ zipPath: string; cleanup: () => void }> {
  const backupsDir = getBackupsDir();
  mkdirSync(backupsDir, { recursive: true });
  const stamp = Date.now();
  const zipPath = path.join(backupsDir, `.upload-${stamp}-${process.pid}.zip`);
  const webStream = file.stream();
  await pipeline(Readable.fromWeb(webStream as never), createWriteStream(zipPath));
  return {
    zipPath,
    cleanup: () => {
      try {
        if (existsSync(zipPath)) unlinkSync(zipPath);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Restore from:
 * - multipart `file` (ZIP upload), or
 * - JSON `{ name: "kat-backup-….zip" }` (already on server)
 */
export async function POST(request: Request) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let uploadedCleanup: (() => void) | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entry = form.get("file");
      if (!(entry instanceof File) || entry.size <= 0) {
        return NextResponse.json(
          { ok: false, error: "복원할 ZIP 파일을 선택해 주세요." },
          { status: 400 },
        );
      }
      if (!entry.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json(
          { ok: false, error: "ZIP 파일만 복원할 수 있습니다." },
          { status: 400 },
        );
      }

      const saved = await saveUploadedZip(entry);
      uploadedCleanup = saved.cleanup;

      // Keep a copy in the backups list when the name matches, then restore.
      const stored = storeUploadedBackupZip(
        saved.zipPath,
        isSafeBackupName(entry.name) ? entry.name : undefined,
      );
      const result = await restoreFromBackupZip(
        path.join(getBackupsDir(), stored.name),
      );
      saved.cleanup();
      uploadedCleanup = null;

      return NextResponse.json({
        ok: true,
        backup: stored,
        restored: result,
      });
    }

    const body = (await request.json().catch(() => null)) as {
      name?: string;
    } | null;
    const name = body?.name?.trim() ?? "";
    if (!isSafeBackupName(name)) {
      return NextResponse.json(
        { ok: false, error: "잘못된 백업 파일명입니다." },
        { status: 400 },
      );
    }

    const result = await restoreFromBackupName(name);
    return NextResponse.json({ ok: true, restored: result });
  } catch (error) {
    console.error("[POST /api/admin/backups/restore]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "복원에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    uploadedCleanup?.();
  }
}
