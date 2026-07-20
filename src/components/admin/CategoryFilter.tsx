import Link from "next/link";
import type { ListingCategory } from "@prisma/client";
import type { SaleFilter } from "@/components/admin/SaleStatusFilter";
import { buildPageHref } from "@/lib/admin-pagination";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";

export type ListingSort =
  | "newest"
  | "price_desc"
  | "price_asc"
  | "days_desc";

type Props = {
  current?: ListingCategory | "ALL";
  counts: Record<ListingCategory | "ALL", number>;
  sort: ListingSort;
  q?: string;
  sale?: SaleFilter;
};

const filters: Array<{ value: "ALL" | ListingCategory; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "HOT_DEALS", label: ADMIN_CATEGORY_LABELS.HOT_DEALS },
  { value: "CAR_LISTINGS", label: ADMIN_CATEGORY_LABELS.CAR_LISTINGS },
  { value: "STAND_BY", label: ADMIN_CATEGORY_LABELS.STAND_BY },
];

const sortOptions: Array<{ value: ListingSort; label: string }> = [
  { value: "newest", label: "최신순" },
  { value: "price_desc", label: "높은원가순" },
  { value: "price_asc", label: "낮은원가순" },
  { value: "days_desc", label: "누적일순" },
];

export function CategoryFilter({
  current = "ALL",
  counts,
  sort,
  q,
  sale = "ALL",
}: Props) {
  const shared = {
    sort,
    q: q || undefined,
    sale: sale === "ALL" ? undefined : sale,
  };

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = current === f.value;
          const href = buildPageHref("/admin/listings", 1, {
            ...shared,
            category: f.value === "ALL" ? undefined : f.value,
          });
          return (
            <Link
              key={f.value}
              href={href}
              className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] transition ${
                active
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 tabular-nums ${active ? "text-neutral-300" : "text-neutral-400"}`}
              >
                {counts[f.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-neutral-500 sm:gap-2">
        <span className="shrink-0">정렬</span>
        {sortOptions.map((option) => (
          <Link
            key={option.value}
            href={buildPageHref("/admin/listings", 1, {
              ...shared,
              sort: option.value,
              category: current === "ALL" ? undefined : current,
            })}
            className={`inline-flex h-8 items-center rounded-md border px-3 transition ${
              sort === option.value
                ? "border-neutral-800 bg-white text-neutral-800"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
