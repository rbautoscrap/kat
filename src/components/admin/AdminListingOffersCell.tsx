"use client";

import { formatOfferAmount } from "@/lib/purchase-offer";
import type { OfferCurrencyCode } from "@/lib/purchase-offer";
import { DeleteOfferButton } from "@/components/admin/DeleteOfferButton";

export type ListingOfferSummary = {
  id: string;
  amount: string;
  currency: OfferCurrencyCode;
  userName: string;
};

type Props = {
  offers: ListingOfferSummary[];
};

/** Compact offer list with delete for admin listings table. */
export function AdminListingOffersCell({ offers }: Props) {
  if (offers.length === 0) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <ul className="mx-auto flex max-w-[9.5rem] flex-col items-stretch gap-0.5">
      {offers.map((offer) => (
        <li key={offer.id} className="flex items-center justify-between gap-1">
          <span
            className="min-w-0 truncate text-[11.5px] font-semibold tabular-nums text-neutral-800"
            title={`${offer.userName} · ${formatOfferAmount(offer.amount, offer.currency)}`}
          >
            {formatOfferAmount(offer.amount, offer.currency)}
          </span>
          <DeleteOfferButton
            offerId={offer.id}
            label={formatOfferAmount(offer.amount, offer.currency)}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[12px] font-semibold leading-none text-neutral-400 transition hover:text-red-600 disabled:opacity-40"
          />
        </li>
      ))}
    </ul>
  );
}
