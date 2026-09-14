import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness only. Railway (and any load balancer) must not wait on SQLite or
 * the network volume — those stalls are what made the whole site look dead
 * every few minutes, then come back after a restart.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "korea-auto-trade",
      rev:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_BUILD_SHA ||
        "",
      time: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
