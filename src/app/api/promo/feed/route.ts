import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  isPromoChannelKey,
  mergeChannelResults,
  serializeChannelResults,
  type PromoChannelResults,
} from "@/lib/promo-channel-results";
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

function parseIncomingChannels(raw: unknown): PromoChannelResults {
  if (!raw || typeof raw !== "object") return {};
  const out: PromoChannelResults = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPromoChannelKey(key) || !value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    out[key] = {
      ok: Boolean(row.ok),
      at: typeof row.at === "string" ? row.at : undefined,
      url: typeof row.url === "string" ? row.url : undefined,
      error: typeof row.error === "string" ? row.error : undefined,
    };
  }
  return out;
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
      channelResults: true,
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

/**
 * n8n: report per-channel results and mark posted.
 * Body:
 *   { ids: string[] }  — all target channels ok, no URLs
 *   { items: [{ id, channels: { telegram: { ok, url?, error?, at? }, ... } }] }
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ids?: unknown;
    items?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const updates: { id: string; channels: PromoChannelResults }[] = [];

  if (Array.isArray(body.items)) {
    for (const raw of body.items.slice(0, 50)) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as { id?: unknown; channels?: unknown };
      if (typeof row.id !== "string" || !row.id) continue;
      updates.push({ id: row.id, channels: parseIncomingChannels(row.channels) });
    }
  }

  if (Array.isArray(body.ids)) {
    for (const id of body.ids.slice(0, 50)) {
      if (typeof id !== "string" || !id) continue;
      if (updates.some((u) => u.id === id)) continue;
      updates.push({
        id,
        channels: {
          telegram: { ok: true, at: nowIso },
          instagram: { ok: true, at: nowIso },
          facebook: { ok: true, at: nowIso },
          x: { ok: true, at: nowIso },
        },
      });
    }
  }

  if (!updates.length) {
    return NextResponse.json(
      { error: "ids or items required" },
      { status: 400 },
    );
  }

  let updated = 0;
  for (const item of updates) {
    const existing = await prisma.promoQueueItem.findUnique({
      where: { id: item.id },
      select: { id: true, status: true, channelResults: true, channels: true },
    });
    if (!existing || (existing.status !== "APPROVED" && existing.status !== "POSTED")) {
      continue;
    }

    let channelPayload = item.channels;
    if (!Object.keys(channelPayload).length) {
      const targets = existing.channels
        .split(",")
        .map((c) => c.trim())
        .filter(isPromoChannelKey);
      channelPayload = Object.fromEntries(
        targets.map((key) => [key, { ok: true, at: nowIso }]),
      );
    }

    const merged = mergeChannelResults(
      existing.channelResults,
      channelPayload,
      nowIso,
    );

    await prisma.promoQueueItem.update({
      where: { id: existing.id },
      data: {
        status: "POSTED",
        postedAt: existing.status === "POSTED" ? undefined : now,
        channelResults: serializeChannelResults(merged),
      },
    });
    updated += 1;
  }

  return NextResponse.json({ ok: true, updated });
}
