import type { Listing, ListingImage, ListingCategory, Prisma } from "@prisma/client";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import {
  orderByIds,
  orderListingsNewestFirst,
  seededCostBiasedOrder,
  standByHomeShuffleSeed,
} from "@/lib/listing-shuffle";
import { prisma } from "@/lib/prisma";

export const HOME_SECTION_LIMIT = 10;

const HOME_CATEGORIES = [
  "CAR_LISTINGS",
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

const HOME_CACHE_MS = 20_000;

const homeCache: {
  public: { at: number; data: HomeSections } | null;
  admin: { at: number; data: HomeSections } | null;
} = { public: null, admin: null };

export function invalidateHomeListingsCache() {
  homeCache.public = null;
  homeCache.admin = null;
}

function pickIds(
  rows: {
    id: string;
    category: ListingCategory;
    saleStatus: string | null;
    bumpedAt: Date | null;
    createdAt: Date;
    costPrice: string | null;
  }[],
  category: ListingCategory,
  mode: "newest" | "cost_biased",
): string[] {
  const slice = rows.filter((row) => row.category === category);
  const ordered =
    mode === "cost_biased"
      ? seededCostBiasedOrder(slice, standByHomeShuffleSeed())
      : orderListingsNewestFirst(slice);
  return ordered.slice(0, HOME_SECTION_LIMIT);
}

export async function loadHomeListings(
  includeEndedAuctions: boolean,
): Promise<HomeSections> {
  const cacheKey = includeEndedAuctions ? "admin" : "public";
  const cached = homeCache[cacheKey];
  if (cached && Date.now() - cached.at < HOME_CACHE_MS) {
    return cached.data;
  }

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
        costPrice: true,
      },
    });

    const standByIds = pickIds(rows, "STAND_BY", "newest");
    const carIds = pickIds(rows, "CAR_LISTINGS", "cost_biased");
    const auctionIds = pickIds(rows, "LIVE_AUCTION", "newest");
    const partsIds = pickIds(rows, "USED_PARTS", "newest");
    const pageIds = [...standByIds, ...carIds, ...auctionIds, ...partsIds];

    const covers =
      pageIds.length === 0
        ? []
        : await prisma.listing.findMany({
            where: { id: { in: pageIds } },
            include: {
              images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
            },
          });

    const data: HomeSections = {
      standBy: orderByIds(covers, standByIds),
      carListings: orderByIds(covers, carIds),
      liveAuction: orderByIds(covers, auctionIds),
      usedParts: orderByIds(covers, partsIds),
    };
    homeCache[cacheKey] = { at: Date.now(), data };
    return data;
  } catch (error) {
    if (cached) {
      console.error("[HomePage] listing query failed, serving stale cache", error);
      return cached.data;
    }
    console.error("[HomePage] listing query failed", error);
    throw error;
  }
}
