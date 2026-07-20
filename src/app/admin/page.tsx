import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ADMIN_CATEGORY_LABELS, ROLE_LABELS } from "@/lib/admin-labels";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    userCount,
    listingCount,
    offerListingCount,
    byCategory,
    recentUsers,
    recentListings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({
      where: { purchaseOffers: { some: {} } },
    }),
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

  const stats = [
    {
      label: "오퍼 접수 매물",
      value: offerListingCount,
      href: "/admin/listings",
      accent: true,
    },
    { label: "전체 회원", value: userCount, href: "/admin/users", accent: false },
    { label: "매물", value: listingCount, href: "/admin/listings", accent: false },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`border px-4 py-4 transition hover:border-neutral-400 ${
              stat.accent
                ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                : "border-neutral-200 bg-white"
            }`}
          >
            <p
              className={`text-xs ${
                stat.accent ? "text-amber-800" : "text-neutral-500"
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                stat.accent ? "text-amber-950" : "text-neutral-900"
              }`}
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <section className="border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">카테고리별 매물</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {byCategory.map((row) => (
            <li
              key={row.category}
              className="flex justify-between border border-neutral-100 px-3 py-2 text-sm"
            >
              <span>{ADMIN_CATEGORY_LABELS[row.category]}</span>
              <span className="tabular-nums text-neutral-600">
                {row._count._all}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">최근 회원</h2>
            <Link href="/admin/users" className="text-xs underline">
              전체 보기
            </Link>
          </div>
          <ul className="divide-y divide-neutral-100 text-sm">
            {recentUsers.map((user) => (
              <li key={user.id} className="flex justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="truncate font-medium text-neutral-800 hover:underline"
                  >
                    {user.name}
                  </Link>
                  <p className="truncate text-xs text-neutral-500">
                    {user.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-600">
                  {ROLE_LABELS[user.role]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">최근 매물</h2>
            <Link href="/admin/listings" className="text-xs underline">
              전체 보기
            </Link>
          </div>
          <ul className="divide-y divide-neutral-100 text-sm">
            {recentListings.map((listing) => (
              <li key={listing.id} className="flex justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="truncate font-medium text-neutral-800 hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="truncate text-xs text-neutral-500">
                    {ADMIN_CATEGORY_LABELS[listing.category]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
