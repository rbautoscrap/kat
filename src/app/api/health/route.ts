import { NextResponse } from "next/server";

/** Lightweight uptime check — no auth / no DB. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "korea-auto-trade",
    time: new Date().toISOString(),
  });
}
