import type { Prisma } from "@prisma/client";

/** Minimum digit length before matching against VIN / S/N substrings. */
const MIN_VIN_SERIAL_DIGITS = 5;

/**
 * Public storefront search — strict identity matching.
 *
 * Short numbers like "500" only match title / make / model (e.g. Equus VS500).
 * They must NOT scan VIN / S/N / notes: those fields often contain incidental
 * digit runs and caused false hits (e.g. Spark appearing for "500" / "VS500").
 */
export function buildPublicListingSearchWhere(
  raw?: string | null,
): Prisma.ListingWhereInput {
  const q = raw?.trim();
  if (!q) return {};

  const digits = q.replace(/\D/g, "");
  const isPureNumeric = digits.length > 0 && digits === q.replace(/\s/g, "");
  const isShortNumeric =
    isPureNumeric && digits.length > 0 && digits.length < MIN_VIN_SERIAL_DIGITS;

  const year = Number(digits);
  const yearMatch =
    digits.length === 4 &&
    Number.isFinite(year) &&
    year >= 1980 &&
    year <= 2100
      ? [{ year }]
      : [];

  const contains = { contains: q } as const;

  /** Name / model code fields — safe for short numeric fragments like 500 → VS500. */
  const identity: Prisma.ListingWhereInput[] = [
    { title: contains },
    { make: contains },
    { model: contains },
  ];

  if (!isShortNumeric) {
    // Full query against VIN / S/N (e.g. "VS500", "211748", partial VIN text).
    identity.push({ vin: contains }, { serialNumber: contains });
  }

  // Digit-only VIN / S/N scan — only when long enough to be intentional.
  // Prevents "VS500" → digits "500" from matching unrelated VIN/S/N substrings.
  if (digits.length >= MIN_VIN_SERIAL_DIGITS) {
    identity.push(
      { vin: { contains: digits } },
      { serialNumber: { contains: digits } },
    );
  }

  // Notes: allow text search, but never short pure numbers (too many false hits).
  const notes: Prisma.ListingWhereInput[] = isShortNumeric
    ? []
    : [{ damages: contains }, { damagesEn: contains }];

  return {
    OR: [...identity, ...notes, ...yearMatch],
  };
}
