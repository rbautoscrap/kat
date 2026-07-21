import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { createBackupZip } from "@/lib/maintenance";
import { resolveSessionDbUser } from "@/lib/listing-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Allow enough time for DB + image zip on Railway */
export const maxDuration = 300;

/** Admin-only: create a ZIP backup (DB + uploads) on the volume. */
export async function POST() {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const backup = await createBackupZip();
    return NextResponse.json({ ok: true, backup });
  } catch (error) {
    console.error("[POST /api/admin/backups]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "백업 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
