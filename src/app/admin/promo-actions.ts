"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import {
  isPromoChannelKey,
  mergeChannelResults,
  serializeChannelResults,
  type PromoChannelResults,
} from "@/lib/promo-channel-results";
import { fillPromoQueue, listPromoQueue } from "@/lib/promo-queue";
import { publishPromoToTelegram } from "@/lib/promo-telegram";
import { prisma } from "@/lib/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

async function assertAdmin() {
  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  if (!session?.user || !dbUser || !isAdmin(dbUser.role)) return null;
  return dbUser;
}

export async function refillPromoQueueAction(): Promise<
  ActionResult & { created?: number }
> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const { created } = await fillPromoQueue();
  revalidatePath("/admin/promo");
  return { ok: true, created };
}

export async function loadPromoQueueAction() {
  if (!(await assertAdmin())) return [];
  return listPromoQueue();
}

const updateSchema = z.object({
  id: z.string().min(1),
  headline: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
  channels: z.string().trim().max(120).optional(),
});

export async function updatePromoDraftAction(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력 오류" };
  }
  const row = await prisma.promoQueueItem.findUnique({
    where: { id: parsed.data.id },
  });
  if (!row || row.status !== "DRAFT") {
    return { ok: false, error: "초안만 수정할 수 있습니다." };
  }
  await prisma.promoQueueItem.update({
    where: { id: row.id },
    data: {
      headline: parsed.data.headline ?? row.headline,
      body: parsed.data.body ?? row.body,
      channels: parsed.data.channels ?? row.channels,
    },
  });
  revalidatePath("/admin/promo");
  return { ok: true };
}

export async function approvePromoAction(id: string): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const row = await prisma.promoQueueItem.findUnique({ where: { id } });
  if (!row || row.status !== "DRAFT") {
    return { ok: false, error: "초안만 승인할 수 있습니다." };
  }
  await prisma.promoQueueItem.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidatePath("/admin/promo");
  return { ok: true };
}

export async function skipPromoAction(id: string): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const row = await prisma.promoQueueItem.findUnique({ where: { id } });
  if (!row || (row.status !== "DRAFT" && row.status !== "APPROVED")) {
    return { ok: false, error: "대기 항목만 제외할 수 있습니다." };
  }
  await prisma.promoQueueItem.update({
    where: { id },
    data: { status: "SKIPPED" },
  });
  revalidatePath("/admin/promo");
  return { ok: true };
}

const channelResultSchema = z.record(
  z.string(),
  z.object({
    ok: z.boolean(),
    url: z.string().trim().max(500).optional(),
    error: z.string().trim().max(300).optional(),
    at: z.string().trim().max(40).optional(),
  }),
);

/** Admin: record per-channel publish results (n8n or manual). */
export async function recordPromoPostedAction(input: {
  id: string;
  channels: Record<string, { ok: boolean; url?: string; error?: string }>;
}): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const id = String(input.id ?? "").trim();
  const parsed = channelResultSchema.safeParse(input.channels ?? {});
  if (!id || !parsed.success) {
    return { ok: false, error: "채널 결과가 올바르지 않습니다." };
  }

  const row = await prisma.promoQueueItem.findUnique({ where: { id } });
  if (!row || (row.status !== "APPROVED" && row.status !== "POSTED")) {
    return { ok: false, error: "승인·게시 항목만 기록할 수 있습니다." };
  }

  const nowIso = new Date().toISOString();
  const incoming: PromoChannelResults = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!isPromoChannelKey(key)) continue;
    incoming[key] = {
      ok: value.ok,
      url: value.url,
      error: value.error,
      at: value.at || nowIso,
    };
  }
  if (!Object.keys(incoming).length) {
    return { ok: false, error: "채널을 1개 이상 선택해 주세요." };
  }

  const merged = mergeChannelResults(row.channelResults, incoming, nowIso);
  await prisma.promoQueueItem.update({
    where: { id },
    data: {
      status: "POSTED",
      postedAt: row.postedAt ?? new Date(),
      channelResults: serializeChannelResults(merged),
    },
  });
  revalidatePath("/admin/promo");
  return { ok: true };
}

/** Publish one approved item to Telegram and store the channel result. */
export async function publishPromoTelegramAction(
  id: string,
): Promise<ActionResult & { detail?: string }> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const row = await prisma.promoQueueItem.findUnique({ where: { id } });
  if (!row || (row.status !== "APPROVED" && row.status !== "POSTED")) {
    return { ok: false, error: "승인된 항목만 게시할 수 있습니다." };
  }

  const tg = await publishPromoToTelegram(row.body);
  const merged = mergeChannelResults(
    row.channelResults,
    {
      telegram: {
        ok: tg.ok,
        at: tg.at,
        url: tg.url,
        error: tg.error,
      },
    },
    tg.at,
  );

  await prisma.promoQueueItem.update({
    where: { id: row.id },
    data: {
      status: tg.ok ? "POSTED" : row.status,
      postedAt: tg.ok ? (row.postedAt ?? new Date()) : row.postedAt,
      channelResults: serializeChannelResults(merged),
    },
  });
  revalidatePath("/admin/promo");
  if (!tg.ok) return { ok: false, error: tg.error || "Telegram 게시 실패" };
  return { ok: true, detail: tg.url || "Telegram 게시됨" };
}

/** Publish up to 10 approved items to Telegram (avoids request timeouts). */
export async function publishApprovedTelegramBatchAction(): Promise<
  ActionResult & { posted?: number; failed?: number }
> {
  if (!(await assertAdmin())) return { ok: false, error: "권한이 없습니다." };
  const rows = await prisma.promoQueueItem.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ costWon: "desc" }, { approvedAt: "asc" }],
    take: 10,
  });
  if (!rows.length) return { ok: true, posted: 0, failed: 0 };

  let posted = 0;
  let failed = 0;
  for (const row of rows) {
    const tg = await publishPromoToTelegram(row.body);
    const merged = mergeChannelResults(
      row.channelResults,
      {
        telegram: {
          ok: tg.ok,
          at: tg.at,
          url: tg.url,
          error: tg.error,
        },
      },
      tg.at,
    );
    await prisma.promoQueueItem.update({
      where: { id: row.id },
      data: {
        status: tg.ok ? "POSTED" : "APPROVED",
        postedAt: tg.ok ? new Date() : null,
        channelResults: serializeChannelResults(merged),
      },
    });
    if (tg.ok) posted += 1;
    else failed += 1;
  }
  revalidatePath("/admin/promo");
  return { ok: true, posted, failed };
}
