import Link from "next/link";
import type { ListingCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";
import {
  formatCostWon,
  getInventoryCostSummary,
} from "@/lib/inventory-cost";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: ListingCategory[] = [
  "LIVE_AUCTION",
  "CAR_LISTINGS",
  "STAND_BY",
  "HOT_DEALS",
  "USED_PARTS",
];

export default async function AdminOverviewPage() {
  const [
    userCount,
    listingCount,
    offerListingCount,
    pendingUserCount,
    inventory,
    byCategory,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({
      where: { purchaseOffers: { some: {} } },
    }),
    prisma.user.count({ where: { status: "PENDING" } }),
    getInventoryCostSummary(),
    prisma.listing.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
  ]);

  const categoryCounts = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, 0]),
  ) as Record<ListingCategory, number>;
  for (const row of byCategory) {
    categoryCounts[row.category] = row._count._all;
  }

  const kpis = [
    {
      label: "오퍼 접수",
      value: offerListingCount.toLocaleString("ko-KR"),
      href: "/admin/listings?sort=offers_desc",
      note:
        offerListingCount > 0
          ? "오퍼 있는 매물"
          : "접수된 오퍼 없음",
    },
    {
      label: "회원",
      value: userCount.toLocaleString("ko-KR"),
      href: "/admin/users",
      note:
        pendingUserCount > 0
          ? `승인 대기 ${pendingUserCount.toLocaleString("ko-KR")}`
          : "전체 회원",
    },
    {
      label: "매물",
      value: listingCount.toLocaleString("ko-KR"),
      href: "/admin/listings",
      note: `판매중 ${inventory.count.toLocaleString("ko-KR")}`,
    },
    {
      label: "재고 원가",
      value: formatCostWon(inventory.total),
      href: "/admin/listings?sale=AVAILABLE",
      note:
        inventory.soldCount > 0
          ? `완료 ${inventory.soldCount.toLocaleString("ko-KR")}대 제외`
          : "판매중 기준",
      compact: true,
    },
  ];

  return (
    <div className="admin-overview space-y-4">
      <section className="admin-panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3.5">
          <h2 className="text-[14px] font-semibold tracking-tight text-neutral-900">
            현황 요약
          </h2>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            핵심 지표만 모아 두었습니다. 카드를 누르면 해당 관리 화면으로
            이동합니다.
          </p>
        </div>

        <div className="admin-overview-kpi-grid grid grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="admin-overview-kpi min-h-[6.5rem] px-5 py-4 transition hover:bg-neutral-50/80"
            >
              <p className="text-[12px] font-medium text-neutral-500">
                {kpi.label}
              </p>
              <p
                className={`mt-2 font-semibold tracking-tight text-neutral-900 tabular-nums ${
                  kpi.compact
                    ? "text-[1.15rem] leading-snug sm:text-[1.25rem]"
                    : "text-[1.65rem] leading-none"
                }`}
              >
                {kpi.value}
              </p>
              <p className="mt-2 truncate text-[12px] text-neutral-400">
                {kpi.note}
              </p>
            </Link>
          ))}
        </div>

        <div className="border-t border-[var(--line)] bg-neutral-50/50 px-5 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-x-6">
            {CATEGORY_ORDER.map((category) => (
              <Link
                key={category}
                href={`/admin/listings?category=${category}`}
                className="flex min-w-0 items-baseline justify-between gap-2 text-[13px] transition hover:text-neutral-950"
              >
                <span className="truncate text-neutral-600">
                  {ADMIN_CATEGORY_LABELS[category]}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-neutral-900">
                  {categoryCounts[category].toLocaleString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--line)] px-5 py-3.5">
          <p className="text-[12px] font-medium text-neutral-500">
            보관 장소별 재고 원가
          </p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inventory.byLocation.map((row) => (
              <Link
                key={row.location}
                href={
                  row.location === "미지정"
                    ? "/admin/listings?sale=AVAILABLE&storage=UNASSIGNED"
                    : `/admin/listings?sale=AVAILABLE&storage=${encodeURIComponent(row.location)}`
                }
                className="flex min-w-0 items-baseline justify-between gap-3 rounded-md border border-[var(--line)] bg-white px-3.5 py-2.5 transition hover:bg-neutral-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-neutral-800">
                    {row.location}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-neutral-400">
                    {row.count.toLocaleString("ko-KR")}대
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-neutral-900">
                  {formatCostWon(row.total)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
