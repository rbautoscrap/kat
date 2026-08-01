import Link from "next/link";
import { UsersSectionNav } from "@/components/admin/UsersSectionNav";
import { ROLE_LABELS } from "@/lib/admin-labels";
import {
  adminTableClass,
  adminTableScrollClass,
  adminTdCompactClass,
  adminThCompactClass,
} from "@/lib/admin-ui";
import {
  loadMemberEngagement,
  parseEngagementSort,
  type EngagementSort,
} from "@/lib/user-engagement";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ sort?: string }>;
};

const sortOptions: Array<{ value: EngagementSort; label: string }> = [
  { value: "score", label: "참여도순" },
  { value: "logins", label: "접속순" },
  { value: "offers", label: "오퍼순" },
  { value: "purchases", label: "구매순" },
  { value: "newest", label: "가입순" },
];

function formatLastLogin(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminUserAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = parseEngagementSort(params.sort);
  const [{ rows, totals }, pendingCount] = await Promise.all([
    loadMemberEngagement(sort),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);

  const summary = [
    {
      label: "회원",
      value: totals.members.toLocaleString("ko-KR"),
      note: `접속 이력 ${totals.activeLogins.toLocaleString("ko-KR")}명`,
    },
    {
      label: "총 접속",
      value: totals.loginSum.toLocaleString("ko-KR"),
      note: "누적 로그인",
    },
    {
      label: "오퍼 참여",
      value: totals.withOffers.toLocaleString("ko-KR"),
      note: `오퍼 ${totals.offerSum.toLocaleString("ko-KR")}건`,
    },
    {
      label: "구매 연계",
      value: totals.withPurchases.toLocaleString("ko-KR"),
      note: `명세서 ${totals.purchaseSum.toLocaleString("ko-KR")}건`,
    },
  ];

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <UsersSectionNav active="analytics" pendingCount={pendingCount} />
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          접속·오퍼·구매(거래명세서 연계)를 기준으로 회원 참여도를 한눈에
          확인합니다. 접속 수는 이번 기능 적용 이후부터 집계됩니다.
        </p>
      </div>

      <div className="grid grid-cols-2 border-b border-[var(--line)] xl:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="min-h-[5.25rem] border-b border-r border-[var(--line)] px-4 py-3.5 sm:px-5"
          >
            <p className="text-[11.5px] font-medium tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-1.5 text-[1.35rem] font-semibold leading-none tracking-tight text-neutral-900 tabular-nums">
              {item.value}
            </p>
            <p className="mt-1.5 truncate text-[11.5px] text-neutral-400">
              {item.note}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2.5 sm:px-5">
        <p className="text-[12px] text-neutral-500">
          참여도 = 접속 + 오퍼×3 + 구매×10 + 등록매물×2
        </p>
        <div className="flex flex-wrap gap-1">
          {sortOptions.map((option) => {
            const active = option.value === sort;
            const href =
              option.value === "score"
                ? "/admin/users/analytics"
                : `/admin/users/analytics?sort=${option.value}`;
            return (
              <Link
                key={option.value}
                href={href}
                className={`inline-flex h-8 items-center rounded-md px-2.5 text-[12.5px] font-semibold transition ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className={adminTableScrollClass}>
        <table className={`${adminTableClass} min-w-[920px] text-[13px]`}>
          <thead>
            <tr>
              <th className={adminThCompactClass}>이름</th>
              <th className={adminThCompactClass}>아이디</th>
              <th className={`${adminThCompactClass} text-center`}>접속</th>
              <th className={`${adminThCompactClass} text-center`}>오퍼</th>
              <th className={`${adminThCompactClass} text-center`}>구매</th>
              <th className={`${adminThCompactClass} text-center`}>매물</th>
              <th className={`${adminThCompactClass} text-center`}>참여도</th>
              <th className={adminThCompactClass}>최근 접속</th>
              <th className={adminThCompactClass}>역할</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50/70">
                <td className={adminTdCompactClass}>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="font-medium text-neutral-800 hover:underline"
                    title={user.name}
                  >
                    {user.name}
                  </Link>
                </td>
                <td
                  className={`${adminTdCompactClass} truncate text-neutral-600`}
                  title={user.email}
                >
                  {user.email}
                </td>
                <td
                  className={`${adminTdCompactClass} text-center tabular-nums font-semibold text-neutral-900`}
                >
                  {user.loginCount.toLocaleString("ko-KR")}
                </td>
                <td
                  className={`${adminTdCompactClass} text-center tabular-nums ${
                    user.offerCount > 0
                      ? "font-semibold text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {user.offerCount.toLocaleString("ko-KR")}
                </td>
                <td
                  className={`${adminTdCompactClass} text-center tabular-nums ${
                    user.purchaseCount > 0
                      ? "font-semibold text-emerald-700"
                      : "text-neutral-400"
                  }`}
                >
                  {user.purchaseCount.toLocaleString("ko-KR")}
                </td>
                <td
                  className={`${adminTdCompactClass} text-center tabular-nums text-neutral-600`}
                >
                  {user.listingCount.toLocaleString("ko-KR")}
                </td>
                <td
                  className={`${adminTdCompactClass} text-center tabular-nums font-semibold text-neutral-900`}
                >
                  {user.score.toLocaleString("ko-KR")}
                </td>
                <td
                  className={`${adminTdCompactClass} whitespace-nowrap text-[12px] text-neutral-500`}
                >
                  {formatLastLogin(user.lastLoginAt)}
                </td>
                <td className={`${adminTdCompactClass} whitespace-nowrap`}>
                  <span className="inline-flex rounded bg-neutral-100 px-1.5 py-0.5 text-[11.5px] text-neutral-700">
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-[13px] text-neutral-500"
                >
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
