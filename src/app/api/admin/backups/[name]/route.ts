import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getBackupFilePath, isSafeBackupName } from "@/lib/maintenance";
import { resolveSessionDbUser } from "@/lib/listing-access";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (!isSafeBackupName(decoded)) {
    return NextResponse.json({ error: "잘못된 파일명입니다." }, { status: 400 });
  }

  const filePath = getBackupFilePath(decoded);
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: "백업 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${decoded}"`,
      "Cache-Control": "no-store",
    },
  });
}
