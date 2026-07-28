import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { InvoiceDeleteButton } from "@/components/admin/InvoiceDeleteButton";
import { NewInvoiceModal } from "@/components/admin/NewInvoiceModal";
import { AdminPagination } from "@/components/admin/AdminPagination";
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
import {
  defaultInvoiceDate,
  formatFx,
  type ListingOption,
} from "@/lib/overseas-invoice";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
};

export default async function AdminInvoicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);

  const where: Prisma.OverseasInvoiceWhereInput = q
    ? {
        OR: [
          { invoiceNo: { contains: q } },
          { consignee: { contains: q } },
          { company: { contains: q } },
          { businessNo: { contains: q } },
          { finalDestination: { contains: q } },
          {
            items: {
              some: {
                OR: [
                  { description: { contains: q } },
                  { vin: { contains: q } },
                  { regNo: { contains: q } },
                ],
              },
            },
          },
        ],
      }
    : {};

  const total = await prisma.overseasInvoice.count({ where });
  const pages = totalPages(total, ADMIN_PAGE_SIZE);
  const currentPage = Math.min(page, pages);

  const [invoices, listingRows] = await Promise.all([
    prisma.overseasInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: ADMIN_PAGE_SIZE,
      skip: (currentPage - 1) * ADMIN_PAGE_SIZE,
      include: {
        _count: { select: { items: true } },
      },
    }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        serialNumber: true,
        title: true,
        year: true,
        make: true,
        model: true,
        vin: true,
        vehicleNumber: true,
      },
    }),
  ]);

  const listings: ListingOption[] = listingRows.map((l) => ({
    id: l.id,
    serialNumber: l.serialNumber,
    label: l.title || `${l.year} ${l.make} ${l.model}`,
    vin: l.vin,
    vehicleNumber: l.vehicleNumber,
  }));

  const listParams = {
    q: q || undefined,
  };

  return (
    <div className="rounded-sm border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-neutral-900">
            해외 인보이스
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            영문 Commercial Invoice를 작성·저장하고 출력 또는 이미지로
            저장합니다. 페이지당 {ADMIN_PAGE_SIZE}건.
          </p>
        </div>
        <NewInvoiceModal
          listings={listings}
          defaultInvoiceDate={defaultInvoiceDate()}
        />
      </div>

      <form
        method="get"
        className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Invoice#, Consignee, VIN…"
          className="h-9 min-w-[200px] flex-1 rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-[13px] font-medium text-neutral-700"
        >
          검색
        </button>
      </form>

      {total === 0 ? (
        <p className="px-5 py-10 text-[13.5px] text-neutral-500">
          {q
            ? "검색 조건에 맞는 인보이스가 없습니다."
            : "저장된 해외 인보이스가 없습니다. 새 인보이스를 작성해 주세요."}
        </p>
      ) : (
        <>
          <div className={adminTableScrollClass}>
            <table className={`${adminTableClass} min-w-[880px]`}>
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={adminThClass}>Invoice#</th>
                  <th className={adminThClass}>Date</th>
                  <th className={adminThClass}>Consignee</th>
                  <th className={adminThClass}>Destination</th>
                  <th className={adminThClass}>Amount</th>
                  <th className={adminThClass}>Items</th>
                  <th className={`${adminThClass} admin-th-actions`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className={adminTdClass}>
                      <span className="font-medium text-neutral-800">
                        {inv.invoiceNo}
                      </span>
                    </td>
                    <td className={adminTdClass}>{inv.invoiceDate}</td>
                    <td className={adminTdClass}>
                      <span className="block truncate font-medium text-neutral-800">
                        {inv.consignee}
                      </span>
                      {inv.company ? (
                        <span className="mt-0.5 block truncate text-[12px] text-neutral-500">
                          {inv.company}
                        </span>
                      ) : null}
                    </td>
                    <td className={adminTdClass}>
                      {inv.finalDestination || "—"}
                    </td>
                    <td className={adminTdClass}>
                      {formatFx(inv.amount, inv.currency)}
                    </td>
                    <td className={adminTdClass}>{inv._count.items}</td>
                    <td className={`${adminTdActionsClass} admin-td-actions`}>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className={adminActionBtnClass}
                        >
                          열기
                        </Link>
                        <InvoiceDeleteButton id={inv.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            basePath="/admin/invoices"
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
