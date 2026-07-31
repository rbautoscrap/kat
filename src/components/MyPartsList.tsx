import Link from "next/link";
import type { ListingSaleStatus } from "@prisma/client";
import { ListingThumb } from "@/components/ListingThumb";
import { SALE_STATUS_LABELS } from "@/lib/listings";
import type { MyPartsRow, MyPartsTab } from "@/lib/my-parts";
function formatListedDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

type Props = {
  rows: MyPartsRow[];
  tab: MyPartsTab;
  counts: {
    available: number;
    reserved: number;
    sold: number;
    all: number;
  };
};

function tabHref(tab: MyPartsTab) {
  if (tab === "all") return "/my-parts";
  return `/my-parts?tab=${tab}`;
}

function statusClass(status: ListingSaleStatus) {
  switch (status) {
    case "RESERVED":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    case "SOLD":
      return "bg-neutral-100 text-neutral-600 ring-neutral-200";
    default:
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  }
}

export function MyPartsList({ rows, tab, counts }: Props) {
  const tabs: { id: MyPartsTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "available", label: "Available", count: counts.available },
    { id: "reserved", label: "Reserved", count: counts.reserved },
    { id: "sold", label: "Sold", count: counts.sold },
  ];

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Part listing status"
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
            {tab === "available"
              ? "No available parts yet."
              : tab === "reserved"
                ? "No reserved parts yet."
                : tab === "sold"
                  ? "No sold parts yet."
                  : "You have not listed any used parts yet."}
          </p>
          <p className="mt-1.5 text-[13px] text-neutral-500">
            List a part to track it here.
          </p>
          <Link
            href="/listings/new?category=USED_PARTS"
            className="mt-5 inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-[13px] font-semibold text-white transition hover:bg-neutral-800"
          >
            + List a part
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-sm border border-[var(--line)] bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-start gap-3 px-3 py-3.5 sm:gap-4 sm:px-5">
                <Link
                  href={`/listings/${row.id}`}
                  className="relative h-[4.5rem] w-[6.5rem] shrink-0 overflow-hidden rounded-[3px] bg-neutral-100 sm:h-[5rem] sm:w-[7.5rem]"
                >
                  <ListingThumb
                    src={row.thumbUrl}
                    alt={row.title}
                    sizes="120px"
                    className="object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${statusClass(row.saleStatus)}`}
                    >
                      {SALE_STATUS_LABELS[row.saleStatus]}
                    </span>
                    <span className="text-[11.5px] tracking-wide text-neutral-400">
                      Listed {formatListedDate(row.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={`/listings/${row.id}`}
                    className="mt-1 block text-[14px] font-semibold leading-snug text-neutral-900 hover:underline sm:text-[15px]"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 truncate text-[12.5px] tracking-wide text-neutral-500">
                    {[row.sellerName, row.contact].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <Link
                      href={`/listings/${row.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-neutral-200 bg-white px-2.5 text-[12.5px] font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/listings/${row.id}/edit`}
                      className="inline-flex h-8 items-center rounded-md bg-neutral-900 px-2.5 text-[12.5px] font-medium text-white transition hover:bg-neutral-800"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
