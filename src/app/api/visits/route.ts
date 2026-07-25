import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { getVisitStats, recordVisit } from "@/lib/visits";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET() {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`visits:get:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }
  const stats = await getVisitStats();
  return NextResponse.json(stats);
}

export async function POST() {
  const ip = await clientIpFromHeaders();
  const limited = rateLimit(`visits:post:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const cookieStore = await cookies();
  const today = todayKey();
  const alreadyCounted = cookieStore.get("visit_counted")?.value === today;

  let stats;
  if (alreadyCounted) {
    stats = await getVisitStats();
  } else {
    const updated = await recordVisit();
    stats = updated
      ? {
          todayVisits: updated.todayVisits,
          totalVisits: updated.totalVisits,
        }
      : await getVisitStats();
  }

  const response = NextResponse.json(stats);
  if (!alreadyCounted) {
    response.cookies.set("visit_counted", today, {
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      httpOnly: true,
    });
  }
  return response;
}
