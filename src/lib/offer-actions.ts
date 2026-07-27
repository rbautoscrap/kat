"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { isLiveAuctionEnded } from "@/lib/live-auction";
import { prisma } from "@/lib/prisma";
import {
  formatOfferAmount,
  meetsOfferMinimumThreshold,
  OFFER_BELOW_MIN_THRESHOLD_MESSAGE,
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
  | {
      ok: false;
      error: string;
      code?: "BELOW_MIN_THRESHOLD" | "ALREADY_EXISTS";
    };

function revalidateOfferPaths(listingId: string) {
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/offers");
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
}

async function loadListingOfferAmounts(
  listingId: string,
  excludeOfferId?: string,
) {
  return prisma.purchaseOffer.findMany({
    where: {
      listingId,
      ...(excludeOfferId ? { NOT: { id: excludeOfferId } } : {}),
    },
    select: { amount: true, currency: true },
  });
}

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

    const dbUser = await resolveSessionDbUser();
    if (!dbUser) {
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
    const userId = dbUser.id;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        saleStatus: true,
        category: true,
        auctionEndsAt: true,
      },
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
    if (isLiveAuctionEnded(listing)) {
      return {
        ok: false,
        error: "This live auction has ended and is no longer accepting offers.",
      };
    }

    const existingOwn = await prisma.purchaseOffer.findFirst({
      where: { listingId, userId },
      select: { id: true },
    });
    if (existingOwn) {
      return {
        ok: false,
        code: "ALREADY_EXISTS",
        error:
          "You already have an offer for this listing. Please edit it instead.",
      };
    }

    const existingOffers = await loadListingOfferAmounts(listingId);
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
        code: "BELOW_MIN_THRESHOLD",
        error: OFFER_BELOW_MIN_THRESHOLD_MESSAGE,
      };
    }

    const ip = await resolveClientIp();
    const ipHash = hashClientIp(ip);
    const deviceId = await resolveOfferDeviceId();

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
      prisma.listing.update({
        where: { id: listingId },
        data: { updatedAt: new Date() },
      }),
    ]);

    revalidateOfferPaths(listingId);

    return {
      ok: true,
      amountLabel: formatOfferAmount(amount, currency),
      currency,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        code: "ALREADY_EXISTS",
        error:
          "You already have an offer for this listing. Please edit it instead.",
      };
    }
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
  | { ok: false; error: string; code?: "BELOW_MIN_THRESHOLD" };

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

    const dbUser = await resolveSessionDbUser();
    if (!dbUser) {
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
    const userId = dbUser.id;

    const offer = await prisma.purchaseOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        userId: true,
        listingId: true,
        listing: {
          select: {
            saleStatus: true,
            category: true,
            auctionEndsAt: true,
          },
        },
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
    if (isLiveAuctionEnded(offer.listing)) {
      return {
        ok: false,
        error: "This live auction has ended and offers can no longer be changed.",
      };
    }

    const otherOffers = await loadListingOfferAmounts(
      offer.listingId,
      offer.id,
    );
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
        code: "BELOW_MIN_THRESHOLD",
        error: OFFER_BELOW_MIN_THRESHOLD_MESSAGE,
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

    revalidateOfferPaths(offer.listingId);

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

    revalidateOfferPaths(offer.listingId);
    return { ok: true };
  } catch (error) {
    console.error("deletePurchaseOffer failed:", error);
    return { ok: false, error: "삭제에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
