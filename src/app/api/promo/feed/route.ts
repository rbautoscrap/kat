import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promoWebhookSecret } from "@/lib/promo-queue";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = promoWebhookSecret();
  if (!expected) return false;
  const header = request.headers.get("x-promo-secret")?.trim() ?? "";
  const url = new URL(request.url);
  const query = url.searchParams.get("secret")?.trim() ?? "";
  const given = header || query;
  if (!given || given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** n8n: GET approved posts waiting to publish. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const take = Math.min(
    20,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 10)),
  );
  const rows = await prisma.promoQueueItem.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ costWon: "desc" }, { approvedAt: "asc" }],
    take,
    select: {
      id: true,
      listingId: true,
      headline: true,
      body: true,
      imageUrl: true,
      listingUrl: true,
      costWon: true,
      ageDays: true,
      channels: true,
      approvedAt: true,
      listing: {
        select: {
          serialNumber: true,
          year: true,
          make: true,
          model: true,
          category: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    items: rows.map((row) => ({
      ...row,
      channelList: row.channels
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    })),
  });
}

/** n8n: mark items posted after successful publish. Body: { ids: string[] } */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let ids: string[] = [];
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids)
      ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!ids.length) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const result = await prisma.promoQueueItem.updateMany({
    where: { id: { in: ids.slice(0, 50) }, status: "APPROVED" },
    data: { status: "POSTED", postedAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
