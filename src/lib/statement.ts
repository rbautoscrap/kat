import type { OfferCurrency, TransactionStatement } from "@prisma/client";
import { CONTACT_PHONE, CONTACT_WHATSAPP } from "@/lib/contact";
import {
  formatOfferAmount,
  type OfferCurrencyCode,
} from "@/lib/purchase-offer";

export type StatementLocale = "ko" | "en";

export const STATEMENT_SELLER = {
  name: "KOREA AUTO TRADE",
  company: "주식회사 알비오토",
  companyEn: "RB Auto Co., Ltd.",
  phone: CONTACT_PHONE,
  whatsapp: CONTACT_WHATSAPP,
} as const;

export const STATEMENT_BANK = {
  bankName: "KEB하나은행",
  bankNameEn: "KEB Hana Bank",
  accountNo: "676-910036-85204",
  accountHolder: "주식회사 알비오토",
  accountHolderEn: "RB Auto Co., Ltd.",
} as const;

/** VAT rate applied on supply amount when includeVat is true */
export const STATEMENT_VAT_RATE = 0.1;

export type StatementLineItem = {
  id?: string;
  listingId: string;
  vehicleLabel: string;
  vin: string | null;
  serialNumber: string;
  vehicleNumber: string | null;
  amount: string;
  sortOrder?: number;
};

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
  | "includeVat"
  | "issueDate"
  | "notes"
> & {
  items?: StatementLineItem[];
};

export const STATEMENT_COPY = {
  ko: {
    title: "거래명세서",
    subtitle: "Transaction Statement",
    statementNo: "명세서 번호",
    issueDate: "발행일",
    seller: "공급자",
    buyer: "공급받는자",
    phone: "연락처",
    address: "주소",
    item: "품목",
    detail: "상세",
    qty: "수량",
    supplyAmount: "공급가액",
    vat: "부가세",
    vatZero: "부가세 (영세율)",
    total: "합계",
    bank: "입금 계좌",
    bankName: "은행",
    accountNo: "계좌번호",
    accountHolder: "예금주",
    notes: "비고",
    serial: "시리얼",
    vehicleNo: "차량번호",
    footerVat: (pct: number) =>
      `본 명세서는 ${STATEMENT_SELLER.name}(${STATEMENT_SELLER.company})에서 발행한 거래 확인용 문서입니다. 합계 금액에는 부가세 ${pct}%가 포함되어 있습니다.`,
    footerNoVat: `본 명세서는 ${STATEMENT_SELLER.name}(${STATEMENT_SELLER.company})에서 발행한 거래 확인용 문서입니다. 본 거래는 영세율(부가세 미적용)로 작성되었습니다.`,
  },
  en: {
    title: "Transaction Statement",
    subtitle: "거래명세서",
    statementNo: "Statement No.",
    issueDate: "Issue Date",
    seller: "Supplier",
    buyer: "Buyer",
    phone: "Phone",
    address: "Address",
    item: "Item",
    detail: "Details",
    qty: "Qty",
    supplyAmount: "Supply Amount",
    vat: "VAT",
    vatZero: "VAT (Zero-rated)",
    total: "Total",
    bank: "Bank Account",
    bankName: "Bank",
    accountNo: "Account No.",
    accountHolder: "Account Holder",
    notes: "Notes",
    serial: "Serial",
    vehicleNo: "Plate No.",
    footerVat: (pct: number) =>
      `This statement is issued by ${STATEMENT_SELLER.name} (${STATEMENT_SELLER.companyEn}) for transaction confirmation. The total includes ${pct}% VAT.`,
    footerNoVat: `This statement is issued by ${STATEMENT_SELLER.name} (${STATEMENT_SELLER.companyEn}) for transaction confirmation. This transaction is zero-rated (VAT not applied).`,
  },
} as const;

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

/** Resolve line items — falls back to legacy single-listing fields. */
export function getStatementLines(statement: StatementView): StatementLineItem[] {
  if (statement.items && statement.items.length > 0) {
    return [...statement.items].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }
  return [
    {
      listingId: statement.listingId,
      vehicleLabel: statement.vehicleLabel,
      vin: statement.vin,
      serialNumber: statement.serialNumber,
      vehicleNumber: statement.vehicleNumber,
      amount: statement.amount,
      sortOrder: 0,
    },
  ];
}

export function sumLineAmounts(
  lines: Array<{ amount: string }>,
  currency: OfferCurrency | OfferCurrencyCode,
): string {
  const code = currency as OfferCurrencyCode;
  let sum = 0;
  for (const line of lines) {
    const n = Number(String(line.amount).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) sum += n;
  }
  return toMoneyString(sum, code);
}

/** Entered/summed amount is supply amount. VAT applied only when includeVat is true. */
export function calcStatementTotals(
  amount: string,
  currency: OfferCurrency | OfferCurrencyCode,
  includeVat = true,
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
      includeVat,
    };
  }

  const supply =
    code === "KRW"
      ? Math.round(supplyNum)
      : Math.round(supplyNum * 100) / 100;

  let vat = 0;
  if (includeVat) {
    vat =
      code === "KRW"
        ? Math.round(supply * STATEMENT_VAT_RATE)
        : Math.round(supply * STATEMENT_VAT_RATE * 100) / 100;
  }

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
    includeVat,
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
