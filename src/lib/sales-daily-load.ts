import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildSaleRow,
  resolveSaleCost,
  saleItemKey,
  type DailySaleRow,
} from "@/lib/sales-daily";
import { isStatementExtraLine } from "@/lib/statement";

export async function loadSaleRowsThrough(
  date: string,
  from?: string,
): Promise<DailySaleRow[]> {
  const listingSelect = {
    costPrice: true,
    auctionPrice: true,
    incidentalCost: true,
  } as const;
  const statementDate = from
    ? { issueDate: { gte: from, lte: date } }
    : { issueDate: { lte: date } };
  const invoiceDate = from
    ? { invoiceDate: { gte: from, lte: date } }
    : { invoiceDate: { lte: date } };

  const [statements, invoices] = await Promise.all([
    prisma.transactionStatement.findMany({
      where: statementDate,
      orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { listing: { select: listingSelect } },
        },
      },
    }),
    prisma.overseasInvoice.findMany({
      where: invoiceDate,
      orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { listing: { select: listingSelect } },
        },
      },
    }),
  ]);

  const rows: DailySaleRow[] = [];
  for (const statement of statements) {
    for (const item of statement.items) {
      rows.push(
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
      rows.push(
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
  return rows;
}
