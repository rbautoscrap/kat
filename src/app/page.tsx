import type { Listing, ListingImage, ListingCategory, Prisma } from "@prisma/client";
import { HeroBanner } from "@/components/HeroBanner";
import { ListingSection } from "@/components/ListingSection";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import {
  orderByIds,
  orderListingsNewestFirst,
  seededCostBiasedOrder,
  standByHomeShuffleSeed,
} from "@/lib/listing-shuffle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOME_SECTION_LIMIT = 10; // 5 per row × 2 rows
/** Fetch extra rows so reserved/sold demotion still fills the strip. */
const HOME_SECTION_FETCH = 40;

type Props = {
  searchParams: Promise<{ error?: string }>;
};

type HomeListing = Listing & { images: ListingImage[] };

const coverImageInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
};

async function loadSectionListings(
  category: ListingCategory,
  visibility: Prisma.ListingWhereInput,
  mode: "newest" | "cost_biased",
): Promise<HomeListing[]> {
  const where: Prisma.ListingWhereInput = {
    AND: [{ category }, visibility],
  };
  const candidates = await prisma.listing.findMany({
    where,
    include: coverImageInclude,
    orderBy: { createdAt: "desc" },
    take: HOME_SECTION_FETCH,
  });
  const orderedIds =
    mode === "cost_biased"
      ? seededCostBiasedOrder(candidates, standByHomeShuffleSeed())
      : orderListingsNewestFirst(candidates);
  return orderByIds(candidates, orderedIds).slice(0, HOME_SECTION_LIMIT);
}

async function loadHomeListings(includeEndedAuctions: boolean): Promise<{
  carListings: HomeListing[];
  standBy: HomeListing[];
  liveAuction: HomeListing[];
  usedParts: HomeListing[];
}> {
  const visibility: Prisma.ListingWhereInput = includeEndedAuctions
    ? {}
    : memberListingVisibilityWhere();

  try {
    const [carListings, standBy, liveAuction, usedParts] = await Promise.all([
      loadSectionListings("CAR_LISTINGS", visibility, "cost_biased"),
      loadSectionListings("STAND_BY", visibility, "newest"),
      loadSectionListings("LIVE_AUCTION", visibility, "newest"),
      loadSectionListings("USED_PARTS", visibility, "newest"),
    ]);
    return { carListings, standBy, liveAuction, usedParts };
  } catch (error) {
    console.error("[HomePage] listing query failed", error);
    return {
      carListings: [],
      standBy: [],
      liveAuction: [],
      usedParts: [],
    };
  }
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  const canViewSold = isAdmin(dbUser?.role);
  const isSignedIn = Boolean(dbUser?.id);

  const { carListings, standBy, liveAuction, usedParts } =
    await loadHomeListings(canViewSold);

  const errorMessage =
    params.error === "unauthorized"
      ? "You do not have permission to perform that action."
      : params.error === "forbidden"
        ? "Admin access only."
        : null;

  const sectionProps = {
    limit: HOME_SECTION_LIMIT,
    canViewSold,
    canManageSaleStatus: canViewSold,
    isSignedIn,
  };

  return (
    <>
      {errorMessage && (
        <div className="border-b border-red-100 bg-red-50">
          <p className="site-container py-2.5 text-[13px] tracking-wide text-red-700">
            {errorMessage}
          </p>
        </div>
      )}
      <HeroBanner />
      <ListingSection
        category="LIVE_AUCTION"
        listings={liveAuction}
        {...sectionProps}
      />
      <ListingSection
        category="CAR_LISTINGS"
        listings={carListings}
        {...sectionProps}
      />
      <ListingSection
        category="STAND_BY"
        listings={standBy}
        {...sectionProps}
      />
      <ListingSection
        category="USED_PARTS"
        listings={usedParts}
        {...sectionProps}
      />
    </>
  );
}
