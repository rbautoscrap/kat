import { DailySalesReport } from "@/components/admin/DailySalesReport";
import { DailySalesToolbar } from "@/components/admin/DailySalesToolbar";
import { koreaTodayDate } from "@/lib/format-korea-time";
import { prisma } from "@/lib/prisma";
import {
  buildSaleRow,
  resolveSaleCost,
  saleItemKey,
  sortSaleRowsByRecentDate,
  type DailySaleRow,
} from "@/lib/sales-daily";
import { isStatementExtraLine } from "@/lib/statement";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ date?: string }>;
};

function parseDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return koreaTodayDate();
}

export default async function AdminDailySalesPage({ searchParams }: Props) {
  const params = await searchParams;
  const date = parseDate(params.date);

  const [statements, invoices] = await Promise.all([
    prisma.transactionStatement.findMany({
      where: { issueDate: { lte: date } },
      orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            listing: {
              select: {
                costPrice: true,
                auctionPrice: true,
                incidentalCost: true,
              },
            },
          },
        },
      },
    }),
    prisma.overseasInvoice.findMany({
      where: { invoiceDate: { lte: date } },
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            listing: {
              select: {
                costPrice: true,
                auctionPrice: true,
                incidentalCost: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const allRows: DailySaleRow[] = [];
  for (const statement of statements) {
    for (const item of statement.items) {
      allRows.push(
        buildSaleRow({
          source: "statement",
          itemId: saleItemKey("statement", item.id),
          statementId: statement.id,
          statementNo: statement.statementNo,
          issueDate: statement.issueDate,
          buyerName: statement.buyerName,
          vehicleNumber: item.vehicleNumber,
          vehicleLabel: item.vehicleLabel,
          isExtra: isStatementExtraLine(item),
          currency: statement.currency,
          includeVat: statement.includeVat,
          supplyAmount: item.amount,
          costAmount: resolveSaleCost({
            isExtra: isStatementExtraLine(item),
            costPrice: item.listing?.costPrice,
            auctionPrice: item.listing?.auctionPrice,
            incidentalCost: item.listing?.incidentalCost,
          }),
          paidAmount: item.paidAmount,
          shipmentType: item.shipmentType,
          shippedDate: item.shippedDate,
          reportNote: item.reportNote,
          inReceivableLedger: item.inReceivableLedger,
        }),
      );
    }
  }
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      allRows.push(
        buildSaleRow({
          source: "invoice",
          itemId: saleItemKey("invoice", item.id),
          statementId: invoice.id,
          statementNo: invoice.invoiceNo,
          issueDate: invoice.invoiceDate,
          buyerName: invoice.consignee,
          vehicleNumber: item.regNo,
          vehicleLabel: item.description,
          isExtra: item.isExtra,
          currency: invoice.currency,
          includeVat: false,
          supplyAmount: item.finalPrice,
          costAmount: resolveSaleCost({
            isExtra: item.isExtra,
            costPrice: item.listing?.costPrice,
            auctionPrice: item.listing?.auctionPrice,
            incidentalCost: item.listing?.incidentalCost,
          }),
          paidAmount: item.paidAmount,
          shipmentType: item.shipmentType,
          shippedDate: item.shippedDate,
          reportNote: item.reportNote,
          inReceivableLedger: item.inReceivableLedger,
        }),
      );
    }
  }

  const daySales = allRows.filter(
    (row) =>
      row.issueDate === date &&
      row.currency === "KRW" &&
      row.source === "statement",
  );
  const receivables = allRows.filter(
    (row) => row.currency === "KRW" && row.inReceivableLedger,
  );
  const fxReceivables = allRows.filter(
    (row) => row.currency !== "KRW" && row.inReceivableLedger,
  );
  const addableKrw = sortSaleRowsByRecentDate(
    allRows.filter((row) => row.currency === "KRW" && !row.inReceivableLedger),
  );
  const addableFx = sortSaleRowsByRecentDate(
    allRows.filter((row) => row.currency !== "KRW" && !row.inReceivableLedger),
  );

  return (
    <div className="daily-sales-page">
      <div className="daily-sales-head daily-sales-no-print">
        <div>
          <h2 className="text-[17px] font-bold tracking-tight text-neutral-900">
            일일판매현황
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            오늘부터 작성한 거래명세서·해외 인보이스가 자동으로 반영됩니다. 아래
            미리보기에서 입금·송품을 수정하고 출력 또는 이미지로 저장하세요.
          </p>
        </div>
        <DailySalesToolbar date={date} />
      </div>

      <DailySalesReport
        key={date}
        date={date}
        daySales={daySales}
        receivables={receivables}
        fxReceivables={fxReceivables}
        addableKrw={addableKrw}
        addableFx={addableFx}
      />
    </div>
  );
}
