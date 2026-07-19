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

export const offerInputSchema = z.object({
  listingId: z.string().min(1),
  currency: z.enum(OFFER_CURRENCIES),
  amount: z
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
    }, "Amount is too large."),
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
