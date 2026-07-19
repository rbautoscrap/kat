import type { Prisma } from "@prisma/client";
import { buildPublicListingSearchWhere } from "@/lib/listing-search";

/** Admin search — public detail fields plus internal reference fields. */
export function buildListingSearchWhere(
  raw?: string | null,
): Prisma.ListingWhereInput {
  const q = raw?.trim();
  if (!q) return {};

  const publicWhere = buildPublicListingSearchWhere(q);
  const contains = { contains: q } as const;
  const digits = q.replace(/\D/g, "");

  const internal: Prisma.ListingWhereInput[] = [
    { youtubeUrl: contains },
    { whatsappNumber: contains },
    { vehicleNumber: contains },
    { storageLocation: contains },
    { inboundDate: contains },
    { auctionPrice: contains },
    { incidentalCost: contains },
    { costPrice: contains },
    { accumulatedDays: contains },
    { author: { name: contains } },
    { author: { email: contains } },
  ];

  if (digits) {
    internal.push(
      { vehicleNumber: { contains: digits } },
      { costPrice: { contains: digits } },
      { auctionPrice: { contains: digits } },
      { whatsappNumber: { contains: digits } },
    );
  }

  const publicOr = Array.isArray(publicWhere.OR) ? publicWhere.OR : [];

  return {
    OR: [...publicOr, ...internal],
  };
}
