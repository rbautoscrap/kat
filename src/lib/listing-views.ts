import "server-only";

import { Prisma } from "@prisma/client";
import { hashClientIp } from "@/lib/purchase-offer-server";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

type RecordOpts = {
  /** Logged-in member id — counted at most once per listing */
  userId?: string | null;
  /** Listing author — own detail views are never counted */
  authorId?: string | null;
};

const recentViewKeys = new Set<string>();

/**
 * Count a listing detail view once per visitor fingerprint.
 * - Same IP → no extra count
 * - Same member account → no extra count (even from another IP)
 * - Admin / author views should be skipped by the caller (and authorId here)
 */
export async function recordListingView(
  listingId: string,
  opts: RecordOpts = {},
) {
  try {
    if (opts.userId && opts.authorId && opts.userId === opts.authorId) {
      return;
    }

    const fingerprints: string[] = [];
    if (opts.userId?.trim()) {
      fingerprints.push(`u:${opts.userId.trim()}`);
    }

    const ip = await clientIpFromHeaders();
    if (ip && ip !== "unknown") {
      fingerprints.push(hashClientIp(ip));
    }

    if (fingerprints.length === 0) return;

    const memoKey = `${listingId}:${fingerprints.join("|")}`;
    if (recentViewKeys.has(memoKey)) return;
    recentViewKeys.add(memoKey);
    if (recentViewKeys.size > 5_000) {
      recentViewKeys.clear();
    }

    const existing = await prisma.listingView.findFirst({
      where: {
        listingId,
        ipHash: { in: fingerprints },
      },
      select: { id: true },
    });
    if (existing) return;

    await prisma.listingView.createMany({
      data: fingerprints.map((ipHash) => ({ listingId, ipHash })),
    });
    await prisma.listing.update({
      where: { id: listingId },
      data: { viewCount: { increment: 1 } },
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
