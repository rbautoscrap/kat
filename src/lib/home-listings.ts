import { revalidatePath } from "next/cache";
import type { Listing, ListingImage, ListingCategory, Prisma } from "@prisma/client";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import { orderByIds, orderListingsNewestFirst } from "@/lib/listing-shuffle";
import { LISTING_CARD_COVER_INCLUDE } from "@/lib/listing-images";
import { prisma } from "@/lib/prisma";

export const HOME_SECTION_LIMIT = 10;

const HOME_CATEGORIES = [
  "CAR_LISTINGS",
  "CONSIGNMENT_SALE",
  "STAND_BY",
  "LIVE_AUCTION",
  "USED_PARTS",
] as const satisfies ListingCategory[];

export type HomeListing = Listing & { images: ListingImage[] };

export type HomeSections = {
  carListings: HomeListing[];
  standBy: HomeListing[];
  liveAuction: HomeListing[];
  usedParts: HomeListing[];
};

/** @deprecated Home always reads SQLite; kept so existing call sites compile. */
export function invalidateHomeListingsCache() {
  /* no process-local cache — stale cards after delete caused 404s */
}

export function revalidateListingSurfaces(listingId?: string) {
  invalidateHomeListingsCache();
  revalidatePath("/", "layout");
  revalidatePath("/listings");
  revalidatePath("/drivable-cars");
  revalidatePath("/how-to-buy");
  revalidatePath("/my-parts");
  revalidatePath("/offers");
  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/admin/statements");
  if (listingId) {
    revalidatePath(`/listings/${listingId}`);
    revalidatePath(`/listings/${listingId}/edit`);
  }
}

function pickIds(
  rows: {
    id: string;
    category: ListingCategory;
    saleStatus: string | null;
    bumpedAt: Date | null;
    createdAt: Date;
  }[],
  category: ListingCategory,
): string[] {
  const slice = rows.filter((row) => row.category === category);
  return orderListingsNewestFirst(slice).slice(0, HOME_SECTION_LIMIT);
}

export async function loadHomeListings(
  includeEndedAuctions: boolean,
): Promise<HomeSections> {
  const visibility: Prisma.ListingWhereInput = includeEndedAuctions
    ? {}
    : memberListingVisibilityWhere();

  try {
    const rows = await prisma.listing.findMany({
      where: {
        AND: [{ category: { in: [...HOME_CATEGORIES] } }, visibility],
      },
      select: {
        id: true,
        category: true,
        saleStatus: true,
        bumpedAt: true,
        createdAt: true,
      },
    });

    const standByIds = pickIds(rows, "STAND_BY");
    const carIds = orderListingsNewestFirst(
      rows.filter(
        (row) =>
          row.category === "CAR_LISTINGS" ||
          row.category === "CONSIGNMENT_SALE",
      ),
    ).slice(0, HOME_SECTION_LIMIT);
    const auctionIds = pickIds(rows, "LIVE_AUCTION");
    // Completed Used Parts leave the home board (P2P message board).
    const partsIds = pickIds(
      rows.filter((row) => row.saleStatus !== "SOLD"),
      "USED_PARTS",
    );
    const pageIds = [...standByIds, ...carIds, ...auctionIds, ...partsIds];

    const covers =
      pageIds.length === 0
        ? []
        : await prisma.listing.findMany({
            where: { id: { in: pageIds } },
            include: LISTING_CARD_COVER_INCLUDE,
          });

    return {
      standBy: orderByIds(covers, standByIds),
      carListings: orderByIds(covers, carIds),
      liveAuction: orderByIds(covers, auctionIds),
      usedParts: orderByIds(covers, partsIds),
    };
  } catch (error) {
    console.error("[HomePage] listing query failed", error);
    throw error;
  }
}
