"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function toggleChungjuMoveRequest(listingId: string) {
  await requireAdmin();
  const id = listingId.trim();
  if (!id) {
    return { ok: false as const, error: "매물을 찾을 수 없습니다." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, chungjuMoveRequested: true },
  });
  if (!listing) {
    return { ok: false as const, error: "매물을 찾을 수 없습니다." };
  }

  await prisma.listing.update({
    where: { id },
    data: { chungjuMoveRequested: !listing.chungjuMoveRequested },
  });

  const marked = await prisma.listing.findMany({
    where: { chungjuMoveRequested: true },
    select: { id: true },
  });

  revalidatePath("/admin/inventory");
  return { ok: true as const, ids: marked.map((row) => row.id) };
}
