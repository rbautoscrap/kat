import type { OfferCurrency } from "@prisma/client";
import { STATEMENT_VAT_RATE, calcStatementTotals } from "@/lib/statement";
import { formatOfferAmount, type OfferCurrencyCode } from "@/lib/purchase-offer";

export const SALE_SHIPMENT_TYPES = [
  "",
  "완납",
  "수출",
  "국내",
  "미선적",
] as const;

export type SaleShipmentType = (typeof SALE_SHIPMENT_TYPES)[number];

export type DailySaleRow = {
  itemId: string;
  statementId: string;
  statementNo: string;
  issueDate: string;
  buyerName: string;
  vehicleNumber: string;
  vehicleLabel: string;
  isExtra: boolean;
  currency: OfferCurrency;
  supply: string;
  vat: string;
  total: string;
  paidAmount: string;
  remaining: string;
  shipmentType: string;
  shippedDate: string;
  reportNote: string;
};

export type DailySaleTotals = {
  supply: number;
  vat: number;
  paid: number;
  remaining: number;
  total: number;
};

export type DailySaleKpis = {
  daySales: number;
  dayPaid: number;
  expectedReceivable: number;
  outstandingBook: number;
  fxReceivable: number;
};

export type BuyerSummary = {
  buyerName: string;
  total: number;
  remaining: number;
  count: number;
};

function moneyToNumber(value: string | null | undefined) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function parseSaleMoney(value: string | null | undefined) {
  return moneyToNumber(value);
}

function roundMoney(value: number, currency: OfferCurrency) {
  if (!Number.isFinite(value)) return 0;
  if (currency === "KRW") return Math.round(value);
  return Math.round(value * 100) / 100;
}

export function formatSaleMoney(value: number, currency: OfferCurrency) {
  const n = roundMoney(value, currency);
  if (currency === "KRW") {
    return n.toLocaleString("ko-KR");
  }
  return formatOfferAmount(
    n.toFixed(2),
    currency as OfferCurrencyCode,
  );
}

export function remainingOf(
  total: number,
  paid: number,
  currency: OfferCurrency,
) {
  return roundMoney(Math.max(0, total - paid), currency);
}

export function buildSaleRow(args: {
  itemId: string;
  statementId: string;
  statementNo: string;
  issueDate: string;
  buyerName: string;
  vehicleNumber: string | null | undefined;
  vehicleLabel: string;
  isExtra: boolean;
  currency: OfferCurrency;
  includeVat: boolean;
  supplyAmount: string;
  paidAmount: string | null | undefined;
  shipmentType: string | null | undefined;
  shippedDate: string | null | undefined;
  reportNote: string | null | undefined;
}): DailySaleRow {
  const totals = calcStatementTotals(
    args.supplyAmount,
    args.currency,
    args.includeVat,
  );
  const paid = roundMoney(moneyToNumber(args.paidAmount), args.currency);
  const total = moneyToNumber(totals.total);
  const remaining = remainingOf(total, paid, args.currency);

  return {
    itemId: args.itemId,
    statementId: args.statementId,
    statementNo: args.statementNo,
    issueDate: args.issueDate,
    buyerName: args.buyerName.trim() || "—",
    vehicleNumber: (args.vehicleNumber ?? "").trim(),
    vehicleLabel: args.vehicleLabel.trim() || "—",
    isExtra: args.isExtra,
    currency: args.currency,
    supply: totals.supply,
    vat: totals.vat,
    total: totals.total,
    paidAmount: args.paidAmount?.trim() ? String(paid) : "",
    remaining: String(remaining),
    shipmentType: args.shipmentType?.trim() ?? "",
    shippedDate: args.shippedDate?.trim() ?? "",
    reportNote: args.reportNote?.trim() ?? "",
  };
}

export function sumSaleRows(
  rows: DailySaleRow[],
  currency: OfferCurrency = "KRW",
): DailySaleTotals {
  const totals = rows.reduce(
    (acc, row) => {
      acc.supply += moneyToNumber(row.supply);
      acc.vat += moneyToNumber(row.vat);
      acc.paid += moneyToNumber(row.paidAmount);
      acc.remaining += moneyToNumber(row.remaining);
      acc.total += moneyToNumber(row.total);
      return acc;
    },
    { supply: 0, vat: 0, paid: 0, remaining: 0, total: 0 },
  );

  return {
    supply: roundMoney(totals.supply, currency),
    vat: roundMoney(totals.vat, currency),
    paid: roundMoney(totals.paid, currency),
    remaining: roundMoney(totals.remaining, currency),
    total: roundMoney(totals.total, currency),
  };
}

export function isUnpaidRow(row: DailySaleRow) {
  return parseSaleMoney(row.remaining) > 0;
}

export function buyerSummaries(rows: DailySaleRow[]): BuyerSummary[] {
  const map = new Map<string, BuyerSummary>();
  for (const row of rows) {
    const key = row.buyerName;
    const current = map.get(key) ?? {
      buyerName: key,
      total: 0,
      remaining: 0,
      count: 0,
    };
    current.total += parseSaleMoney(row.total);
    current.remaining += parseSaleMoney(row.remaining);
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function mmdd(isoDate: string) {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  return `${m[2]}/${m[3]}`;
}

export { STATEMENT_VAT_RATE };
