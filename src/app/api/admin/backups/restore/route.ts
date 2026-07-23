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
import { prisma } from "@/lib/prisma";
import { restoreCorsHeaders } from "@/lib/railway-origin";
import { verifyRestoreTicket } from "@/lib/restore-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Large ZIP upload + extract on Railway volume */
export const maxDuration = 900;

function json(
  request: Request,
  body: unknown,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: restoreCorsHeaders(request),
  });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: restoreCorsHeaders(request),
  });
}

async function authorizeRestore(request: Request) {
  const ticket =
    request.headers.get("x-kat-restore-ticket")?.trim() ||
    new URL(request.url).searchParams.get("ticket")?.trim() ||
    "";

  if (ticket) {
    const parsed = verifyRestoreTicket(ticket);
    if (!parsed) return null;
    const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
    if (!user || !isAdmin(user.role)) return null;
    return user;
  }

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
 * - multipart `file` (ZIP upload via Railway, ticket or session), or
 * - JSON `{ name: "kat-backup-….zip" }` (already on Railway volume)
 */
export async function POST(request: Request) {
  if (!(await authorizeRestore(request))) {
    return json(request, { ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  let uploadedCleanup: (() => void) | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entry = form.get("file");
      if (!(entry instanceof File) || entry.size <= 0) {
        return json(
          request,
          { ok: false, error: "복원할 ZIP 파일을 선택해 주세요." },
          { status: 400 },
        );
      }
      if (!entry.name.toLowerCase().endsWith(".zip")) {
        return json(
          request,
          { ok: false, error: "ZIP 파일만 복원할 수 있습니다." },
          { status: 400 },
        );
      }

      const saved = await saveUploadedZip(entry);
      uploadedCleanup = saved.cleanup;

      const stored = storeUploadedBackupZip(
        saved.zipPath,
        isSafeBackupName(entry.name) ? entry.name : undefined,
      );
      const result = await restoreFromBackupZip(
        path.join(getBackupsDir(), stored.name),
      );
      saved.cleanup();
      uploadedCleanup = null;

      return json(request, {
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
      return json(
        request,
        { ok: false, error: "잘못된 백업 파일명입니다." },
        { status: 400 },
      );
    }

    const result = await restoreFromBackupName(name);
    return json(request, { ok: true, restored: result });
  } catch (error) {
    console.error("[POST /api/admin/backups/restore]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "복원에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return json(request, { ok: false, error: message }, { status: 500 });
  } finally {
    uploadedCleanup?.();
  }
}
