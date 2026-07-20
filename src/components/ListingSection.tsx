import Link from "next/link";
import type { Listing, ListingImage, ListingCategory } from "@prisma/client";
import { ListingCard } from "@/components/ListingCard";
import {
  CATEGORY_LABELS,
  CATEGORY_PATHS,
  LISTING_GRID_CLASS,
} from "@/lib/listings";

type Props = {
  category: ListingCategory;
  listings: Array<Listing & { images: ListingImage[] }>;
  limit?: number;
  canViewSold?: boolean;
  canManageSaleStatus?: boolean;
};

export function ListingSection({
  category,
  listings,
  limit = 12,
  canViewSold = false,
  canManageSaleStatus = false,
}: Props) {
  const items = listings.slice(0, limit);
  if (items.length === 0) return null;

  return (
    <section className="site-container py-7 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2.5">
        <h2 className="site-heading text-[15.5px] text-neutral-900 sm:text-[16.5px]">
          {CATEGORY_LABELS[category]}
        </h2>
        <Link
          href={CATEGORY_PATHS[category]}
          className="shrink-0 text-[13.5px] font-semibold text-neutral-500 transition hover:text-neutral-800"
        >
          More
        </Link>
      </div>
      <div className={LISTING_GRID_CLASS}>
        {items.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            canViewSold={canViewSold}
            canManageSaleStatus={canManageSaleStatus}
          />
        ))}
      </div>
    </section>
  );
}
