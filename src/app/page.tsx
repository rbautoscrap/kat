import type { Listing, ListingImage, Prisma } from "@prisma/client";
import { HeroBanner } from "@/components/HeroBanner";
import { ListingSection } from "@/components/ListingSection";
import { isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { memberListingVisibilityWhere } from "@/lib/live-auction";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOME_SECTION_LIMIT = 10; // 5 per row × 2 rows

type Props = {
  searchParams: Promise<{ error?: string }>;
};

type HomeListing = Listing & { images: ListingImage[] };

const coverImageInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
};

async function loadHomeListings(
  includeEndedAuctions: boolean,
): Promise<[HomeListing[], HomeListing[], HomeListing[], HomeListing[]]> {
  const visibility: Prisma.ListingWhereInput = includeEndedAuctions
    ? {}
    : memberListingVisibilityWhere();

  try {
    return await Promise.all([
      prisma.listing.findMany({
        where: { AND: [{ category: "HOT_DEALS" }, visibility] },
        include: coverImageInclude,
        orderBy: { createdAt: "desc" },
        take: HOME_SECTION_LIMIT,
      }),
      prisma.listing.findMany({
        where: { AND: [{ category: "CAR_LISTINGS" }, visibility] },
        include: coverImageInclude,
        orderBy: { createdAt: "desc" },
        take: HOME_SECTION_LIMIT,
      }),
      prisma.listing.findMany({
        where: { AND: [{ category: "STAND_BY" }, visibility] },
        include: coverImageInclude,
        orderBy: { createdAt: "desc" },
        take: HOME_SECTION_LIMIT,
      }),
      prisma.listing.findMany({
        where: { AND: [{ category: "LIVE_AUCTION" }, visibility] },
        include: coverImageInclude,
        orderBy: { createdAt: "desc" },
        take: HOME_SECTION_LIMIT,
      }),
    ]);
  } catch (error) {
    console.error("[HomePage] listing query failed", error);
    return [[], [], [], []];
  }
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const dbUser = await resolveSessionDbUser();
  const canViewSold = isAdmin(dbUser?.role);
  const isSignedIn = Boolean(dbUser?.id);

  const [hotDeals, carListings, standBy, liveAuction] = await loadHomeListings(
    canViewSold,
  );

  const errorMessage =
    params.error === "unauthorized"
      ? "You do not have permission to perform that action."
      : params.error === "forbidden"
        ? "Admin access only."
        : null;

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
        category="HOT_DEALS"
        listings={hotDeals}
        limit={HOME_SECTION_LIMIT}
        canViewSold={canViewSold}
        canManageSaleStatus={canViewSold}
        isSignedIn={isSignedIn}
      />
      <ListingSection
        category="CAR_LISTINGS"
        listings={carListings}
        limit={HOME_SECTION_LIMIT}
        canViewSold={canViewSold}
        canManageSaleStatus={canViewSold}
        isSignedIn={isSignedIn}
      />
      <ListingSection
        category="STAND_BY"
        listings={standBy}
        limit={HOME_SECTION_LIMIT}
        canViewSold={canViewSold}
        canManageSaleStatus={canViewSold}
        isSignedIn={isSignedIn}
      />
      <ListingSection
        category="LIVE_AUCTION"
        listings={liveAuction}
        limit={HOME_SECTION_LIMIT}
        canViewSold={canViewSold}
        canManageSaleStatus={canViewSold}
        isSignedIn={isSignedIn}
      />
    </>
  );
}
