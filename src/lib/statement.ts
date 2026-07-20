import type { OfferCurrency, TransactionStatement } from "@prisma/client";
import { CONTACT_PHONE, CONTACT_WHATSAPP } from "@/lib/contact";
import {
  formatOfferAmount,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";

export const STATEMENT_SELLER = {
  name: "KOREA AUTO TRADE",
  company: "주식회사 알비오토",
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_WHATSAPP,
} as const;

export const STATEMENT_BANK = {
  bankName: "KEB하나은행",
  accountNo: "676-910036-85204",
  accountHolder: "주식회사 알비오토",
} as const;

/** VAT rate applied on supply amount (공급가액) */
export const STATEMENT_VAT_RATE = 0.1;

export type StatementView = Pick<
  TransactionStatement,
  | "id"
  | "statementNo"
  | "listingId"
  | "vehicleLabel"
  | "vin"
  | "serialNumber"
  | "vehicleNumber"
  | "buyerName"
  | "buyerPhone"
  | "buyerAddress"
  | "amount"
  | "currency"
  | "issueDate"
  | "notes"
>;

export function formatStatementAmount(
  amount: string,
  currency: OfferCurrency | OfferCurrencyCode,
) {
  return formatOfferAmount(amount, currency as OfferCurrencyCode);
}

function toMoneyString(value: number, currency: OfferCurrencyCode): string {
  if (!Number.isFinite(value)) return "0";
  if (currency === "KRW") return String(Math.round(value));
  return (Math.round(value * 100) / 100).toFixed(2);
}

/** Entered amount is treated as supply amount (공급가액, before VAT). */
export function calcStatementTotals(
  amount: string,
  currency: OfferCurrency | OfferCurrencyCode,
) {
  const code = currency as OfferCurrencyCode;
  const supplyNum = Number(String(amount).replace(/,/g, ""));
  if (!Number.isFinite(supplyNum) || supplyNum < 0) {
    return {
      supply: "0",
      vat: "0",
      total: "0",
      supplyLabel: formatStatementAmount("0", code),
      vatLabel: formatStatementAmount("0", code),
      totalLabel: formatStatementAmount("0", code),
    };
  }

  const supply =
    code === "KRW"
      ? Math.round(supplyNum)
      : Math.round(supplyNum * 100) / 100;
  const vat =
    code === "KRW"
      ? Math.round(supply * STATEMENT_VAT_RATE)
      : Math.round(supply * STATEMENT_VAT_RATE * 100) / 100;
  const total =
    code === "KRW"
      ? supply + vat
      : Math.round((supply + vat) * 100) / 100;

  const supplyStr = toMoneyString(supply, code);
  const vatStr = toMoneyString(vat, code);
  const totalStr = toMoneyString(total, code);

  return {
    supply: supplyStr,
    vat: vatStr,
    total: totalStr,
    supplyLabel: formatStatementAmount(supplyStr, code),
    vatLabel: formatStatementAmount(vatStr, code),
    totalLabel: formatStatementAmount(totalStr, code),
  };
}

export type ListingOption = {
  id: string;
  serialNumber: string;
  label: string;
  vin: string | null;
  vehicleNumber: string | null;
};

export function defaultIssueDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
