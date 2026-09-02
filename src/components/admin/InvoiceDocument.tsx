import { Plus_Jakarta_Sans } from "next/font/google";
import {
  INVOICE_NOTICES,
  INVOICE_REMITTANCE,
  INVOICE_SELLER,
  amountLabel,
  currencyColumnLabel,
  formatFx,
  formatKrw,
  formatRate,
  getInvoiceLines,
  isInvoiceCreditLine,
  totalLabel,
  type InvoiceView,
} from "@/lib/overseas-invoice";

const invoiceFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-invoice",
});

type Props = {
  invoice: InvoiceView;
};

const REMIT_ROWS = [
  ["Beneficiary Name", INVOICE_REMITTANCE.beneficiaryName],
  ["Beneficiary Account No.", INVOICE_REMITTANCE.accountNo],
  ["Beneficiary Address", INVOICE_REMITTANCE.beneficiaryAddress],
  ["Bank Name", INVOICE_REMITTANCE.bankName],
  ["Branch Name", INVOICE_REMITTANCE.branchName],
  ["Swift Code", INVOICE_REMITTANCE.swiftCode],
  ["Bank Address", INVOICE_REMITTANCE.bankAddress],
  ["Bank Telephone no.", INVOICE_REMITTANCE.bankTel],
] as const;

export function InvoiceDocument({ invoice }: Props) {
  const lines = getInvoiceLines(invoice);
  const currency = invoice.currency;

  const metaPairs = [
    [
      ["Invoice#", invoice.invoiceNo],
      ["Company", invoice.company || "—"],
    ],
    [
      ["Invoice Date", invoice.invoiceDate],
      ["Consignee", invoice.consignee],
    ],
    [
      ["Terms", invoice.terms],
      ["Business no.", invoice.businessNo || "—"],
    ],
    [
      ["Due Date", invoice.dueDate],
      ["Final destination", invoice.finalDestination || "—"],
    ],
  ] as const;

  return (
    <div
      id="invoice-document"
      className={`invoice-document ${invoiceFont.variable} ${invoiceFont.className}`}
      lang="en"
    >
      <div className="invoice-sheet">
        <div className="invoice-watermark" aria-hidden="true">
          <img
            src="/brand/rbauto-logo.png"
            alt=""
            className="invoice-watermark-img"
            draggable={false}
          />
        </div>

        <header className="invoice-header">
          <div className="invoice-brand">
            <img
              src="/brand/rbauto-logo.png"
              alt="RBAUTO"
              className="invoice-logo"
              draggable={false}
            />
          </div>
          <div className="invoice-heading">
            <p className="invoice-eyebrow">Commercial Invoice</p>
            <h1>INVOICE</h1>
            <p className="invoice-company">{INVOICE_SELLER.company}</p>
            <p className="invoice-address">{INVOICE_SELLER.address}</p>
          </div>
        </header>

        <section className="invoice-meta" aria-label="Invoice details">
          {metaPairs.map((row, i) => (
            <div key={i} className="invoice-meta-row">
              {row.map(([label, value]) => (
                <div key={label} className="invoice-meta-cell">
                  <span className="invoice-meta-label">{label}</span>
                  <span className="invoice-meta-value">{value}</span>
                </div>
              ))}
            </div>
          ))}
        </section>

        <table className="invoice-items" cellSpacing={0} cellPadding={0}>
          <colgroup>
            <col className="col-desc" />
            <col className="col-reg" />
            <col className="col-vin" />
            <col className="col-qty" />
            <col className="col-krw" />
            <col className="col-rate" />
            <col className="col-fx" />
          </colgroup>
          <thead>
            <tr>
              <th className="col-desc">Description</th>
              <th className="col-reg">Reg. No.</th>
              <th className="col-vin">VIN</th>
              <th className="col-qty">Qty</th>
              <th className="col-krw">PRICE (₩)</th>
              <th className="col-rate">Rate</th>
              <th className="col-fx">{currencyColumnLabel(currency)}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const credit = isInvoiceCreditLine(line);
              return (
                <tr
                  key={line.id ?? `${line.description}-${index}`}
                  className={credit ? "is-credit" : undefined}
                >
                  <td className="col-desc">{line.description}</td>
                  <td className="col-reg">{line.regNo || ""}</td>
                  <td className="col-vin">{line.vin || ""}</td>
                  <td className="col-qty">{line.qty}</td>
                  <td className="col-krw">{formatKrw(line.priceKrw)}</td>
                  <td className="col-rate">{formatRate(line.rate)}</td>
                  <td className="col-fx">
                    {formatFx(line.finalPrice, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="invoice-notice" aria-label="Notice">
          <div className="invoice-notice-head">Notice</div>
          <ol>
            {INVOICE_NOTICES.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ol>
        </section>

        <div className="invoice-amount-row">
          <p className="invoice-prepaid">{invoice.prepaidLabel}</p>
          <p className="invoice-amount">
            <span className="invoice-amount-label">
              {amountLabel(currency)}
            </span>
            <strong>{formatFx(invoice.amount, currency)}</strong>
          </p>
        </div>

        <div className="invoice-footer-grid">
          <table className="invoice-remit" cellSpacing={0} cellPadding={0}>
            <colgroup>
              <col className="remit-label" />
              <col className="remit-value" />
            </colgroup>
            <tbody>
              {REMIT_ROWS.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-company-block">
            <p className="invoice-bizno">{INVOICE_SELLER.bizNo}</p>
            <p>{INVOICE_SELLER.companyKo}</p>
            <p>대표이사 {INVOICE_SELLER.ceoKo}</p>
            <p>{INVOICE_SELLER.addressKo}</p>
            <img
              src="/brand/rbauto-stamp.png"
              alt=""
              className="invoice-stamp-mark invoice-stamp-mark-company"
              draggable={false}
              aria-hidden
            />
          </div>
        </div>

        <div className="invoice-total">
          <span className="invoice-total-label">{totalLabel(currency)}</span>
          <strong>{formatFx(invoice.amount, currency)}</strong>
        </div>
      </div>
    </div>
  );
}
