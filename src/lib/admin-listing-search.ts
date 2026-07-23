import type { Prisma } from "@prisma/client";
import { buildPublicListingSearchWhere } from "@/lib/listing-search";

/** Admin search — public identity/notes plus broader operational fields. */
export function buildListingSearchWhere(
  raw?: string | null,
): Prisma.ListingWhereInput {
  const q = raw?.trim();
  if (!q) return {};

  const publicWhere = buildPublicListingSearchWhere(q);
  const contains = { contains: q } as const;
  const digits = q.replace(/\D/g, "");
  const isPureNumeric = digits.length > 0 && digits === q.replace(/\s/g, "");
  /** Align with public: short digit runs are too noisy for odometer / phone substrings. */
  const isShortNumeric = isPureNumeric && digits.length > 0 && digits.length < 5;

  const detail: Prisma.ListingWhereInput[] = [
    { highlights: contains },
    { engineMark: contains },
    { displacement: contains },
    { transmission: contains },
    { engineStatus: contains },
    { fuelType: contains },
    { exteriorColor: contains },
    { registrationDate: contains },
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

  // Odometer / short cost digits only when the query is long enough to be intentional.
  if (!isShortNumeric) {
    detail.push({ odometer: contains });
    if (digits) {
      detail.push(
        { odometer: { contains: digits } },
        { vehicleNumber: { contains: digits } },
        { costPrice: { contains: digits } },
        { auctionPrice: { contains: digits } },
        { whatsappNumber: { contains: digits } },
      );
    }
  } else if (digits) {
    // Short pure numbers: still allow exact-ish admin refs (vehicle no / costs),
    // but not odometer substring traps.
    detail.push(
      { vehicleNumber: { contains: digits } },
      { costPrice: { contains: digits } },
      { auctionPrice: { contains: digits } },
    );
  }

  const publicOr = Array.isArray(publicWhere.OR) ? publicWhere.OR : [];

  return {
    OR: [...publicOr, ...detail],
  };
}
