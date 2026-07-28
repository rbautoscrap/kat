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
  totalLabel,
  type InvoiceView,
} from "@/lib/overseas-invoice";

type Props = {
  invoice: InvoiceView;
};

export function InvoiceDocument({ invoice }: Props) {
  const lines = getInvoiceLines(invoice);
  const currency = invoice.currency;

  return (
    <div id="invoice-document" className="invoice-document" lang="en">
      <div className="invoice-sheet">
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
            <h1>INVOICE</h1>
            <p className="invoice-company">{INVOICE_SELLER.company}</p>
            <p className="invoice-address">{INVOICE_SELLER.address}</p>
          </div>
        </header>

        <table className="invoice-meta" cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <th>Invoice#</th>
              <td>{invoice.invoiceNo}</td>
              <th>Company</th>
              <td>{invoice.company || "—"}</td>
            </tr>
            <tr>
              <th>Invoice Date</th>
              <td>{invoice.invoiceDate}</td>
              <th>Consignee</th>
              <td>{invoice.consignee}</td>
            </tr>
            <tr>
              <th>Terms</th>
              <td>{invoice.terms}</td>
              <th>Business no.</th>
              <td>{invoice.businessNo || "—"}</td>
            </tr>
            <tr>
              <th>Due Date</th>
              <td>{invoice.dueDate}</td>
              <th>Final destination</th>
              <td>{invoice.finalDestination || "—"}</td>
            </tr>
          </tbody>
        </table>

        <table className="invoice-items" cellSpacing={0} cellPadding={0}>
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
            {lines.map((line, index) => (
              <tr key={line.id ?? `${line.description}-${index}`}>
                <td className="col-desc">{line.description}</td>
                <td className="col-reg">{line.regNo || ""}</td>
                <td className="col-vin">{line.vin || ""}</td>
                <td className="col-qty">{line.qty}</td>
                <td className="col-krw">{formatKrw(line.priceKrw)}</td>
                <td className="col-rate">{formatRate(line.rate)}</td>
                <td className="col-fx">{formatFx(line.finalPrice, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-notice">
          <div className="invoice-notice-head">Notice</div>
          <ol>
            {INVOICE_NOTICES.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
        </div>

        <div className="invoice-amount-row">
          <p className="invoice-prepaid">{invoice.prepaidLabel}</p>
          <p className="invoice-amount">
            {amountLabel(currency)} :{" "}
            <strong>{formatFx(invoice.amount, currency)}</strong>
          </p>
        </div>

        <div className="invoice-footer-grid">
          <table className="invoice-remit" cellSpacing={0} cellPadding={0}>
            <tbody>
              {(
                [
                  ["Beneficiary Name", INVOICE_REMITTANCE.beneficiaryName],
                  ["Beneficiary Account No.", INVOICE_REMITTANCE.accountNo],
                  ["Beneficiary Address", INVOICE_REMITTANCE.beneficiaryAddress],
                  ["Bank Name", INVOICE_REMITTANCE.bankName],
                  ["Branch Name", INVOICE_REMITTANCE.branchName],
                  ["Swift Code", INVOICE_REMITTANCE.swiftCode],
                  ["Bank Address", INVOICE_REMITTANCE.bankAddress],
                  ["Bank Telephone no.", INVOICE_REMITTANCE.bankTel],
                ] as const
              ).map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="invoice-seal-block">
            <p className="invoice-bizno">{INVOICE_SELLER.bizNo}</p>
            <p>{INVOICE_SELLER.companyKo}</p>
            <p>대표이사 {INVOICE_SELLER.ceoKo}</p>
            <p>{INVOICE_SELLER.addressKo}</p>
            <div className="invoice-seal" aria-hidden>
              <span>인감</span>
            </div>
          </div>
        </div>

        <p className="invoice-total">
          {totalLabel(currency)} :{" "}
          <strong>{formatFx(invoice.amount, currency)}</strong>
        </p>
      </div>
    </div>
  );
}
