import Link from "next/link";
import type { ListingCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_CATEGORY_LABELS } from "@/lib/admin-labels";
import {
  formatCostWon,
  getInventoryCostSummary,
  STAGNANT_INBOUND_DAYS,
} from "@/lib/inventory-cost";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: ListingCategory[] = [
  "LIVE_AUCTION",
  "CAR_LISTINGS",
  "STAND_BY",
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
    prisma.listing.count({
      where: { NOT: { category: "USED_PARTS" } },
    }),
    prisma.listing.count({
      where: {
        NOT: { category: "USED_PARTS" },
        purchaseOffers: { some: {} },
      },
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

  const metrics: Array<{
    label: string;
    value: string;
    href: string;
    note?: string;
    emphasize?: boolean;
    danger?: boolean;
  }> = [
    {
      label: "오퍼",
      value: offerListingCount.toLocaleString("ko-KR"),
      href: "/admin/listings?sort=offers_desc",
      note: "오퍼 있는 매물",
    },
    {
      label: "회원",
      value: userCount.toLocaleString("ko-KR"),
      href: "/admin/users",
      note:
        pendingUserCount > 0
          ? `대기 ${pendingUserCount.toLocaleString("ko-KR")}`
          : undefined,
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
          : "판매중",
      emphasize: true,
    },
    {
      label: "원가 5백 이하",
      value: `${inventory.costAtMost5mCount.toLocaleString("ko-KR")}대`,
      href: "/admin/listings?sale=AVAILABLE",
      note: "판매중 · ≤500만",
    },
    {
      label: "원가 5백 이상",
      value: `${inventory.costOver5mCount.toLocaleString("ko-KR")}대`,
      href: "/admin/listings?sale=AVAILABLE",
      note: "판매중 · >500만",
    },
    {
      label: "악성재고",
      value: `${inventory.stagnantCount.toLocaleString("ko-KR")}대`,
      href: "/admin/listings?sale=AVAILABLE&sort=days_desc",
      note: `입고 ${STAGNANT_INBOUND_DAYS}일 이상`,
      danger: true,
    },
    {
      label: "총재고",
      value: `${inventory.inboundCount.toLocaleString("ko-KR")}대`,
      href: "/admin/listings?sale=AVAILABLE",
      note: "판매완료 제외 · 입고분",
    },
  ];

  return (
    <div className="admin-overview space-y-3">
      <section className="admin-panel overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <h2 className="text-[14px] font-semibold tracking-tight text-neutral-900">
            메인 현황
          </h2>
          <p className="text-[12px] text-neutral-400">판매중 기준 · 중고부품 제외</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
          {metrics.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="min-h-[5.5rem] border-b border-r border-[var(--line)] px-4 py-3.5 transition hover:bg-neutral-50/90 sm:px-5"
            >
              <p className="text-[11.5px] font-medium tracking-wide text-neutral-500">
                {item.label}
              </p>
              <p
                className={`mt-1.5 font-semibold tracking-tight tabular-nums ${
                  item.danger
                    ? "text-[1.35rem] leading-none text-red-600"
                    : item.emphasize
                      ? "text-[1.05rem] leading-snug text-neutral-900 sm:text-[1.1rem]"
                      : "text-[1.35rem] leading-none text-neutral-900"
                }`}
              >
                {item.value}
              </p>
              {item.note ? (
                <p
                  className={`mt-1.5 truncate text-[11.5px] ${
                    item.danger ? "text-red-400" : "text-neutral-400"
                  }`}
                >
                  {item.note}
                </p>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="border-t border-[var(--line)] px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {CATEGORY_ORDER.map((category) => (
              <Link
                key={category}
                href={`/admin/listings?category=${category}`}
                className="inline-flex items-baseline gap-1.5 text-[12.5px] text-neutral-600 transition hover:text-neutral-950"
              >
                <span>{ADMIN_CATEGORY_LABELS[category]}</span>
                <span className="font-semibold tabular-nums text-neutral-900">
                  {categoryCounts[category].toLocaleString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--line)]">
          <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
            <p className="text-[12px] font-medium text-neutral-500">
              보관 장소별 재고
            </p>
          </div>
          <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {inventory.byLocation.map((row) => (
              <li key={row.location}>
                <Link
                  href={
                    row.location === "미지정"
                      ? "/admin/listings?sale=AVAILABLE&storage=UNASSIGNED"
                      : `/admin/listings?sale=AVAILABLE&storage=${encodeURIComponent(row.location)}`
                  }
                  className="flex items-center justify-between gap-4 px-4 py-2.5 transition hover:bg-neutral-50/80 sm:px-5"
                >
                  <span className="min-w-0 truncate text-[13px] text-neutral-700">
                    {row.location}
                    <span className="ml-2 text-[12px] text-neutral-400">
                      {row.count.toLocaleString("ko-KR")}대
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900">
                    {formatCostWon(row.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
