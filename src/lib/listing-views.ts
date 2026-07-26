import "server-only";

import { Prisma } from "@prisma/client";
import { hashClientIp } from "@/lib/purchase-offer-server";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

/**
 * Count a listing detail view once per client IP.
 * Duplicate clicks from the same IP do not increment viewCount.
 */
export async function recordListingView(listingId: string) {
  try {
    const ip = await clientIpFromHeaders();
    if (!ip || ip === "unknown") return;

    const ipHash = hashClientIp(ip);

    await prisma.$transaction(async (tx) => {
      await tx.listingView.create({
        data: { listingId, ipHash },
      });
      await tx.listing.update({
        where: { id: listingId },
        data: { viewCount: { increment: 1 } },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    console.error("[listing-views] recordListingView failed", error);
  }
}
