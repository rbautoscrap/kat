"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPurchaseOffer } from "@/lib/offer-actions";
import {
  CURRENCY_META,
  MAX_OFFERS_PER_LISTING,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";

type OwnOffer = {
  amount: string;
  currency: OfferCurrencyCode;
  createdAt: string;
};

type Props = {
  listingId: string;
  /** Member's own offers for this listing (newest first). */
  ownOffers?: OwnOffer[];
};

/** Display order: KRW first (default). */
const CURRENCY_OPTIONS: OfferCurrencyCode[] = ["KRW", "USD", "EUR"];

function formatPreview(amount: string, currency: OfferCurrencyCode) {
  const cleaned = amount.replace(/,/g, "").trim();
  if (!cleaned || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  const locale =
    currency === "KRW" ? "ko-KR" : currency === "EUR" ? "de-DE" : "en-US";
  return `${CURRENCY_META[currency].symbol}${n.toLocaleString(locale, {
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  })}`;
}

/** Thousand separators while typing (keeps optional decimals for USD/EUR). */
function formatAmountInput(raw: string, currency: OfferCurrencyCode) {
  const cleaned = raw.replace(/,/g, "");
  if (!cleaned) return "";

  if (currency === "KRW") {
    const digits = cleaned.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("en-US");
  }

  const parts = cleaned.replace(/[^\d.]/g, "").split(".");
  if (parts.length > 2) return null;
  const intDigits = parts[0] ?? "";
  const intFormatted = intDigits
    ? Number(intDigits).toLocaleString("en-US")
    : "";
  if (parts.length === 1) return intFormatted;
  const decimals = (parts[1] ?? "").slice(0, 2);
  if (cleaned.endsWith(".") && decimals === "") {
    return `${intFormatted}.`;
  }
  return `${intFormatted}.${decimals}`;
}

export function PurchaseOfferPanel({ listingId, ownOffers = [] }: Props) {
  const router = useRouter();
  const submitted = ownOffers.length;
  const remaining = Math.max(0, MAX_OFFERS_PER_LISTING - submitted);
  const canSubmit = remaining > 0;

  const [currency, setCurrency] = useState<OfferCurrencyCode>("KRW");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = formatPreview(amount, currency);

  return (
    <section className="rounded-sm border border-[var(--line)] bg-white px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="site-heading text-[14px] text-neutral-800">
            Purchase offer
          </h2>
          <p className="mt-0.5 text-[12px] tracking-wide text-neutral-400">
            Up to {MAX_OFFERS_PER_LISTING} offers per listing
            {submitted > 0
              ? ` · ${submitted}/${MAX_OFFERS_PER_LISTING} used`
              : ""}
          </p>
        </div>
        {success ? (
          <p className="text-[12.5px] tracking-wide text-emerald-700">
            Submitted {success}
            {remaining > 0 ? ` · ${remaining} left` : ""}
          </p>
        ) : null}
      </div>

      {ownOffers.length > 0 ? (
        <ul className="mb-3 space-y-1 border-b border-[var(--line)] pb-3">
          {ownOffers.map((offer, index) => (
            <li
              key={`${offer.createdAt}-${index}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] tracking-wide"
            >
              <span className="font-medium tabular-nums text-neutral-800">
                {formatPreview(offer.amount, offer.currency) ?? offer.amount}
              </span>
              <span className="text-[12px] text-neutral-400">
                {offer.createdAt}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!canSubmit ? (
        <p className="text-[13px] tracking-wide text-neutral-500">
          You have used all {MAX_OFFERS_PER_LISTING} offers for this listing.
          Amounts are visible only to you and the administrator.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            startTransition(async () => {
              const result = await submitPurchaseOffer({
                listingId,
                currency,
                amount,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setSuccess(result.amountLabel);
              setAmount("");
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
            <div className="shrink-0">
              <p className="mb-1.5 text-[11px] font-medium tracking-[0.06em] text-neutral-500 uppercase">
                Currency
              </p>
              <div
                className="inline-flex h-11 items-center rounded-md border border-neutral-300 bg-neutral-50 p-0.5"
                role="radiogroup"
                aria-label="Currency"
              >
                {CURRENCY_OPTIONS.map((code) => {
                  const meta = CURRENCY_META[code];
                  const selected = currency === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={pending}
                      onClick={() => {
                        setCurrency(code);
                        setAmount(
                          (prev) => formatAmountInput(prev, code) ?? "",
                        );
                      }}
                      className={`min-w-[3.5rem] rounded-[5px] px-2.5 py-2 text-[12.5px] font-medium tracking-wide transition ${
                        selected
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-white hover:text-neutral-900"
                      } disabled:opacity-60`}
                    >
                      {meta.symbol} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full max-w-[17.5rem] shrink-0">
              <label
                htmlFor="offer-amount"
                className="mb-1.5 block text-[11px] font-medium tracking-[0.06em] text-neutral-500 uppercase"
              >
                Amount
              </label>
              <div className="flex h-11 overflow-hidden rounded-md border-2 border-neutral-800 bg-neutral-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-800/15">
                <span className="flex w-10 shrink-0 items-center justify-center border-r border-neutral-300 text-[16px] font-semibold text-neutral-800">
                  {CURRENCY_META[currency].symbol}
                </span>
                <input
                  id="offer-amount"
                  name="amount"
                  inputMode={currency === "KRW" ? "numeric" : "decimal"}
                  autoComplete="off"
                  aria-label="Desired amount"
                  placeholder={currency === "KRW" ? "100,000" : "12,000"}
                  value={amount}
                  disabled={pending}
                  onChange={(e) => {
                    const formatted = formatAmountInput(
                      e.target.value,
                      currency,
                    );
                    if (formatted === null) return;
                    setAmount(formatted);
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-[17px] font-semibold tabular-nums tracking-wide text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400 disabled:opacity-60"
                />
              </div>
              {preview ? (
                <p className="mt-1.5 text-[12px] tracking-wide text-neutral-500">
                  Your offer ·{" "}
                  <span className="font-medium tabular-nums text-neutral-800">
                    {preview}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] tracking-wide text-neutral-400">
                  Enter your purchase offer amount
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending || !amount.trim()}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-md bg-neutral-900 px-5 text-[13.5px] font-medium tracking-wide text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-white sm:mt-[1.625rem] sm:w-auto"
            >
              {pending ? "…" : "Submit"}
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-2.5 text-[12.5px] leading-relaxed tracking-wide text-red-600"
            >
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
