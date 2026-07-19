import type { Prisma } from "@prisma/client";

/**
 * Public listing search — all detail fields shown on the storefront.
 * Excludes admin-only internals (cost, vehicle number, storage, etc.).
 */
export function buildPublicListingSearchWhere(
  raw?: string | null,
): Prisma.ListingWhereInput {
  const q = raw?.trim();
  if (!q) return {};

  const digits = q.replace(/\D/g, "");
  const year = Number(digits);
  const yearMatch =
    digits.length === 4 &&
    Number.isFinite(year) &&
    year >= 1980 &&
    year <= 2100
      ? [{ year }]
      : [];

  const contains = { contains: q } as const;

  return {
    OR: [
      { title: contains },
      { serialNumber: contains },
      { make: contains },
      { model: contains },
      { vin: contains },
      { highlights: contains },
      { engineMark: contains },
      { displacement: contains },
      { transmission: contains },
      { engineStatus: contains },
      { odometer: contains },
      { damages: contains },
      { damagesEn: contains },
      { fuelType: contains },
      { exteriorColor: contains },
      { registrationDate: contains },
      ...(digits
        ? [
            { vin: { contains: digits } },
            { serialNumber: { contains: digits } },
            { odometer: { contains: digits } },
          ]
        : []),
      ...yearMatch,
    ],
  };
}
