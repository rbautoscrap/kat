import type { OfferCurrency, OverseasInvoice } from "@prisma/client";
import {
  formatOfferAmount,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";
import type { ListingOption } from "@/lib/statement";

export type InvoiceCurrency = Extract<OfferCurrencyCode, "USD" | "EUR">;

export const INVOICE_CURRENCIES: InvoiceCurrency[] = ["EUR", "USD"];

export const INVOICE_SELLER = {
  brand: "RBAUTO",
  company: "RBAUTO SCRAP",
  address: "4, Cheongsu 5-ro, Dongnam-gu, Cheonan-si, Chungcheongnam-do",
  bizNo: "436-87-00501",
  ceoKo: "이근배",
  companyKo: "주식회사 알비오토",
  addressKo: "4, Cheongsu 5-ro, Dongnam-gu, Cheonan-si, Chungcheongnam-do",
} as const;

export const INVOICE_REMITTANCE = {
  beneficiaryName: "RBAUTO",
  accountNo: "69191000178338",
  beneficiaryAddress:
    "4, Cheongsu 5-ro, Dongnam-gu, Cheonan-si, Chungcheongnam-do",
  bankName: "KEB Hana Bank",
  branchName: "Chungju",
  swiftCode: "KOEXKRSE or KOEXKRSE XXX",
  bankAddress:
    "273-47 109, Beonyeong-daero, Chungju-si, Chungcheongbuk-do, South Korea",
  bankTel: "+82 43 845 1111",
} as const;

export const INVOICE_NOTICES = [
  "If the deposit deadline is exceeded, The contract will be cancelled.",
  "You can purchase the cancelled vehicle by renewing the contract.",
  "If cancellation is repeated more than three times, Transactions will be difficult in the future.",
  "The down payment will not be refunded after 7 days of the transaction date.",
] as const;

export type InvoiceLineItem = {
  id?: string;
  listingId: string | null;
  isExtra?: boolean;
  description: string;
  regNo: string | null;
  vin: string | null;
  qty: string;
  priceKrw: string;
  rate: string;
  finalPrice: string;
  sortOrder?: number;
};

export type InvoiceView = OverseasInvoice & {
  items?: InvoiceLineItem[];
};

export function defaultInvoiceDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysToDateString(isoDate: string, days: number): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseTermsDays(terms: string): number {
  const n = Number(String(terms).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function formatTermsLabel(days: number) {
  return `${days}days`;
}

export function cleanMoney(raw: string) {
  return raw.replace(/,/g, "").replace(/\s/g, "").trim();
}

export function parseMoneyNumber(raw: string): number {
  const n = Number(cleanMoney(raw));
  return Number.isFinite(n) ? n : 0;
}

/** KRW ÷ rate → foreign amount (rounded to nearest whole unit). */
export function calcFinalFromKrw(priceKrw: string, rate: string): string {
  const krw = parseMoneyNumber(priceKrw);
  const r = parseMoneyNumber(rate);
  if (krw <= 0 || r <= 0) return "";
  return String(Math.round(krw / r));
}

export function sumFinalPrices(lines: { finalPrice: string }[]): string {
  const sum = lines.reduce((acc, line) => acc + parseMoneyNumber(line.finalPrice), 0);
  return String(sum);
}

export function formatKrw(amount: string) {
  const n = parseMoneyNumber(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `₩ ${n.toLocaleString("en-US")}`;
}

export function formatFx(
  amount: string,
  currency: OfferCurrency | OfferCurrencyCode,
) {
  return formatOfferAmount(cleanMoney(amount) || "0", currency as OfferCurrencyCode);
}

export function formatRate(rate: string) {
  const n = parseMoneyNumber(rate);
  if (!Number.isFinite(n) || n <= 0) return rate;
  return n.toLocaleString("en-US");
}

export function getInvoiceLines(invoice: InvoiceView): InvoiceLineItem[] {
  const items = invoice.items ?? [];
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function currencyColumnLabel(currency: OfferCurrency | OfferCurrencyCode) {
  return `FINAL PRICE(${currency})`;
}

export function amountLabel(currency: OfferCurrency | OfferCurrencyCode) {
  return `(${currency}) Amount`;
}

export function totalLabel(currency: OfferCurrency | OfferCurrencyCode) {
  return `(${currency}) TOTAL`;
}

export type { ListingOption };

export function invoiceExtraKey(id: string) {
  return `extra:${id}`;
}

export function isInvoiceExtraKey(value: string) {
  return value.startsWith("extra:");
}

export function newInvoiceExtraKey() {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return invoiceExtraKey(id);
}
