import type { ListingCategory, Prisma } from "@prisma/client";

/** Shown when a guest tries to open a Live Auction listing. */
export const LIVE_AUCTION_ACCESS_MESSAGE =
  "Live Auction listings and offers are available to registered members. Please log in or register to continue.";

export const LIVE_AUCTION_ENDED_MESSAGE =
  "This live auction has ended and is no longer available.";

/** True when a Live Auction listing is past its deadline. */
export function isLiveAuctionEnded(
  listing: {
    category: ListingCategory;
    auctionEndsAt?: Date | string | null;
  },
  now: Date = new Date(),
): boolean {
  if (listing.category !== "LIVE_AUCTION") return false;
  if (!listing.auctionEndsAt) return false;
  const ends =
    listing.auctionEndsAt instanceof Date
      ? listing.auctionEndsAt
      : new Date(listing.auctionEndsAt);
  if (Number.isNaN(ends.getTime())) return false;
  return ends.getTime() <= now.getTime();
}

/**
 * Prisma filter: hide ended Live Auction listings from members.
 * Admins should omit this filter so they can still review offers.
 */
export function memberListingVisibilityWhere(
  now: Date = new Date(),
): Prisma.ListingWhereInput {
  return {
    OR: [
      { NOT: { category: "LIVE_AUCTION" } },
      { auctionEndsAt: null },
      { auctionEndsAt: { gt: now } },
    ],
  };
}

export function formatAuctionEndsAtLabel(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
