import Link from "next/link";
import type { ListingCategory, ListingSaleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ListingAdminControls } from "@/components/admin/ListingAdminControls";
import {
  CategoryFilter,
  type ListingSort,
} from "@/components/admin/CategoryFilter";
import {
  SaleStatusFilter,
  type SaleFilter,
} from "@/components/admin/SaleStatusFilter";
import { AdminListingSearch } from "@/components/admin/AdminListingSearch";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { buildListingSearchWhere } from "@/lib/admin-listing-search";
import {
  ADMIN_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin-pagination";
import {
  ADMIN_CATEGORY_LABELS,
  SALE_STATUS_ADMIN_LABELS,
} from "@/lib/admin-labels";
import {
  adminTableClass,
  adminTableScrollClass,
  adminTdActionsClass,
  adminTdClass,
  adminThClass,
} from "@/lib/admin-ui";
import { calcAccumulatedDays } from "@/lib/listing-actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string;
    sort?: string;
    page?: string;
    q?: string;
    sale?: string;
  }>;
};

type CostTier = "high" | "mid" | null;

const COST_ORANGE_MIN = 4_000_000;
const COST_RED_MIN = 10_000_000;

function parseCostPrice(value?: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function costTier(cost: number | null): CostTier {
  if (cost == null) return null;
  if (cost >= COST_RED_MIN) return "high";
  if (cost >= COST_ORANGE_MIN) return "mid";
  return null;
}

function formatCostWon(cost: number) {
  return `${cost.toLocaleString("ko-KR")}원`;
}

/**
 * Same 누적일 as listing registration: inboundDate → today.
 * Falls back to stored accumulatedDays when inbound date is missing.
 */
function displayAccumulatedDays(listing: {
  inboundDate?: string | null;
  accumulatedDays?: string | null;
}): number | null {
  const inbound = listing.inboundDate?.replace(/\D/g, "") ?? "";
  if (inbound.length === 8) {
    return calcAccumulatedDays(inbound);
  }
  const stored = listing.accumulatedDays?.replace(/\D/g, "") ?? "";
  if (stored) {
    const n = Number(stored);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseCategory(value?: string): ListingCategory | "ALL" {
  if (
    value === "HOT_DEALS" ||
    value === "CAR_LISTINGS" ||
    value === "STAND_BY"
  ) {
    return value;
  }
  return "ALL";
}

function parseSort(value?: string): ListingSort {
  if (
    value === "price_desc" ||
    value === "price_asc" ||
    value === "days_desc"
  ) {
    return value;
  }
  return "newest";
}

function daysSortValue(listing: {
  inboundDate?: string | null;
  accumulatedDays?: string | null;
}) {
  return displayAccumulatedDays(listing) ?? -1;
}

function parseSale(value?: string): SaleFilter {
  if (
    value === "AVAILABLE" ||
    value === "RESERVED" ||
    value === "SOLD"
  ) {
    return value;
  }
  return "ALL";
}

function costSortValue(
  costPrice: string | null | undefined,
  missing: number,
) {
  return parseCostPrice(costPrice) ?? missing;
}

export default async function AdminListingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const sort = parseSort(params.sort);
  const sale = parseSale(params.sale);
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";

  const searchWhere = buildListingSearchWhere(q);
  const categoryWhere: Prisma.ListingWhereInput =
    category === "ALL" ? {} : { category };
  const saleWhere: Prisma.ListingWhereInput =
    sale === "ALL" ? {} : { saleStatus: sale };

  const where: Prisma.ListingWhereInput = {
    AND: [categoryWhere, saleWhere, searchWhere],
  };

  // Category pill counts: search + sale filter (ignore category)
  const categoryCountWhere: Prisma.ListingWhereInput = {
    AND: [saleWhere, searchWhere],
  };
  // Sale pill counts: search + category filter (ignore sale)
  const saleCountWhere: Prisma.ListingWhereInput = {
    AND: [categoryWhere, searchWhere],
  };

  const [total, grouped, saleGrouped, offerListingCount, availableStock] =
    await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.groupBy({
        by: ["category"],
        where: categoryCountWhere,
        _count: { _all: true },
      }),
      prisma.listing.groupBy({
        by: ["saleStatus"],
        where: saleCountWhere,
        _count: { _all: true },
      }),
      prisma.listing.count({
        where: {
          AND: [where, { purchaseOffers: { some: {} } }],
        },
      }),
      prisma.listing.findMany({
        where: { saleStatus: "AVAILABLE" },
        select: { costPrice: true },
      }),
    ]);

  const availableCostTotal = availableStock.reduce(
    (sum, row) => sum + (parseCostPrice(row.costPrice) ?? 0),
    0,
  );

  const pages = totalPages(total);
  const currentPage = Math.min(page, pages);
  const skip = (currentPage - 1) * ADMIN_PAGE_SIZE;

  const include = {
    author: { select: { name: true, email: true } },
    _count: { select: { purchaseOffers: true } },
  } as const;

  type AdminListingRow = Prisma.ListingGetPayload<{ include: typeof include }>;
  let listings: AdminListingRow[] = [];

  if (sort === "newest") {
    listings = await prisma.listing.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      skip,
      take: ADMIN_PAGE_SIZE,
      include,
    });
  } else {
    // Lightweight id list for numeric cost / days sort, then fetch page rows
    const rows = await prisma.listing.findMany({
      where,
      select: {
        id: true,
        costPrice: true,
        createdAt: true,
        inboundDate: true,
        accumulatedDays: true,
      },
    });

    if (sort === "days_desc") {
      rows.sort((a, b) => {
        const da = daysSortValue(a);
        const db = daysSortValue(b);
        if (da !== db) return db - da;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else {
      const missing = sort === "price_desc" ? -1 : Number.POSITIVE_INFINITY;
      rows.sort((a, b) => {
        const ca = costSortValue(a.costPrice, missing);
        const cb = costSortValue(b.costPrice, missing);
        if (ca !== cb) {
          return sort === "price_desc" ? cb - ca : ca - cb;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }

    const pageIds = rows.slice(skip, skip + ADMIN_PAGE_SIZE).map((r) => r.id);
    if (pageIds.length === 0) {
      listings = [];
    } else {
      const pageRows = await prisma.listing.findMany({
        where: { id: { in: pageIds } },
        include,
      });
      const byId = new Map(pageRows.map((row) => [row.id, row]));
      listings = pageIds
        .map((id) => byId.get(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
    }
  }

  const counts = {
    ALL: grouped.reduce((sum, row) => sum + row._count._all, 0),
    HOT_DEALS: 0,
    CAR_LISTINGS: 0,
    STAND_BY: 0,
  } as Record<ListingCategory | "ALL", number>;

  for (const row of grouped) {
    counts[row.category] = row._count._all;
  }

  const saleCounts: Record<SaleFilter, number> = {
    ALL: saleGrouped.reduce((sum, row) => sum + row._count._all, 0),
    AVAILABLE: 0,
    RESERVED: 0,
    SOLD: 0,
  };
  for (const row of saleGrouped) {
    saleCounts[row.saleStatus as ListingSaleStatus] = row._count._all;
  }

  const queryParams = {
    sort,
    category: category === "ALL" ? undefined : category,
    sale: sale === "ALL" ? undefined : sale,
    q: q || undefined,
  };

  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            매물 관리
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            한 페이지에 {ADMIN_PAGE_SIZE}개씩 표시됩니다.
            {q ? (
              <>
                {" "}
                · 검색 결과{" "}
                <span className="font-medium text-neutral-700">
                  {total.toLocaleString("ko-KR")}건
                </span>
              </>
            ) : null}
            {offerListingCount > 0 ? (
              <>
                {" "}
                · 희망가 접수{" "}
                <span className="font-medium text-amber-800">
                  {offerListingCount.toLocaleString("ko-KR")}건
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-sky-900">
            재고 원가 합계{" "}
            <span className="font-semibold tabular-nums">
              {formatCostWon(availableCostTotal)}
            </span>
            <span className="text-sky-700/80">
              {" "}
              · {availableStock.length.toLocaleString("ko-KR")}대
            </span>
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
            원가{" "}
            <span className="font-medium text-orange-700">
              400만~1,000만 미만 · 주황
            </span>
            {" · "}
            <span className="font-medium text-red-700">
              1,000만 이상 · 빨강
            </span>
          </p>
        </div>
        <Link
          href="/listings/new"
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white hover:bg-neutral-700"
        >
          + 매물 등록
        </Link>
      </div>

      <AdminListingSearch
        q={q}
        category={category}
        sort={sort}
        sale={sale}
      />
      <CategoryFilter
        current={category}
        counts={counts}
        sort={sort}
        q={q}
        sale={sale}
      />
      <SaleStatusFilter
        current={sale}
        counts={saleCounts}
        category={category}
        sort={sort}
        q={q}
      />

      <div className={adminTableScrollClass}>
        <table className={adminTableClass}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "24%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className={adminThClass}>제목</th>
              <th className={adminThClass}>카테고리</th>
              <th className={adminThClass}>원가</th>
              <th className={`${adminThClass} text-center`}>희망가</th>
              <th className={`${adminThClass} text-center`}>누적일</th>
              <th className={adminThClass}>등록자</th>
              <th className={adminThClass}>등록일</th>
              <th className={`${adminThClass} admin-th-actions text-right`}>
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => {
              const offerCount = listing._count.purchaseOffers;
              const hasOffers = offerCount > 0;
              const cost = parseCostPrice(listing.costPrice);
              const tier = costTier(cost);
              const days = displayAccumulatedDays(listing);

              const rowClass =
                tier === "high"
                  ? "bg-red-50 hover:bg-red-100/80"
                  : tier === "mid"
                    ? "bg-orange-50 hover:bg-orange-100/70"
                    : hasOffers
                      ? "bg-amber-50/90 hover:bg-amber-50"
                      : "hover:bg-neutral-50/70";

              const edgeClass =
                tier === "high"
                  ? "border-l-[3px] border-l-red-600"
                  : tier === "mid"
                    ? "border-l-[3px] border-l-orange-500"
                    : hasOffers
                      ? "border-l-[3px] border-l-amber-500"
                      : "border-l-[3px] border-l-transparent";

              return (
                <tr key={listing.id} className={rowClass}>
                  <td className={`${adminTdClass} ${edgeClass}`}>
                    <div className="min-w-0 space-y-1.5">
                      <Link
                        href={`/listings/${listing.id}`}
                        className={`block truncate text-[13.5px] font-medium leading-snug hover:underline ${
                          tier === "high"
                            ? "text-red-900"
                            : tier === "mid"
                              ? "text-orange-950"
                              : "text-neutral-800"
                        }`}
                        title={listing.title}
                      >
                        {listing.title}
                      </Link>
                      <div className="flex flex-wrap gap-1">
                        {listing.saleStatus !== "AVAILABLE" ? (
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[12.5px] font-medium leading-none ${
                              listing.saleStatus === "SOLD"
                                ? "bg-neutral-800 text-white"
                                : "bg-sky-100 text-sky-900"
                            }`}
                          >
                            {SALE_STATUS_ADMIN_LABELS[listing.saleStatus]}
                          </span>
                        ) : null}
                        {tier === "high" ? (
                          <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-[12.5px] font-medium leading-none text-red-800">
                            고원가
                          </span>
                        ) : null}
                        {tier === "mid" ? (
                          <span className="inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[12.5px] font-medium leading-none text-orange-800">
                            주의 원가
                          </span>
                        ) : null}
                        {hasOffers ? (
                          <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[12.5px] font-medium leading-none text-amber-900">
                            희망가 접수
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={adminTdClass}>
                    <span className="inline-flex max-w-full truncate rounded-full bg-neutral-100 px-2.5 py-1 text-[12.5px] text-neutral-700">
                      {ADMIN_CATEGORY_LABELS[listing.category]}
                    </span>
                  </td>
                  <td className={adminTdClass}>
                    {cost != null ? (
                      <span
                        className={`inline-flex max-w-full truncate rounded-md border px-2 py-1 text-[12.5px] font-semibold tabular-nums ${
                          tier === "high"
                            ? "border-red-400 bg-red-100 text-red-900"
                            : tier === "mid"
                              ? "border-orange-400 bg-orange-100 text-orange-950"
                              : "border-neutral-200 bg-neutral-50 text-neutral-700"
                        }`}
                        title={formatCostWon(cost)}
                      >
                        {formatCostWon(cost)}
                      </span>
                    ) : (
                      <span className="text-[13px] text-neutral-400">—</span>
                    )}
                  </td>
                  <td
                    className={`${adminTdClass} text-center text-[12.5px] tabular-nums`}
                  >
                    {hasOffers ? (
                      <span className="font-semibold text-amber-900">
                        {offerCount.toLocaleString("ko-KR")}
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td
                    className={`${adminTdClass} text-center text-[12.5px] tabular-nums`}
                    title="입고일 기준 누적일"
                  >
                    {days != null ? (
                      <span
                        className={
                          days >= 30
                            ? "font-semibold text-red-600"
                            : "text-neutral-600"
                        }
                      >
                        {days.toLocaleString("ko-KR")}
                      </span>
                    ) : (
                      <span className="text-neutral-400" title="입고일자 미입력">
                        —
                      </span>
                    )}
                  </td>
                  <td
                    className={`${adminTdClass} truncate text-[13px] text-neutral-600 sm:text-[13.5px]`}
                    title={listing.author.name}
                  >
                    {listing.author.name}
                  </td>
                  <td
                    className={`${adminTdClass} whitespace-nowrap text-[12.5px] text-neutral-500 sm:text-[13px]`}
                  >
                    {listing.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className={`${adminTdActionsClass} admin-td-actions`}>
                    <ListingAdminControls
                      listingId={listing.id}
                      category={listing.category}
                      saleStatus={listing.saleStatus}
                    />
                  </td>
                </tr>
              );
            })}
            {listings.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-[13.5px] text-neutral-500"
                >
                  {q
                    ? `"${q}" 검색 결과가 없습니다.`
                    : sale !== "ALL"
                      ? `${SALE_STATUS_ADMIN_LABELS[sale]} 매물이 없습니다.`
                      : "조건에 맞는 매물이 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/listings"
        page={currentPage}
        total={total}
        pageSize={ADMIN_PAGE_SIZE}
        params={queryParams}
      />
    </div>
  );
}
