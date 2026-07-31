import "server-only";

import type { ListingSaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listingCardLabel, listingSellerName } from "@/lib/listings";

export type MyPartsTab = "available" | "reserved" | "sold" | "all";

export type MyPartsRow = {
  id: string;
  title: string;
  sellerName: string | null;
  contact: string;
  saleStatus: ListingSaleStatus;
  thumbUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export function parseMyPartsTab(value?: string): MyPartsTab {
  if (
    value === "available" ||
    value === "reserved" ||
    value === "sold" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

export async function loadMyPartsListings(
  authorId: string,
): Promise<MyPartsRow[]> {
  const listings = await prisma.listing.findMany({
    where: {
      authorId,
      category: "USED_PARTS",
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return listings.map((listing) => ({
    id: listing.id,
    title: listingCardLabel(listing),
    sellerName: listingSellerName(listing),
    contact: listing.whatsappNumber.trim(),
    saleStatus: listing.saleStatus,
    thumbUrl: listing.images[0]?.url ?? "/placeholder-car.svg",
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  }));
}
