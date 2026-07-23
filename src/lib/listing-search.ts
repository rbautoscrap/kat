import type { Prisma } from "@prisma/client";

/**
 * Public storefront search — strict identity + notes only.
 * Avoids false hits from odometer/displacement/etc. substring matches
 * (e.g. searching "500" matching "71,500 km" or "1500cc").
 */
export function buildPublicListingSearchWhere(
  raw?: string | null,
): Prisma.ListingWhereInput {
  const q = raw?.trim();
  if (!q) return {};

  const digits = q.replace(/\D/g, "");
  const isPureNumeric = digits.length > 0 && digits === q.replace(/\s/g, "");
  /** Short numbers like 500 are too ambiguous for notes / partial odometer hits. */
  const isShortNumeric = isPureNumeric && digits.length > 0 && digits.length < 4;

  const year = Number(digits);
  const yearMatch =
    digits.length === 4 &&
    Number.isFinite(year) &&
    year >= 1980 &&
    year <= 2100
      ? [{ year }]
      : [];

  const contains = { contains: q } as const;

  const identity: Prisma.ListingWhereInput[] = [
    { title: contains },
    { make: contains },
    { model: contains },
    { vin: contains },
    { serialNumber: contains },
  ];

  if (digits && digits !== q) {
    identity.push(
      { vin: { contains: digits } },
      { serialNumber: { contains: digits } },
    );
  } else if (digits && digits.length >= 4) {
    // Longer numeric queries (VIN / S/N fragments) may match digit-only fields.
    identity.push(
      { vin: { contains: digits } },
      { serialNumber: { contains: digits } },
    );
  }

  const notes: Prisma.ListingWhereInput[] = isShortNumeric
    ? []
    : [{ damages: contains }, { damagesEn: contains }];

  return {
    OR: [...identity, ...notes, ...yearMatch],
  };
}
