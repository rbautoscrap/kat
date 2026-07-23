import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  getRailwayPublicOrigin,
  isRailwayHostname,
} from "@/lib/railway-origin";
import { createRestoreTicket } from "@/lib/restore-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issue a short-lived ticket + Railway upload URL so large ZIP restores
 * bypass Cloudflare's ~100MB body limit on the custom domain.
 */
export async function POST(request: Request) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser || !isAdmin(dbUser.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = host.split(":")[0] ?? "";
  const alreadyOnRailway = isRailwayHostname(hostname);
  const railwayOrigin = getRailwayPublicOrigin();

  const ticket = createRestoreTicket(dbUser.id);
  const path = "/api/admin/backups/restore";

  let uploadUrl = path;
  let viaRailway = false;

  if (!alreadyOnRailway && railwayOrigin) {
    uploadUrl = `${railwayOrigin}${path}`;
    viaRailway = true;
  }

  return NextResponse.json({
    ok: true,
    ticket,
    uploadUrl,
    viaRailway,
    railwayOrigin,
    expiresInSec: 45 * 60,
  });
}
