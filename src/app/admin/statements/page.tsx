import Link from "next/link";
import { StatementDeleteButton } from "@/components/admin/StatementDeleteButton";
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

export default async function AdminStatementsPage() {
  const statements = await prisma.transactionStatement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-medium tracking-wide text-neutral-800">
            거래명세서
          </h2>
          <p className="mt-1 text-[12.5px] tracking-wide text-neutral-500">
            매물 연동 명세서를 작성·저장하고 출력 또는 이미지로 저장합니다.
          </p>
        </div>
        <Link
          href="/admin/statements/new"
          className="inline-flex h-9 items-center rounded-md bg-neutral-800 px-3.5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-700"
        >
          + 새 명세서
        </Link>
      </div>

      {statements.length === 0 ? (
        <p className="px-5 py-10 text-[13.5px] tracking-wide text-neutral-500">
          저장된 거래명세서가 없습니다. 새 명세서를 작성해 주세요.
        </p>
      ) : (
        <div className={adminTableScrollClass}>
          <table className={`${adminTableClass} min-w-[860px]`}>
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
              {statements.map((s) => (
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
                      {s._count.items > 1
                        ? ` 외 ${s._count.items - 1}대`
                        : s._count.items === 0
                          ? ""
                          : ""}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                      {s.serialNumber}
                      {s._count.items > 1
                        ? ` · 총 ${s._count.items}대`
                        : ""}
                    </span>
                  </td>
                  <td className={adminTdClass}>{s.buyerName}</td>
                  <td className={adminTdClass}>
                    {
                      calcStatementTotals(s.amount, s.currency, s.includeVat)
                        .totalLabel
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
