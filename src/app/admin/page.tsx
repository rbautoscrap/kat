import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ADMIN_CATEGORY_LABELS, ROLE_LABELS } from "@/lib/admin-labels";
import {
  formatCostWon,
  getInventoryCostSummary,
} from "@/lib/inventory-cost";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    userCount,
    listingCount,
    offerListingCount,
    inventory,
    byCategory,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({
      where: { purchaseOffers: { some: {} } },
    }),
    getInventoryCostSummary(),
    prisma.listing.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
      },
    }),
  ]);

  const inventoryHint =
    inventory.soldCount > 0
      ? `판매완료 ${inventory.soldCount.toLocaleString("ko-KR")}대 차감 · 판매중 ${inventory.count.toLocaleString("ko-KR")}대`
      : `판매중 ${inventory.count.toLocaleString("ko-KR")}대`;

  const stats = [
    {
      label: "오퍼 접수 매물",
      value: String(offerListingCount),
      href: "/admin/listings",
      accent: "amber" as const,
    },
    {
      label: "재고 원가 합계",
      value: formatCostWon(inventory.total),
      href: "/admin/listings?sale=AVAILABLE",
      accent: "stock" as const,
      hint: inventoryHint,
    },
    {
      label: "전체 회원",
      value: String(userCount),
      href: "/admin/users",
      accent: "none" as const,
    },
    {
      label: "매물",
      value: String(listingCount),
      href: "/admin/listings",
      accent: "none" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`admin-stat-card ${
              stat.accent === "amber"
                ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                : stat.accent === "stock"
                  ? "border-sky-300 bg-sky-50 hover:border-sky-400"
                  : ""
            }`}
          >
            <p
              className={`admin-stat-label ${
                stat.accent === "amber"
                  ? "text-amber-800"
                  : stat.accent === "stock"
                    ? "text-sky-800"
                    : ""
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`admin-stat-value ${
                stat.accent === "stock"
                  ? "text-[1.35rem] text-sky-950 sm:text-[1.5rem]"
                  : ""
              } ${
                stat.accent === "amber"
                  ? "text-amber-950"
                  : stat.accent === "stock"
                    ? ""
                    : ""
              }`}
            >
              {stat.value}
            </p>
            {"hint" in stat && stat.hint ? (
              <p className="mt-1.5 text-[12px] font-medium text-sky-700/90">
                {stat.hint}
              </p>
            ) : null}
          </Link>
        ))}
      </div>

      <section className="admin-panel p-5">
        <h2 className="mb-3 text-[14px] font-semibold tracking-tight text-neutral-900">
          카테고리별 매물
        </h2>
        {byCategory.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-neutral-400">
            등록된 매물이 없습니다.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3">
            {byCategory.map((row) => (
              <li
                key={row.category}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-neutral-100 px-3.5 py-2.5 text-[13.5px]"
              >
                <span className="truncate text-neutral-700">
                  {ADMIN_CATEGORY_LABELS[row.category]}
                </span>
                <span className="tabular-nums font-medium text-neutral-900">
                  {row._count._all}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="admin-panel p-5">
          <div className="admin-panel-header mb-1">
            <h2 className="text-[14px] font-semibold tracking-tight text-neutral-900">
              최근 회원
            </h2>
            <Link
              href="/admin/users"
              className="text-[12.5px] font-medium text-neutral-500 transition hover:text-neutral-800"
            >
              전체 보기
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-neutral-400">
              회원이 없습니다.
            </p>
          ) : (
            <ul className="admin-list">
              {recentUsers.map((user) => (
                <li key={user.id} className="admin-list-row">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="block truncate text-[13.5px] font-medium text-neutral-900 hover:underline"
                    >
                      {user.name}
                    </Link>
                    <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-medium text-neutral-600">
                    {ROLE_LABELS[user.role]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-panel p-5">
          <div className="admin-panel-header mb-1">
            <h2 className="text-[14px] font-semibold tracking-tight text-neutral-900">
              최근 매물
            </h2>
            <Link
              href="/admin/listings"
              className="text-[12.5px] font-medium text-neutral-500 transition hover:text-neutral-800"
            >
              전체 보기
            </Link>
          </div>
          {recentListings.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-neutral-400">
              매물이 없습니다.
            </p>
          ) : (
            <ul className="admin-list">
              {recentListings.map((listing) => (
                <li key={listing.id} className="admin-list-row">
                  <div className="min-w-0">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="block truncate text-[13.5px] font-medium text-neutral-900 hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-0.5 truncate text-[12.5px] text-neutral-500">
                      {ADMIN_CATEGORY_LABELS[listing.category]}
                    </p>
                  </div>
                  <time className="shrink-0 tabular-nums text-[12px] text-neutral-400">
                    {listing.createdAt.toISOString().slice(0, 10)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
