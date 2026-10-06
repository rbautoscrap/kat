import "server-only";

import { prisma } from "@/lib/prisma";
import { parseCostPrice, resolveListingCost } from "@/lib/inventory-cost";
import { calcFinalFromKrw } from "@/lib/overseas-invoice";
import type { MonthPurchaseTotals } from "@/lib/sales-monthly";
import {
  buildSaleRow,
  resolveSaleCost,
  saleItemKey,
  type DailySaleRow,
} from "@/lib/sales-daily";
import { isStatementExtraLine } from "@/lib/statement";

type CostSource = {
  costPrice?: string | null;
  auctionPrice?: string | null;
  incidentalCost?: string | null;
  serialNumber?: string | null;
  vehicleNumber?: string | null;
  model?: string | null;
  title?: string | null;
};

function parenCodes(label: string) {
  return [...label.matchAll(/\(([A-Za-z0-9-]{3,})\)/g)].map((match) => match[1]!);
}

function lineCost(listing: CostSource | null | undefined, isExtra: boolean) {
  return resolveSaleCost({
    isExtra,
    costPrice: listing?.costPrice,
    auctionPrice: listing?.auctionPrice,
    incidentalCost: listing?.incidentalCost,
  });
}

/** Statement lines keep a label after the listing link is cleared. Match that car's cost. */
function costFromCatalog(
  listing: CostSource | null | undefined,
  isExtra: boolean,
  serialNumber: string | null | undefined,
  vehicleNumber: string | null | undefined,
  vehicleLabel: string,
  catalog: CostSource[],
) {
  const linked = lineCost(listing, isExtra);
  if (isExtra || linked > 0) return linked;

  const codes = new Set<string>();
  const serial = serialNumber?.trim();
  if (serial && serial !== "EXTRA") codes.add(serial.toLowerCase());
  for (const code of parenCodes(vehicleLabel)) codes.add(code.toLowerCase());

  const plate = vehicleNumber?.replace(/\s/g, "") ?? "";
  const hit = catalog.find((row) => {
    if (resolveListingCost(row) <= 0) return false;
    const rowSerial = row.serialNumber?.trim().toLowerCase() ?? "";
    if (rowSerial && codes.has(rowSerial)) return true;
    const blob = `${row.model ?? ""} ${row.title ?? ""}`.toLowerCase();
    for (const code of codes) {
      if (blob.includes(`(${code})`)) return true;
    }
    if (!listing && plate && row.vehicleNumber?.replace(/\s/g, "") === plate) {
      return true;
    }
    return false;
  });
  return hit ? resolveListingCost(hit) : 0;
}

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

  const catalog = await prisma.listing.findMany({
    where: {
      OR: [
        { auctionPrice: { not: null } },
        { costPrice: { not: null } },
        { incidentalCost: { not: null } },
      ],
    },
    select: {
      ...listingSelect,
      serialNumber: true,
      vehicleNumber: true,
      model: true,
      title: true,
    },
  });

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
          costAmount: costFromCatalog(
            item.listing,
            isStatementExtraLine(item),
            item.serialNumber,
            item.vehicleNumber,
            item.vehicleLabel,
            catalog,
          ),
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
      const costKrw = costFromCatalog(
        item.listing,
        item.isExtra,
        null,
        item.regNo,
        item.description,
        catalog,
      );
      const costAmount =
        invoice.currency === "KRW" || item.isExtra
          ? costKrw
          : Number(
              calcFinalFromKrw(
                String(costKrw),
                item.rate || invoice.exchangeRate,
              ) || 0,
            );
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
          costAmount,
          paidAmount: item.paidAmount,
          shipmentType: item.shipmentType,
          shippedDate: item.shippedDate,
          reportNote: item.reportNote,
          inReceivableLedger: item.inReceivableLedger,
          amountKrw: item.priceKrw,
          exchangeRate: item.rate || invoice.exchangeRate,
        }),
      );
    }
  }
  return rows;
}

/** Listings inbound (or registered if no inbound date) during the month. */
export async function loadMonthPurchases(
  month: string,
): Promise<MonthPurchaseTotals> {
  const compact = month.replace("-", "");
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(`${month}-01T00:00:00+09:00`);
  const next =
    mon === 12
      ? new Date(`${year + 1}-01-01T00:00:00+09:00`)
      : new Date(
          `${year}-${String(mon + 1).padStart(2, "0")}-01T00:00:00+09:00`,
        );

  const listings = await prisma.listing.findMany({
    where: {
      category: {
        in: ["CAR_LISTINGS", "CONSIGNMENT_SALE", "STAND_BY", "DRIVABLE_CARS"],
      },
      OR: [
        { inboundDate: { contains: compact } },
        { inboundDate: { contains: month } },
        { inboundDate: { contains: `${month.replace("-", ".")}` } },
        {
          AND: [
            {
              OR: [{ inboundDate: null }, { inboundDate: "" }],
            },
            { createdAt: { gte: start, lt: next } },
          ],
        },
      ],
    },
    select: {
      auctionPrice: true,
      incidentalCost: true,
      costPrice: true,
    },
  });

  let auction = 0;
  let incidental = 0;
  let cost = 0;
  for (const row of listings) {
    auction += parseCostPrice(row.auctionPrice);
    incidental += parseCostPrice(row.incidentalCost);
    cost += resolveListingCost(row);
  }

  return {
    count: listings.length,
    auction,
    incidental,
    cost,
  };
}
