import { z } from "zod";

export const OFFER_DEVICE_COOKIE = "kat_offer_device";

/** Max suggested-price submissions per member / device / network per listing. */
export const MAX_OFFERS_PER_LISTING = 3;

export const OFFER_CURRENCIES = ["USD", "KRW", "EUR"] as const;
export type OfferCurrencyCode = (typeof OFFER_CURRENCIES)[number];

export const CURRENCY_META: Record<
  OfferCurrencyCode,
  { label: string; symbol: string; hint: string }
> = {
  USD: { label: "USD", symbol: "$", hint: "US Dollar" },
  KRW: { label: "KRW", symbol: "₩", hint: "Korean Won" },
  EUR: { label: "EUR", symbol: "€", hint: "Euro" },
};

const offerAmountField = z
  .string()
  .trim()
  .min(1, "Please enter an amount.")
  .transform((v) => v.replace(/,/g, "").replace(/\s/g, ""))
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Enter a valid amount (up to 2 decimal places).",
  })
  .refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, "Amount must be greater than 0.")
  .refine((v) => {
    const n = Number(v);
    return n <= 1_000_000_000_000;
  }, "Amount is too large.");

export const offerInputSchema = z.object({
  listingId: z.string().min(1),
  currency: z.enum(OFFER_CURRENCIES),
  amount: offerAmountField,
});

export const updateOfferInputSchema = z.object({
  offerId: z.string().min(1),
  currency: z.enum(OFFER_CURRENCIES),
  amount: offerAmountField,
});

export function formatOfferAmount(amount: string, currency: OfferCurrencyCode) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${CURRENCY_META[currency].symbol}${amount}`;
  const locale =
    currency === "KRW" ? "ko-KR" : currency === "EUR" ? "de-DE" : "en-US";
  const formatted = n.toLocaleString(locale, {
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
    minimumFractionDigits: 0,
  });
  return `${CURRENCY_META[currency].symbol}${formatted}`;
}

export function parseOfferAmount(amount: string): number {
  const n = Number(String(amount).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rough KRW equivalent for ranking offers across currencies.
 * Not a live FX quote — only used to detect "someone bid higher".
 */
const APPROX_TO_KRW: Record<OfferCurrencyCode, number> = {
  KRW: 1,
  USD: 1350,
  EUR: 1450,
};

export function offerToComparableKrw(
  amount: string,
  currency: OfferCurrencyCode,
): number {
  return parseOfferAmount(amount) * APPROX_TO_KRW[currency];
}

/** True when another member has a strictly higher offer than this member's best. */
export function isMemberOutbidByOthers(
  memberId: string,
  ownOffers: { amount: string; currency: OfferCurrencyCode }[],
  allOffers: {
    userId: string;
    amount: string;
    currency: OfferCurrencyCode;
  }[],
): boolean {
  if (!memberId || ownOffers.length === 0) return false;

  const ownBest = Math.max(
    0,
    ...ownOffers.map((o) => offerToComparableKrw(o.amount, o.currency)),
  );
  if (ownBest <= 0) return false;

  let othersBest = 0;
  for (const o of allOffers) {
    if (o.userId === memberId) continue;
    othersBest = Math.max(
      othersBest,
      offerToComparableKrw(o.amount, o.currency),
    );
  }
  return othersBest > ownBest;
}

/** Highest comparable KRW among offers on a listing (0 when none). */
export function highestOfferComparableKrw(
  offers: { amount: string; currency: OfferCurrencyCode }[],
): number {
  if (offers.length === 0) return 0;
  return Math.max(
    0,
    ...offers.map((o) => offerToComparableKrw(o.amount, o.currency)),
  );
}

/**
 * True when the candidate beats every existing offer on the listing
 * (cross-currency via approximate KRW ranking).
 */
export function isOfferAboveCurrentHighest(
  amount: string,
  currency: OfferCurrencyCode,
  existing: { amount: string; currency: OfferCurrencyCode }[],
): boolean {
  const highest = highestOfferComparableKrw(existing);
  if (highest <= 0) return true;
  return offerToComparableKrw(amount, currency) > highest;
}

/** Shown when submit is blocked because a higher offer already exists. */
export const OFFER_BELOW_HIGHEST_MESSAGE =
  "이미 더 높은 Offer 금액이 있습니다. 더 높은 금액을 입력해 주세요.";
