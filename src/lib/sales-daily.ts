import type { OfferCurrency } from "@prisma/client";
import { koreaTodayDate } from "@/lib/format-korea-time";
import { STATEMENT_VAT_RATE, calcStatementTotals } from "@/lib/statement";
import { formatOfferAmount, type OfferCurrencyCode } from "@/lib/purchase-offer";

export const SALE_SHIPMENT_TYPES = [
  "미결재",
  "일부결재",
  "결재완료",
  "보류",
  "취소",
] as const;

export const SALE_SHIPMENT_DONE = "결재완료";

export type SaleShipmentType = (typeof SALE_SHIPMENT_TYPES)[number];

export function isSettledSaleRow(row: { shipmentType: string }) {
  return row.shipmentType === SALE_SHIPMENT_DONE;
}

export function displayShipmentType(value: string | null | undefined) {
  const current = value?.trim() ?? "";
  if ((SALE_SHIPMENT_TYPES as readonly string[]).includes(current)) {
    return current as SaleShipmentType;
  }
  return "미결재";
}

export type DailySaleSource = "statement" | "invoice";

export type SalesDailyView = "daily" | "month" | "recv" | "fx";

export function parseSalesDailyView(value?: string): SalesDailyView {
  if (value === "month" || value === "recv" || value === "fx") return value;
  return "daily";
}

export type DailySaleRow = {
  source: DailySaleSource;
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
  cost: string;
  profit: string;
  paidAmount: string;
  remaining: string;
  shipmentType: string;
  shippedDate: string;
  reportNote: string;
  inReceivableLedger: boolean;
  amountKrw: string;
};

export type DailySaleTotals = {
  supply: number;
  vat: number;
  paid: number;
  remaining: number;
  total: number;
  cost: number;
  profit: number;
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

function digitsMoney(value: string | null | undefined) {
  if (!value) return 0;
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

export function resolveSaleCost(args: {
  isExtra?: boolean;
  costPrice?: string | null;
  auctionPrice?: string | null;
  incidentalCost?: string | null;
}) {
  if (args.isExtra) return 0;
  const stored = digitsMoney(args.costPrice);
  if (stored > 0) return stored;
  return digitsMoney(args.auctionPrice) + digitsMoney(args.incidentalCost);
}

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

export function formatSaleMoneyInput(
  value: string,
  currency: OfferCurrency,
) {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return "";
  if (currency === "KRW") {
    const digits = cleaned.replace(/[^\d]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("ko-KR");
  }
  const [intPart = "", ...rest] = cleaned.replace(/[^\d.]/g, "").split(".");
  const formattedInt = intPart
    ? Number(intPart).toLocaleString("en-US")
    : cleaned.includes(".")
      ? "0"
      : "";
  if (!cleaned.includes(".")) return formattedInt;
  return `${formattedInt}.${rest.join("").slice(0, 2)}`;
}

export function remainingOf(
  total: number,
  paid: number,
  currency: OfferCurrency,
) {
  return roundMoney(Math.max(0, total - paid), currency);
}

export function shouldAutoListReceivable(docDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(docDate) && docDate >= koreaTodayDate();
}

export function saleItemKey(source: DailySaleSource, id: string) {
  return source === "invoice" ? `i:${id}` : `s:${id}`;
}

export function sortSaleRowsByRecentDate(rows: DailySaleRow[]) {
  return [...rows].sort((a, b) => {
    if (a.issueDate !== b.issueDate) {
      return b.issueDate.localeCompare(a.issueDate);
    }
    if (a.statementNo !== b.statementNo) {
      return b.statementNo.localeCompare(a.statementNo);
    }
    return b.itemId.localeCompare(a.itemId);
  });
}

export function parseSaleItemKey(raw: string): {
  source: DailySaleSource;
  id: string;
} | null {
  const value = raw.trim();
  if (value.startsWith("i:")) {
    const id = value.slice(2);
    return id ? { source: "invoice", id } : null;
  }
  if (value.startsWith("s:")) {
    const id = value.slice(2);
    return id ? { source: "statement", id } : null;
  }
  return value ? { source: "statement", id: value } : null;
}

export function saleDocHref(row: Pick<DailySaleRow, "source" | "statementId">) {
  return row.source === "invoice"
    ? `/admin/invoices/${row.statementId}`
    : `/admin/statements/${row.statementId}`;
}

export function buildSaleRow(args: {
  source?: DailySaleSource;
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
  costAmount?: number | string | null;
  paidAmount: string | null | undefined;
  shipmentType: string | null | undefined;
  shippedDate: string | null | undefined;
  reportNote: string | null | undefined;
  inReceivableLedger?: boolean;
  amountKrw?: string | null;
}): DailySaleRow {
  const totals = calcStatementTotals(
    args.supplyAmount,
    args.currency,
    args.includeVat,
  );
  const paid = roundMoney(moneyToNumber(args.paidAmount), args.currency);
  const total = moneyToNumber(totals.total);
  const remaining = remainingOf(total, paid, args.currency);
  const supply = moneyToNumber(totals.supply);
  const cost = roundMoney(moneyToNumber(String(args.costAmount ?? 0)), args.currency);
  const profit = roundMoney(supply - cost, args.currency);

  return {
    source: args.source ?? "statement",
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
    cost: String(cost),
    profit: String(profit),
    paidAmount: args.paidAmount?.trim() ? String(paid) : "",
    remaining: String(remaining),
    shipmentType: args.shipmentType?.trim() ?? "",
    shippedDate: args.shippedDate?.trim() ?? "",
    reportNote: args.reportNote?.trim() ?? "",
    inReceivableLedger: args.inReceivableLedger === true,
    amountKrw: String(
      args.currency === "KRW"
        ? total
        : roundMoney(moneyToNumber(String(args.amountKrw ?? 0)), "KRW"),
    ),
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
      acc.cost += moneyToNumber(row.cost);
      acc.profit += moneyToNumber(row.profit);
      return acc;
    },
    { supply: 0, vat: 0, paid: 0, remaining: 0, total: 0, cost: 0, profit: 0 },
  );

  return {
    supply: roundMoney(totals.supply, currency),
    vat: roundMoney(totals.vat, currency),
    paid: roundMoney(totals.paid, currency),
    remaining: roundMoney(totals.remaining, currency),
    total: roundMoney(totals.total, currency),
    cost: roundMoney(totals.cost, currency),
    profit: roundMoney(totals.profit, currency),
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
