"use server";

import { revalidatePath } from "next/cache";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { prisma } from "@/lib/prisma";
import {
  formatOfferAmount,
  meetsOfferMinimumThreshold,
  OFFER_BELOW_HIGHEST_MESSAGE,
  offerInputSchema,
  updateOfferInputSchema,
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
    }
  | { ok: false; error: string; code?: "BELOW_HIGHEST" };

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

    const existingOwnCount = await prisma.purchaseOffer.count({
      where: { listingId, userId },
    });
    if (existingOwnCount > 0) {
      return {
        ok: false,
        error: "You already have an offer for this listing. Please edit it instead.",
      };
    }

    const ip = await resolveClientIp();
    const ipHash = hashClientIp(ip);
    const deviceId = await resolveOfferDeviceId();

    const existingOffers = await prisma.purchaseOffer.findMany({
      where: { listingId },
      select: { amount: true, currency: true },
      take: 200,
    });
    if (
      !meetsOfferMinimumThreshold(
        amount,
        currency,
        existingOffers.map((o) => ({
          amount: o.amount,
          currency: o.currency as OfferCurrencyCode,
        })),
      )
    ) {
      return {
        ok: false,
        code: "BELOW_HIGHEST",
        error: OFFER_BELOW_HIGHEST_MESSAGE,
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
    revalidatePath("/offers");
    revalidatePath("/admin");
    revalidatePath("/admin/listings");

    return {
      ok: true,
      amountLabel: formatOfferAmount(amount, currency),
      currency,
    };
  } catch (error) {
    console.error("submitPurchaseOffer failed:", error);
    return {
      ok: false,
      error: "Something went wrong. Please try again in a moment.",
    };
  }
}

export type UpdateOfferResult =
  | {
      ok: true;
      amountLabel: string;
      currency: OfferCurrencyCode;
    }
  | { ok: false; error: string; code?: "BELOW_HIGHEST" };

/** Member: update amount/currency on their own offer. */
export async function updatePurchaseOffer(input: {
  offerId: string;
  currency: string;
  amount: string;
}): Promise<UpdateOfferResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "Please sign in to update your offer." };
    }

    const parsed = updateOfferInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid offer.",
      };
    }

    const { offerId, currency, amount } = parsed.data;
    const userId = session.user.id;

    const offer = await prisma.purchaseOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        userId: true,
        listingId: true,
        listing: { select: { saleStatus: true } },
      },
    });
    if (!offer || offer.userId !== userId) {
      return { ok: false, error: "Offer not found." };
    }
    if (offer.listing.saleStatus === "SOLD") {
      return {
        ok: false,
        error: "This vehicle has been sold and offers can no longer be changed.",
      };
    }

    const otherOffers = await prisma.purchaseOffer.findMany({
      where: { listingId: offer.listingId, NOT: { id: offer.id } },
      select: { amount: true, currency: true },
      take: 200,
    });
    if (
      !meetsOfferMinimumThreshold(
        amount,
        currency,
        otherOffers.map((o) => ({
          amount: o.amount,
          currency: o.currency as OfferCurrencyCode,
        })),
      )
    ) {
      return {
        ok: false,
        code: "BELOW_HIGHEST",
        error: OFFER_BELOW_HIGHEST_MESSAGE,
      };
    }

    await prisma.$transaction([
      prisma.purchaseOffer.update({
        where: { id: offer.id },
        data: { amount, currency },
      }),
      prisma.listing.update({
        where: { id: offer.listingId },
        data: { updatedAt: new Date() },
      }),
    ]);

    revalidatePath(`/listings/${offer.listingId}`);
    revalidatePath("/offers");
    revalidatePath("/admin");
    revalidatePath("/admin/listings");

    return {
      ok: true,
      amountLabel: formatOfferAmount(amount, currency),
      currency,
    };
  } catch (error) {
    console.error("updatePurchaseOffer failed:", error);
    return {
      ok: false,
      error: "Something went wrong. Please try again in a moment.",
    };
  }
}

export type DeleteOfferResult = { ok: true } | { ok: false; error: string };

/** Admin-only: remove a member purchase offer. */
export async function deletePurchaseOffer(
  offerId: string,
): Promise<DeleteOfferResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ok: false, error: "권한이 없습니다." };
    }

    const dbUser = await resolveSessionDbUser();
    if (!dbUser || !isAdmin(dbUser.role)) {
      return { ok: false, error: "권한이 없습니다." };
    }

    const id = offerId.trim();
    if (!id) return { ok: false, error: "오퍼를 찾을 수 없습니다." };

    const offer = await prisma.purchaseOffer.findUnique({
      where: { id },
      select: { id: true, listingId: true },
    });
    if (!offer) return { ok: false, error: "오퍼를 찾을 수 없습니다." };

    await prisma.purchaseOffer.delete({ where: { id: offer.id } });

    revalidatePath(`/listings/${offer.listingId}`);
    revalidatePath("/offers");
    revalidatePath("/admin");
    revalidatePath("/admin/listings");
    return { ok: true };
  } catch (error) {
    console.error("deletePurchaseOffer failed:", error);
    return { ok: false, error: "삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
