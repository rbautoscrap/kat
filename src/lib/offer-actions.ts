"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatOfferAmount,
  MAX_OFFERS_PER_LISTING,
  offerInputSchema,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";
import {
  hashClientIp,
  resolveClientIp,
  resolveOfferDeviceId,
} from "@/lib/purchase-offer-server";

export type SubmitOfferResult =
  | {
      ok: true;
      amountLabel: string;
      currency: OfferCurrencyCode;
      remaining: number;
    }
  | { ok: false; error: string };

export async function submitPurchaseOffer(input: {
  listingId: string;
  currency: string;
  amount: string;
}): Promise<SubmitOfferResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Please sign in to submit an offer." };
    }

    const parsed = offerInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid offer.",
      };
    }

    const { listingId, currency, amount } = parsed.data;
    const userId = session.user.id;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, saleStatus: true },
    });
    if (!listing) {
      return { ok: false, error: "This listing is no longer available." };
    }
    if (listing.saleStatus === "SOLD") {
      return {
        ok: false,
        error: "This vehicle has been sold and is no longer accepting offers.",
      };
    }

    const ip = await resolveClientIp();
    const ipHash = hashClientIp(ip);
    const deviceId = await resolveOfferDeviceId();

    const ipKnown = ip !== "unknown";
    const [userCount, deviceCount, ipCount] = await Promise.all([
      prisma.purchaseOffer.count({ where: { listingId, userId } }),
      prisma.purchaseOffer.count({ where: { listingId, deviceId } }),
      ipKnown
        ? prisma.purchaseOffer.count({ where: { listingId, ipHash } })
        : Promise.resolve(0),
    ]);

    if (userCount >= MAX_OFFERS_PER_LISTING) {
      return {
        ok: false,
        error: `You can submit up to ${MAX_OFFERS_PER_LISTING} offers for this listing.`,
      };
    }

    if (deviceCount >= MAX_OFFERS_PER_LISTING) {
      return {
        ok: false,
        error: `Up to ${MAX_OFFERS_PER_LISTING} offers are allowed from this device for this listing.`,
      };
    }

    if (ipKnown && ipCount >= MAX_OFFERS_PER_LISTING) {
      return {
        ok: false,
        error: `Up to ${MAX_OFFERS_PER_LISTING} offers are allowed from this network for this listing.`,
      };
    }

    await prisma.$transaction([
      prisma.purchaseOffer.create({
        data: {
          listingId,
          userId,
          amount,
          currency,
          ipHash,
          deviceId,
        },
      }),
      // Bump listing so admin list can surface recent offers at the top
      prisma.listing.update({
        where: { id: listingId },
        data: { updatedAt: new Date() },
      }),
    ]);

    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/admin");
    revalidatePath("/admin/listings");

    const remaining = MAX_OFFERS_PER_LISTING - userCount - 1;

    return {
      ok: true,
      amountLabel: formatOfferAmount(amount, currency),
      currency,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error("submitPurchaseOffer failed:", error);
    return {
      ok: false,
      error: "Something went wrong. Please try again in a moment.",
    };
  }
}
