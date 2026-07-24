"use client";

import { formatOfferAmount } from "@/lib/purchase-offer";
import type { OfferCurrencyCode } from "@/lib/purchase-offer";
import { DeleteOfferButton } from "@/components/admin/DeleteOfferButton";

export type AdminOfferRow = {
  id: string;
  amount: string;
  currency: OfferCurrencyCode;
  createdAtLabel: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
};

type Props = {
  offers: AdminOfferRow[];
};

export function AdminPurchaseOffersPanel({ offers }: Props) {
  return (
    <section className="mb-5 rounded-sm border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-3.5 py-2.5 sm:px-4">
        <h2 className="text-[13.5px] font-medium tracking-wide text-neutral-800">
          Purchase offers ({offers.length})
        </h2>
        <p className="mt-0.5 text-[11.5px] tracking-wide text-neutral-500">
          Offer amount and contact are admin-only. Use × to remove an offer.
        </p>
      </div>
      {offers.length === 0 ? (
        <p className="px-3.5 py-4 text-[13px] tracking-wide text-neutral-500 sm:px-4">
          No purchase offers yet.
        </p>
      ) : (
        <div className="admin-table-scroll overflow-x-auto">
          <table className="data-table text-[12.5px] sm:text-[13px]">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--line)] bg-neutral-50 text-[11.5px] tracking-wide text-neutral-500">
                <th className="px-3 py-2 font-medium sm:px-4">Member</th>
                <th className="px-3 py-2 font-medium sm:px-4">Contact</th>
                <th className="px-3 py-2 font-medium sm:px-4">Offer</th>
                <th className="px-3 py-2 font-medium sm:px-4">Date</th>
                <th className="px-3 py-2 text-center font-medium sm:px-4"> </th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr
                  key={offer.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="min-w-0 px-3 py-2 tracking-wide text-neutral-700 sm:px-4">
                    <span className="block truncate font-medium text-neutral-800">
                      {offer.user.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-neutral-500">
                      {offer.user.email}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-2 tracking-wide text-neutral-700 sm:px-4">
                    {offer.user.phone ? (
                      <a
                        href={`tel:${offer.user.phone}`}
                        className="block truncate font-medium tabular-nums text-neutral-800 hover:underline"
                      >
                        {offer.user.phone}
                      </a>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium tracking-wide tabular-nums text-neutral-800 sm:px-4">
                    {formatOfferAmount(offer.amount, offer.currency)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap tracking-wide text-neutral-500 sm:px-4">
                    {offer.createdAtLabel}
                  </td>
                  <td className="px-2 py-2 text-center sm:px-3">
                    <DeleteOfferButton
                      offerId={offer.id}
                      label={formatOfferAmount(offer.amount, offer.currency)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
