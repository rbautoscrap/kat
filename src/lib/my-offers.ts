import "server-only";

import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatOfferAmount,
  isMemberOutbidByOthers,
  offerToComparableKrw,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";
import { CATEGORY_LABELS, SALE_STATUS_LABELS } from "@/lib/listings";

export type MyOfferTab = "open" | "closed" | "all";

export type MyOfferListingRow = {
  listingId: string;
  title: string;
  category: ListingCategory;
  categoryLabel: string;
  saleStatus: ListingSaleStatus;
  saleStatusLabel: string;
  serialNumber: string;
  /** Highest own offer (display). */
  bestAmountLabel: string;
  bestCurrency: OfferCurrencyCode;
  /** Most recent own offer time (ISO date YYYY-MM-DD HH:mm). */
  latestAtLabel: string;
  offerCount: number;
  /** open = AVAILABLE/RESERVED, closed = SOLD */
  bucket: "open" | "closed";
  /** True when another member has a higher offer (open listings only). */
  outbid: boolean;
  /** Short status for badges */
  statusKey: "open" | "reserved" | "outbid" | "sold";
  statusLabel: string;
};

export function parseMyOfferTab(
  value: string | null | undefined,
): MyOfferTab {
  if (value === "closed" || value === "all" || value === "open") return value;
  return "open";
}

function formatOfferTime(date: Date) {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function statusForRow(
  saleStatus: ListingSaleStatus,
  outbid: boolean,
): Pick<MyOfferListingRow, "statusKey" | "statusLabel" | "bucket"> {
  if (saleStatus === "SOLD") {
    return {
      bucket: "closed",
      statusKey: "sold",
      statusLabel: "Closed · Sold",
    };
  }
  if (saleStatus === "RESERVED") {
    return {
      bucket: "open",
      statusKey: "reserved",
      statusLabel: "In progress · Reserved",
    };
  }
  if (outbid) {
    return {
      bucket: "open",
      statusKey: "outbid",
      statusLabel: "In progress · Outbid",
    };
  }
  return {
    bucket: "open",
    statusKey: "open",
    statusLabel: "In progress · Open",
  };
}

/**
 * Load the signed-in member's offers, grouped by listing (newest activity first).
 * Amounts of other members are never exposed — only an outbid flag.
 */
export async function loadMyOfferListings(
  userId: string,
): Promise<MyOfferListingRow[]> {
  const offers = await prisma.purchaseOffer.findMany({
    where: { userId },
    select: {
      amount: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
      listing: {
        select: {
          id: true,
          title: true,
          category: true,
          saleStatus: true,
          serialNumber: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  type Group = {
    listing: (typeof offers)[number]["listing"];
    offers: {
      amount: string;
      currency: OfferCurrencyCode;
      activityAt: Date;
    }[];
  };

  const groups = new Map<string, Group>();
  for (const row of offers) {
    const existing = groups.get(row.listing.id);
    const entry = {
      amount: row.amount,
      currency: row.currency as OfferCurrencyCode,
      activityAt: row.updatedAt ?? row.createdAt,
    };
    if (existing) {
      existing.offers.push(entry);
    } else {
      groups.set(row.listing.id, {
        listing: row.listing,
        offers: [entry],
      });
    }
  }

  const openListingIds = [...groups.values()]
    .filter((g) => g.listing.saleStatus !== "SOLD")
    .map((g) => g.listing.id);

  const rivalByListing = new Map<
    string,
    { userId: string; amount: string; currency: OfferCurrencyCode }[]
  >();

  if (openListingIds.length > 0) {
    const rivals = await prisma.purchaseOffer.findMany({
      where: { listingId: { in: openListingIds } },
      select: {
        listingId: true,
        userId: true,
        amount: true,
        currency: true,
      },
    });
    for (const r of rivals) {
      const list = rivalByListing.get(r.listingId) ?? [];
      list.push({
        userId: r.userId,
        amount: r.amount,
        currency: r.currency as OfferCurrencyCode,
      });
      rivalByListing.set(r.listingId, list);
    }
  }

  const rows: MyOfferListingRow[] = [];

  for (const group of groups.values()) {
    const own = group.offers;
    const best = own.reduce((a, b) =>
      offerToComparableKrw(b.amount, b.currency) >
      offerToComparableKrw(a.amount, a.currency)
        ? b
        : a,
    );
    const latest = own.reduce((a, b) =>
      b.activityAt.getTime() > a.activityAt.getTime() ? b : a,
    );

    const outbid =
      group.listing.saleStatus !== "SOLD" &&
      isMemberOutbidByOthers(
        userId,
        own,
        rivalByListing.get(group.listing.id) ?? [],
      );

    const status = statusForRow(group.listing.saleStatus, outbid);

    rows.push({
      listingId: group.listing.id,
      title: group.listing.title,
      category: group.listing.category,
      categoryLabel: CATEGORY_LABELS[group.listing.category],
      saleStatus: group.listing.saleStatus,
      saleStatusLabel: SALE_STATUS_LABELS[group.listing.saleStatus],
      serialNumber: group.listing.serialNumber,
      bestAmountLabel: formatOfferAmount(best.amount, best.currency),
      bestCurrency: best.currency,
      latestAtLabel: formatOfferTime(latest.activityAt),
      offerCount: own.length,
      outbid,
      ...status,
    });
  }

  // Newest activity first (latest offer time)
  rows.sort((a, b) => b.latestAtLabel.localeCompare(a.latestAtLabel));
  return rows;
}
