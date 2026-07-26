import Link from "next/link";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DeleteUserButton } from "@/components/admin/DeleteUserButton";
import { RoleFilter } from "@/components/admin/RoleFilter";
import { UserAdminNoteButton } from "@/components/admin/UserAdminNoteButton";
import { UserSearchBar } from "@/components/admin/UserSearchBar";
import { UserStatusControls } from "@/components/admin/UserStatusControls";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ROLE_LABELS } from "@/lib/admin-labels";
import {
  ADMIN_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin-pagination";
import {
  adminActionBtnCompactClass,
  adminTableClass,
  adminTableScrollClass,
  adminTdActionsCompactClass,
  adminTdCompactClass,
  adminThCompactClass,
} from "@/lib/admin-ui";
import { buildUserSearchWhere } from "@/lib/user-search";

export const dynamic = "force-dynamic";

type RoleFilterValue = "ALL" | Role;
type SortValue = "newest" | "role";

type Props = {
  searchParams: Promise<{
    page?: string;
    role?: string;
    sort?: string;
    q?: string;
  }>;
};

function parseRole(value?: string): RoleFilterValue {
  if (value === "MEMBER" || value === "AUTHORIZED" || value === "ADMIN") {
    return value;
  }
  return "ALL";
}

function parseSort(value?: string): SortValue {
  return value === "role" ? "role" : "newest";
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  const params = await searchParams;
  const page = parsePage(params.page);
  const role = parseRole(params.role);
  const sort = parseSort(params.sort);
  const q = params.q?.trim() ?? "";

  const searchWhere = buildUserSearchWhere(q);
  const roleWhere: Prisma.UserWhereInput =
    role === "ALL" ? {} : { role };
  const where: Prisma.UserWhereInput = {
    AND: [roleWhere, searchWhere],
  };

  const [total, pendingCount, grouped] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        AND: [where, { status: "PENDING" }],
      },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where: searchWhere,
      _count: { _all: true },
    }),
  ]);

  const counts: Record<RoleFilterValue, number> = {
    ALL: grouped.reduce((sum, row) => sum + row._count._all, 0),
    MEMBER: 0,
    AUTHORIZED: 0,
    ADMIN: 0,
  };
  for (const row of grouped) {
    counts[row.role] = row._count._all;
  }

  const pages = totalPages(total);
  const currentPage = Math.min(page, pages);
  const skip = (currentPage - 1) * ADMIN_PAGE_SIZE;

  // Fetch a wider window then sort in memory so PENDING always leads status order
  // (SQLite enum string asc puts APPROVED before PENDING).
  const statusRank = (status: string) =>
    status === "PENDING" ? 0 : status === "REJECTED" ? 1 : 2;
  const roleRank = (r: string) =>
    r === "ADMIN" ? 0 : r === "AUTHORIZED" ? 1 : 2;

  const allMatching = await prisma.user.findMany({
    where,
    include: { _count: { select: { listings: true } } },
  });
  allMatching.sort((a, b) => {
    if (sort === "role") {
      const rr = roleRank(a.role) - roleRank(b.role);
      if (rr !== 0) return rr;
    }
    const sr = statusRank(a.status) - statusRank(b.status);
    if (sr !== 0) return sr;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const users = allMatching.slice(skip, skip + ADMIN_PAGE_SIZE);

  const queryParams = {
    sort: sort === "role" ? "role" : undefined,
    role: role === "ALL" ? undefined : role,
    q: q || undefined,
  };

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
          회원 관리
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
          신규 가입은 승인 후에만 로그인할 수 있습니다. 한 페이지에{" "}
          {ADMIN_PAGE_SIZE}개씩 표시됩니다.
          {pendingCount > 0 ? (
            <>
              {" "}
              · 승인 대기{" "}
              <span className="font-medium text-amber-800">
                {pendingCount.toLocaleString("ko-KR")}명
              </span>
            </>
          ) : null}
        </p>
      </div>

      <UserSearchBar
        q={q}
        role={role === "ALL" ? undefined : role}
        sort={sort}
      />
      <RoleFilter current={role} counts={counts} sort={sort} q={q} />

      <div className={adminTableScrollClass}>
        <table className={`${adminTableClass} min-w-[980px] text-[13px]`}>
          <colgroup>
            <col style={{ width: "11%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "21%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className={adminThCompactClass}>이름</th>
              <th className={adminThCompactClass}>아이디</th>
              <th className={adminThCompactClass}>연락처</th>
              <th className={`${adminThCompactClass} text-center`}>매물</th>
              <th className={adminThCompactClass}>가입일</th>
              <th className={adminThCompactClass}>역할</th>
              <th className={adminThCompactClass}>승인</th>
              <th className={adminThCompactClass}>비고</th>
              <th className={`${adminThCompactClass} admin-th-actions text-right`}>
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === session?.user.id;
              const isPending = user.status === "PENDING";
              return (
                <tr
                  key={user.id}
                  className={
                    isPending
                      ? "bg-amber-50/90 hover:bg-amber-50"
                      : "hover:bg-neutral-50/70"
                  }
                >
                  <td
                    className={`${adminTdCompactClass} ${
                      isPending
                        ? "border-l-2 border-l-amber-500"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        className="truncate font-medium text-neutral-800"
                        title={user.name}
                      >
                        {user.name}
                      </span>
                      {isSelf ? (
                        <span className="shrink-0 text-[11px] text-neutral-400">
                          본인
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className={`${adminTdCompactClass} truncate text-neutral-600`}
                    title={user.email}
                  >
                    {user.email}
                  </td>
                  <td
                    className={`${adminTdCompactClass} truncate tabular-nums text-neutral-700`}
                    title={user.phone || undefined}
                  >
                    {user.phone || (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td
                    className={`${adminTdCompactClass} text-center tabular-nums text-neutral-700`}
                  >
                    {user._count.listings}
                  </td>
                  <td
                    className={`${adminTdCompactClass} whitespace-nowrap text-[12.5px] text-neutral-500`}
                  >
                    {user.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className={`${adminTdCompactClass} whitespace-nowrap`}>
                    <span className="inline-flex rounded bg-neutral-100 px-1.5 py-0.5 text-[11.5px] text-neutral-700">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className={adminTdCompactClass}>
                    <span
                      className={`inline-flex rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${
                        user.status === "APPROVED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : user.status === "PENDING"
                            ? "border-amber-300 bg-amber-100 text-amber-900"
                            : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {user.status === "APPROVED"
                        ? "승인"
                        : user.status === "PENDING"
                          ? "대기"
                          : "거절"}
                    </span>
                  </td>
                  <td className={adminTdCompactClass}>
                    <UserAdminNoteButton
                      userId={user.id}
                      userName={user.name}
                      note={user.adminNote}
                      compact
                    />
                  </td>
                  <td className={`${adminTdActionsCompactClass} admin-td-actions`}>
                    <div className="flex flex-nowrap items-center justify-end gap-1">
                      {user.role !== "ADMIN" ? (
                        <UserStatusControls
                          userId={user.id}
                          status={user.status}
                          disabled={isSelf}
                          compact
                        />
                      ) : null}
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className={adminActionBtnCompactClass}
                      >
                        수정
                      </Link>
                      <DeleteUserButton
                        userId={user.id}
                        userName={user.name}
                        listingCount={user._count.listings}
                        disabled={isSelf}
                        compact
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-[13px] text-neutral-500"
                >
                  {q
                    ? "검색 조건에 맞는 회원이 없습니다."
                    : role === "ALL"
                      ? "등록된 회원이 없습니다."
                      : `${ROLE_LABELS[role]} 회원이 없습니다.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/users"
        page={currentPage}
        total={total}
        pageSize={ADMIN_PAGE_SIZE}
        params={queryParams}
      />
    </div>
  );
}
