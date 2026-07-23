"use client";

import Link from "next/link";
import type { Listing, ListingImage } from "@prisma/client";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { ListingThumb } from "@/components/ListingThumb";
import { SaleStatusOverlay } from "@/components/SaleStatusOverlay";

type Props = {
  listing: Listing & { images: ListingImage[] };
  /** Larger tiles for category listing pages */
  size?: "default" | "large";
  /** Admins may open sold listing details */
  canViewSold?: boolean;
  /** Admins can set sale status from the public listing grid */
  canManageSaleStatus?: boolean;
  /**
   * @deprecated Live Auction access is enforced on the detail page.
   * Kept optional so existing call sites keep compiling.
   */
  canAccessLiveAuction?: boolean;
};

export function ListingCard({
  listing,
  size = "default",
  canViewSold = false,
  canManageSaleStatus = false,
}: Props) {
  const thumb = listing.images[0]?.url ?? "/placeholder-car.svg";
  const label = `${listing.year} ${listing.make} ${listing.model}`;
  const large = size === "large";
  const isSold = listing.saleStatus === "SOLD";
  const canOpen = !isSold || canViewSold;
  const detailHref = `/listings/${listing.id}`;

  const media = (
    <div className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-neutral-100">
      <ListingThumb
        src={thumb}
        alt={listing.title}
        sizes={
          large
            ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            : "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        }
        className={`object-cover transition duration-300 ease-out ${
          canOpen ? "group-hover:scale-[1.02]" : ""
        } ${isSold ? "opacity-70 grayscale-[0.35]" : ""}`}
      />
      <SaleStatusOverlay status={listing.saleStatus} />
    </div>
  );

  const caption = (
    <p
      className={`mt-2.5 line-clamp-2 break-words font-semibold leading-snug text-neutral-800 ${
        large
          ? "min-h-[2.9em] text-[13.5px] sm:text-[14.5px]"
          : "min-h-[2.8em] text-[13px] sm:text-[14px]"
      } ${canOpen ? "group-hover:text-neutral-950" : "text-neutral-500"}`}
    >
      {label}
    </p>
  );

  const saleControl = canManageSaleStatus ? (
    <ListingSaleStatusControl
      listingId={listing.id}
      saleStatus={listing.saleStatus}
      compact
    />
  ) : null;

  if (!canOpen) {
    return (
      <div className="block cursor-default" aria-label={`${label} — Sold out`}>
        {media}
        {caption}
        {saleControl}
      </div>
    );
  }

  return (
    <div className="block">
      <Link href={detailHref} className="group block">
        {media}
        {caption}
      </Link>
      {saleControl}
    </div>
  );
}
