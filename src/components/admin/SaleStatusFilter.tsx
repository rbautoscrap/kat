import Link from "next/link";
import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import { buildPageHref } from "@/lib/admin-pagination";
import { SALE_STATUS_ADMIN_LABELS } from "@/lib/admin-labels";
import type { ListingSort } from "@/components/admin/CategoryFilter";

export type SaleFilter = "ALL" | ListingSaleStatus;

type Props = {
  current: SaleFilter;
  counts: Record<SaleFilter, number>;
  category: ListingCategory | "ALL";
  sort: ListingSort;
  q?: string;
};

const filters: Array<{
  value: SaleFilter;
  label: string;
  activeClass: string;
  idleClass: string;
}> = [
  {
    value: "ALL",
    label: "전체",
    activeClass: "border-neutral-800 bg-neutral-800 text-white",
    idleClass:
      "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
  },
  {
    value: "AVAILABLE",
    label: SALE_STATUS_ADMIN_LABELS.AVAILABLE,
    activeClass: "border-emerald-700 bg-emerald-700 text-white",
    idleClass:
      "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:border-emerald-300",
  },
  {
    value: "RESERVED",
    label: SALE_STATUS_ADMIN_LABELS.RESERVED,
    activeClass: "border-sky-700 bg-sky-700 text-white",
    idleClass:
      "border-sky-200 bg-sky-50/70 text-sky-900 hover:border-sky-300",
  },
  {
    value: "SOLD",
    label: SALE_STATUS_ADMIN_LABELS.SOLD,
    activeClass: "border-neutral-700 bg-neutral-700 text-white",
    idleClass:
      "border-neutral-300 bg-neutral-100 text-neutral-700 hover:border-neutral-400",
  },
];

export function SaleStatusFilter({
  current,
  counts,
  category,
  sort,
  q,
}: Props) {
  const shared = {
    sort,
    q: q || undefined,
    category: category === "ALL" ? undefined : category,
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-3">
      <span className="mr-1 shrink-0 text-[12.5px] tracking-wide text-neutral-500">
        판매상태
      </span>
      {filters.map((f) => {
        const active = current === f.value;
        const href = buildPageHref("/admin/listings", 1, {
          ...shared,
          sale: f.value === "ALL" ? undefined : f.value,
        });
        return (
          <Link
            key={f.value}
            href={href}
            className={`inline-flex h-8 items-center rounded-md border px-3 text-[12.5px] font-medium tracking-wide transition ${
              active ? f.activeClass : f.idleClass
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 tabular-nums ${
                active ? "opacity-80" : "opacity-60"
              }`}
            >
              {counts[f.value]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
