import { HeroBanner } from "@/components/HeroBanner";
import { ListingSection } from "@/components/ListingSection";
import { isAdmin } from "@/lib/auth";
import { HOME_SECTION_LIMIT, loadHomeListings } from "@/lib/home-listings";
import { resolveSessionDbUser } from "@/lib/listing-access";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

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
        category="STAND_BY"
        listings={standBy}
        {...sectionProps}
      />
      <ListingSection
        category="CAR_LISTINGS"
        listings={carListings}
        {...sectionProps}
      />
      <ListingSection
        category="LIVE_AUCTION"
        listings={liveAuction}
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
