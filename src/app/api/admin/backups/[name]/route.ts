import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteBackup,
  getBackupFilePath,
  isSafeBackupName,
} from "@/lib/maintenance";
import { prisma } from "@/lib/prisma";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { verifyRestoreTicket } from "@/lib/restore-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

type Params = { params: Promise<{ name: string }> };

async function requireAdminUser() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) return null;
  return dbUser;
}

export async function GET(request: Request, { params }: Params) {
  const ticket = new URL(request.url).searchParams.get("ticket")?.trim() ?? "";
  if (ticket) {
    const parsed = verifyRestoreTicket(ticket);
    const user = parsed
      ? await prisma.user.findUnique({
          where: { id: parsed.userId },
          select: { role: true },
        })
      : null;
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
  } else if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (!isSafeBackupName(decoded)) {
    return NextResponse.json({ error: "잘못된 파일명입니다." }, { status: 400 });
  }

  const filePath = getBackupFilePath(decoded);
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json(
      { error: "백업 파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    size = 0;
  }

  const stream = createReadStream(filePath);
  const headers: Record<string, string> = {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${decoded}"`,
    "Cache-Control": "no-store",
  };
  if (size > 0) {
    headers["Content-Length"] = String(size);
  }

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await requireAdminUser())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (!isSafeBackupName(decoded)) {
    return NextResponse.json({ error: "잘못된 파일명입니다." }, { status: 400 });
  }

  const result = deleteBackup(decoded);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
