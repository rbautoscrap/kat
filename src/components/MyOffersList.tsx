import Link from "next/link";
import type { MyOfferListingRow, MyOfferTab } from "@/lib/my-offers";

type Props = {
  rows: MyOfferListingRow[];
  tab: MyOfferTab;
  counts: { open: number; closed: number; all: number };
};

function tabHref(tab: MyOfferTab) {
  if (tab === "open") return "/offers";
  return `/offers?tab=${tab}`;
}

function statusClass(key: MyOfferListingRow["statusKey"]) {
  switch (key) {
    case "outbid":
      return "bg-red-50 text-red-700 ring-red-100";
    case "reserved":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    case "sold":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
    default:
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  }
}

export function MyOffersList({ rows, tab, counts }: Props) {
  const tabs: { id: MyOfferTab; label: string; count: number }[] = [
    { id: "open", label: "In progress", count: counts.open },
    { id: "closed", label: "Closed", count: counts.closed },
    { id: "all", label: "All", count: counts.all },
  ];

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Offer status"
      >
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={tabHref(t.id)}
              role="tab"
              aria-selected={active}
              className={`inline-flex h-9 items-center rounded-md px-3 text-[13px] font-semibold transition ${
                active
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 tabular-nums ${
                  active ? "text-neutral-300" : "text-neutral-400"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-[var(--line)] bg-white px-5 py-12 text-center">
          <p className="text-[14px] font-medium text-neutral-800">
            {tab === "closed"
              ? "No closed offers yet."
              : tab === "all"
                ? "You have not submitted any offers yet."
                : "No offers in progress."}
          </p>
          <p className="mt-1.5 text-[13px] text-neutral-500">
            Browse listings and submit a purchase offer to see them here.
          </p>
          <Link
            href="/listings?category=CAR_LISTINGS"
            className="mt-5 inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-sm border border-[var(--line)] bg-white">
          {rows.map((row) => (
            <li key={row.listingId}>
              <Link
                href={`/listings/${row.listingId}`}
                className="block px-4 py-3.5 transition hover:bg-neutral-50/80 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${statusClass(row.statusKey)}`}
                      >
                        {row.statusLabel}
                      </span>
                      <span className="text-[12px] text-neutral-400">
                        {row.categoryLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[14.5px] font-semibold tracking-tight text-neutral-900">
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-neutral-500">
                      S/N {row.serialNumber}
                      {" · "}
                      {row.offerCount} offer{row.offerCount === 1 ? "" : "s"}
                      {" · "}
                      Last {row.latestAtLabel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11.5px] font-medium uppercase tracking-wide text-neutral-400">
                      Your best
                    </p>
                    <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-neutral-900">
                      {row.bestAmountLabel}
                    </p>
                    {row.outbid && row.bucket === "open" ? (
                      <p className="mt-1 text-[12px] font-medium text-red-600">
                        Higher offer exists
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
