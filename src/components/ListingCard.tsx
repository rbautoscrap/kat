import Link from "next/link";
import type { Listing, ListingImage } from "@prisma/client";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { ListingThumb } from "@/components/ListingThumb";
import { SaleStatusOverlay } from "@/components/SaleStatusOverlay";

type Props = {
  listing: Listing & { images: ListingImage[] };
  /** Larger tiles for category listing pages (5-col grid) */
  size?: "default" | "large";
  /** Admins may open sold listing details */
  canViewSold?: boolean;
  /** Admins can set sale status from the public listing grid */
  canManageSaleStatus?: boolean;
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

  const media = (
    <div
      className={`relative overflow-hidden rounded-[2px] bg-neutral-100 ${
        large ? "aspect-[3/2]" : "aspect-[4/3]"
      }`}
    >
      <ListingThumb
        src={thumb}
        alt={listing.title}
        sizes={
          large
            ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            : "(max-width: 640px) 50vw, 16vw"
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
      className={`mt-2 line-clamp-2 break-words text-[12.5px] font-medium leading-snug tracking-wide text-neutral-700 ${
        large ? "min-h-[2.75em] sm:text-[13px]" : "min-h-[2.6em]"
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
      <Link href={`/listings/${listing.id}`} className="group block">
        {media}
        {caption}
      </Link>
      {saleControl}
    </div>
  );
}
