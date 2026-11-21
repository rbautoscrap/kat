"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { fillPromoQueue, listPromoQueue } from "@/lib/promo-queue";
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
