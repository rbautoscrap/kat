import type { OfferCurrency, TransactionStatement } from "@prisma/client";
import { CONTACT_PHONE, CONTACT_WHATSAPP } from "@/lib/contact";
import {
  formatOfferAmount,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";

export const STATEMENT_SELLER = {
  name: "KOREA AUTO TRADE",
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_WHATSAPP,
} as const;

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
