import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { StatementDeleteButton } from "@/components/admin/StatementDeleteButton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import {
  StatementListToolbar,
  type StatementSort,
  type StatementVatFilter,
} from "@/components/admin/StatementListToolbar";
import {
  ADMIN_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin-pagination";
import {
  adminActionBtnClass,
  adminTableClass,
  adminTableScrollClass,
  adminTdActionsClass,
  adminTdClass,
  adminThClass,
} from "@/lib/admin-ui";
import { prisma } from "@/lib/prisma";
import { calcStatementTotals } from "@/lib/statement";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    vat?: string;
  }>;
};

function parseSort(value?: string): StatementSort {
  if (
    value === "oldest" ||
    value === "issue_desc" ||
    value === "issue_asc" ||
    value === "buyer_asc" ||
    value === "buyer_desc" ||
    value === "no_desc" ||
    value === "no_asc"
  ) {
    return value;
  }
  return "newest";
}

function parseVat(value?: string): StatementVatFilter {
  if (value === "INCLUDE" || value === "ZERO") return value;
  return "ALL";
}

function orderByForSort(
  sort: StatementSort,
): Prisma.TransactionStatementOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "issue_desc":
      return { issueDate: "desc" };
    case "issue_asc":
      return { issueDate: "asc" };
    case "buyer_asc":
      return { buyerName: "asc" };
    case "buyer_desc":
      return { buyerName: "desc" };
    case "no_desc":
      return { statementNo: "desc" };
    case "no_asc":
      return { statementNo: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export default async function AdminStatementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = parseSort(params.sort);
  const vat = parseVat(params.vat);
  const page = parsePage(params.page);

  const where: Prisma.TransactionStatementWhereInput = {
    AND: [
      vat === "INCLUDE"
        ? { includeVat: true }
        : vat === "ZERO"
          ? { includeVat: false }
          : {},
      q
        ? {
            OR: [
              { statementNo: { contains: q } },
              { buyerName: { contains: q } },
              { vehicleLabel: { contains: q } },
              { serialNumber: { contains: q } },
              { buyerPhone: { contains: q } },
              { notes: { contains: q } },
              {
                items: {
                  some: {
                    OR: [
                      { vehicleLabel: { contains: q } },
                      { serialNumber: { contains: q } },
                      { vin: { contains: q } },
                      { vehicleNumber: { contains: q } },
                    ],
                  },
                },
              },
            ],
          }
        : {},
    ],
  };

  const total = await prisma.transactionStatement.count({ where });
  const pages = totalPages(total, ADMIN_PAGE_SIZE);
  const currentPage = Math.min(page, pages);

  const statements = await prisma.transactionStatement.findMany({
    where,
    orderBy: orderByForSort(sort),
    take: ADMIN_PAGE_SIZE,
    skip: (currentPage - 1) * ADMIN_PAGE_SIZE,
    include: {
      _count: { select: { items: true } },
    },
  });

  const listParams = {
    q: q || undefined,
    sort: sort === "newest" ? undefined : sort,
    vat: vat === "ALL" ? undefined : vat,
  };

  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            거래명세서
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            매물 연동 명세서를 작성·저장하고 출력 또는 이미지로 저장합니다. 페이지당{" "}
            {ADMIN_PAGE_SIZE}건.
          </p>
        </div>
        <Link
          href="/admin/statements/new"
          className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium text-white transition hover:bg-neutral-700"
        >
          + 새 명세서
        </Link>
      </div>

      <StatementListToolbar q={q} sort={sort} vat={vat} />

      {total === 0 ? (
        <p className="px-5 py-10 text-[13.5px] text-neutral-500">
          {q || vat !== "ALL"
            ? "검색 조건에 맞는 거래명세서가 없습니다."
            : "저장된 거래명세서가 없습니다. 새 명세서를 작성해 주세요."}
        </p>
      ) : (
        <>
          <div className={adminTableScrollClass}>
            <table className={`${adminTableClass} min-w-[920px]`}>
              <colgroup>
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={adminThClass}>번호</th>
                  <th className={adminThClass}>발행일</th>
                  <th className={adminThClass}>매물</th>
                  <th className={adminThClass}>거래처</th>
                  <th className={adminThClass}>합계</th>
                  <th className={adminThClass}>부가세</th>
                  <th className={`${adminThClass} admin-th-actions`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => {
                  const itemCount = s._count.items;
                  const multi = itemCount > 1;
                  return (
                    <tr key={s.id}>
                      <td className={adminTdClass}>
                        <span className="font-medium text-neutral-800">
                          {s.statementNo}
                        </span>
                      </td>
                      <td className={adminTdClass}>{s.issueDate}</td>
                      <td className={adminTdClass}>
                        <span className="block truncate font-medium text-neutral-800">
                          {s.vehicleLabel}
                          {multi ? ` 외 ${itemCount - 1}대` : ""}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                          {s.serialNumber}
                          {multi ? ` · 총 ${itemCount}대` : ""}
                        </span>
                      </td>
                      <td className={adminTdClass}>{s.buyerName}</td>
                      <td className={adminTdClass}>
                        {
                          calcStatementTotals(
                            s.amount,
                            s.currency,
                            s.includeVat,
                          ).totalLabel
                        }
                      </td>
                      <td className={adminTdClass}>
                        {s.includeVat ? "포함 10%" : "영세율"}
                      </td>
                      <td className={`${adminTdActionsClass} admin-td-actions`}>
                        <div className="flex flex-wrap gap-1.5">
                          <Link
                            href={`/admin/statements/${s.id}`}
                            className={adminActionBtnClass}
                          >
                            열기
                          </Link>
                          <StatementDeleteButton id={s.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            basePath="/admin/statements"
            page={currentPage}
            total={total}
            pageSize={ADMIN_PAGE_SIZE}
            params={listParams}
          />
        </>
      )}
    </div>
  );
}
