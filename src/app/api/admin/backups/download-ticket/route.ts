import { existsSync } from "node:fs";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getBackupFilePath, isSafeBackupName } from "@/lib/maintenance";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  getRailwayPublicOrigin,
  isRailwayHostname,
} from "@/lib/railway-origin";
import { createRestoreTicket } from "@/lib/restore-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Short-lived URL so a multi-GB ZIP downloads from Railway, not through Cloudflare. */
export async function POST(request: Request) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "");
  if (!isSafeBackupName(name)) {
    return NextResponse.json({ error: "잘못된 파일명입니다." }, { status: 400 });
  }

  const filePath = getBackupFilePath(name);
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json(
      { error: "백업 파일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = host.split(":")[0] ?? "";
  const railwayOrigin = getRailwayPublicOrigin();
  const ticket = createRestoreTicket(dbUser.id, 20 * 60);
  const path = `/api/admin/backups/${encodeURIComponent(name)}?ticket=${encodeURIComponent(ticket)}`;
  const url =
    !isRailwayHostname(hostname) && railwayOrigin
      ? `${railwayOrigin}${path}`
      : path;

  return NextResponse.json({ ok: true, url });
}
