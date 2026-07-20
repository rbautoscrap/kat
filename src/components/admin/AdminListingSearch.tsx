import Link from "next/link";
import type { ListingCategory } from "@prisma/client";
import type { ListingSort } from "@/components/admin/CategoryFilter";
import type { SaleFilter } from "@/components/admin/SaleStatusFilter";
import { buildPageHref } from "@/lib/admin-pagination";

type Props = {
  q?: string;
  category: ListingCategory | "ALL";
  sort: ListingSort;
  sale?: SaleFilter;
};

export function AdminListingSearch({
  q = "",
  category,
  sort,
  sale = "ALL",
}: Props) {
  const clearHref = buildPageHref("/admin/listings", 1, {
    sort,
    category: category === "ALL" ? undefined : category,
    sale: sale === "ALL" ? undefined : sale,
  });

  return (
    <form
      action="/admin/listings"
      method="get"
      className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
    >
      {category !== "ALL" ? (
        <input type="hidden" name="category" value={category} />
      ) : null}
      {sort !== "newest" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      {sale !== "ALL" ? (
        <input type="hidden" name="sale" value={sale} />
      ) : null}

      <label className="sr-only" htmlFor="admin-listing-q">
        매물 검색
      </label>
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500">
        <input
          id="admin-listing-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="제목, VIN, 차량번호, 원가, 특이사항, 등록자 등 상세 전체 검색"
          className="h-10 min-w-0 flex-1 bg-white px-3.5 text-[13.5px] text-neutral-800 outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="shrink-0 border-l border-neutral-200 bg-neutral-800 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-700"
        >
          검색
        </button>
      </div>
      {q ? (
        <Link
          href={clearHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 px-3.5 text-[13px] text-neutral-600 transition hover:bg-neutral-50"
        >
          초기화
        </Link>
      ) : null}
    </form>
  );
}
