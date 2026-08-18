"use client";

import { useState } from "react";
import Link from "next/link";
import type { Listing, ListingImage } from "@prisma/client";
import { AuctionCountdown } from "@/components/AuctionCountdown";
import { ListingSaleStatusControl } from "@/components/ListingSaleStatusControl";
import { ListingThumb } from "@/components/ListingThumb";
import { LiveAuctionAccessDialog } from "@/components/LiveAuctionAccessDialog";
import { AuctionImageBadge } from "@/components/AuctionImageBadge";
import { SaleStatusOverlay } from "@/components/SaleStatusOverlay";
import {
  formatNotesDisplay,
  isPartsCategory,
  listingCardLabel,
  listingSellerName,
} from "@/lib/listings";

type Props = {
  listing: Listing & { images: ListingImage[] };
  /** Larger tiles for category listing pages */
  size?: "default" | "large";
  /** Vertical list row (Used Parts) */
  layout?: "grid" | "list";
  /** Admins may open sold listing details */
  canViewSold?: boolean;
  /** Admins can set sale status from the public listing grid */
  canManageSaleStatus?: boolean;
  /** Guests see a popup instead of opening Live Auction details. */
  isSignedIn?: boolean;
};

export function ListingCard({
  listing,
  size = "default",
  layout = "grid",
  canViewSold = false,
  canManageSaleStatus = false,
  isSignedIn = false,
}: Props) {
  const [gateOpen, setGateOpen] = useState(false);
  const thumb = listing.images[0]?.url ?? "/placeholder-car.svg";
  const label = listingCardLabel(listing);
  const large = size === "large";
  const isSold = listing.saleStatus === "SOLD";
  const isParts = isPartsCategory(listing.category);
  const sellerName = listingSellerName(listing);
  const canOpen = !isSold || canViewSold;
  const detailHref = `/listings/${listing.id}`;
  const needsLiveAuctionGate =
    listing.category === "LIVE_AUCTION" && !isSignedIn;
  const notesPreview = formatNotesDisplay(
    listing.damages,
    listing.damagesEn,
  ).trim();

  if (layout === "list") {
    const listMedia = (
      <div className="relative h-[4.75rem] w-[7rem] shrink-0 overflow-hidden rounded-[3px] bg-neutral-100 sm:h-[5.5rem] sm:w-[8.5rem]">
        <ListingThumb
          src={thumb}
          alt={listing.title}
          sizes="140px"
          className="object-cover"
        />
        <SaleStatusOverlay status={listing.saleStatus} />
        {listing.category === "LIVE_AUCTION" ? (
          <AuctionImageBadge />
        ) : null}
      </div>
    );

    const listBody = (
      <div className="min-w-0 flex-1 py-0.5">
        {sellerName ? (
          <p className="mb-0.5 truncate text-[12.5px] font-medium tracking-wide text-neutral-600">
            {sellerName}
          </p>
        ) : null}
        <p
          className={`line-clamp-2 break-words text-[14px] font-semibold leading-snug sm:text-[15px] ${
            canOpen
              ? "text-neutral-800 group-hover:text-neutral-950"
              : "text-neutral-500"
          }`}
        >
          {label}
        </p>
        {notesPreview ? (
          <p className="mt-1 line-clamp-1 text-[12.5px] tracking-wide text-neutral-500">
            {notesPreview}
          </p>
        ) : null}
        {canManageSaleStatus ? (
          <div className="mt-1.5 max-w-xs">
            <ListingSaleStatusControl
              listingId={listing.id}
              saleStatus={listing.saleStatus}
              compact
            />
          </div>
        ) : null}
      </div>
    );

    const rowClass =
      "flex w-full items-start gap-3 border-b border-[var(--line)] px-1 py-3.5 sm:gap-4 sm:px-2 sm:py-4";

    if (!canOpen) {
      return (
        <div className={`${rowClass} cursor-default`} aria-label={`${label} — Sold out`}>
          {listMedia}
          {listBody}
        </div>
      );
    }

    return (
      <Link href={detailHref} className={`group ${rowClass}`}>
        {listMedia}
        {listBody}
      </Link>
    );
  }

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
        }`}
      />
      <SaleStatusOverlay status={listing.saleStatus} />
      {listing.category === "LIVE_AUCTION" ? <AuctionImageBadge /> : null}
      {isParts ? (
        <span className="absolute right-1.5 top-1.5 rounded bg-neutral-900/75 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          Parts
        </span>
      ) : null}
    </div>
  );

  const caption = (
    <>
      <p
        className={`mt-2.5 line-clamp-2 break-words font-semibold leading-snug text-neutral-800 ${
          large
            ? "min-h-[2.9em] text-[13.5px] sm:text-[14.5px]"
            : "min-h-[2.8em] text-[13px] sm:text-[14px]"
        } ${canOpen ? "group-hover:text-neutral-950" : "text-neutral-500"}`}
      >
        {label}
      </p>
      {listing.category === "LIVE_AUCTION" && listing.auctionEndsAt ? (
        <AuctionCountdown
          endsAt={
            listing.auctionEndsAt instanceof Date
              ? listing.auctionEndsAt.toISOString()
              : String(listing.auctionEndsAt)
          }
          compact
        />
      ) : null}
    </>
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

  if (needsLiveAuctionGate) {
    return (
      <div className="block">
        <button
          type="button"
          className="group block w-full text-left"
          onClick={() => setGateOpen(true)}
          aria-label={`${label} — members only`}
        >
          {media}
          {caption}
        </button>
        {saleControl}
        <LiveAuctionAccessDialog
          open={gateOpen}
          onClose={() => setGateOpen(false)}
          callbackUrl={detailHref}
        />
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
