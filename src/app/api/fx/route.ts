import { NextResponse } from "next/server";
import { getFxBoardQuote } from "@/lib/fx-rates";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`fx:get:${ip}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const quote = await getFxBoardQuote();
  if (!quote) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json(
    { ok: true, ...quote },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    },
  );
}
