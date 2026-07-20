import {
  STATEMENT_BANK,
  STATEMENT_COPY,
  STATEMENT_SELLER,
  STATEMENT_VAT_RATE,
  calcStatementTotals,
  formatStatementAmount,
  getStatementLines,
  sumLineAmounts,
  type StatementLocale,
  type StatementView,
} from "@/lib/statement";

type Props = {
  statement: StatementView;
  locale?: StatementLocale;
};

export function StatementDocument({
  statement,
  locale = "ko",
}: Props) {
  const t = STATEMENT_COPY[locale];
  const includeVat = statement.includeVat !== false;
  const lines = getStatementLines(statement);
  const supplySum = sumLineAmounts(lines, statement.currency);
  const totals = calcStatementTotals(
    supplySum,
    statement.currency,
    includeVat,
  );
  const vatPct = Math.round(STATEMENT_VAT_RATE * 100);
  const company =
    locale === "en" ? STATEMENT_SELLER.companyEn : STATEMENT_SELLER.company;
  const bankName =
    locale === "en" ? STATEMENT_BANK.bankNameEn : STATEMENT_BANK.bankName;
  const accountHolder =
    locale === "en"
      ? STATEMENT_BANK.accountHolderEn
      : STATEMENT_BANK.accountHolder;

  return (
    <div
      id="statement-document"
      className="statement-document"
      data-locale={locale}
    >
      <div className="statement-sheet">
        <div className="statement-accent" />
        <div className="statement-watermark" aria-hidden="true">
          <img
            src="/brand/rbauto-logo.png"
            alt=""
            className="statement-watermark-img"
            draggable={false}
          />
        </div>

        <header className="statement-header">
          <div className="statement-brand">
            <p className="statement-brand-name">{STATEMENT_SELLER.name}</p>
            <p className="statement-brand-sub">{company}</p>
          </div>
          <div className="statement-heading-block">
            <h1 className="statement-title">{t.title}</h1>
            <p className="statement-subtitle">{t.subtitle}</p>
          </div>
        </header>

        <div className="statement-meta-row">
          <div className="statement-meta-chip">
            <span className="statement-meta-label">{t.statementNo}</span>
            <span className="statement-meta-value">{statement.statementNo}</span>
          </div>
          <div className="statement-meta-chip">
            <span className="statement-meta-label">{t.issueDate}</span>
            <span className="statement-meta-value">{statement.issueDate}</span>
          </div>
        </div>

        <table className="statement-parties" cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <td className="statement-party">
                <div className="statement-party-title">{t.seller}</div>
                <div className="statement-party-body">
                  <p className="statement-party-name">{STATEMENT_SELLER.name}</p>
                  <p>{company}</p>
                  <p>Tel / KakaoTalk: {STATEMENT_SELLER.phone}</p>
                  <p>WhatsApp: +{STATEMENT_SELLER.whatsapp}</p>
                </div>
              </td>
              <td className="statement-party">
                <div className="statement-party-title">{t.buyer}</div>
                <div className="statement-party-body">
                  <p className="statement-party-name">{statement.buyerName}</p>
                  {statement.buyerPhone ? (
                    <p>
                      {t.phone}: {statement.buyerPhone}
                    </p>
                  ) : null}
                  {statement.buyerAddress ? (
                    <p>
                      {t.address}: {statement.buyerAddress}
                    </p>
                  ) : null}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="statement-items" cellSpacing={0} cellPadding={0}>
          <colgroup>
            <col className="col-item" />
            <col className="col-detail" />
            <col className="col-qty" />
            <col className="col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th>{t.item}</th>
              <th>{t.detail}</th>
              <th>{t.qty}</th>
              <th>{t.supplyAmount}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={`${line.id ?? line.listingId ?? line.serialNumber}-${line.serialNumber}`}>
                <td className="cell-item">{line.vehicleLabel}</td>
                <td className="cell-detail">
                  <p>
                    {t.serial}: {line.serialNumber}
                  </p>
                  {line.vin ? <p>VIN: {line.vin}</p> : null}
                  {line.vehicleNumber ? (
                    <p>
                      {t.vehicleNo}: {line.vehicleNumber}
                    </p>
                  ) : null}
                </td>
                <td className="cell-qty">1</td>
                <td className="cell-amount">
                  {formatStatementAmount(line.amount, statement.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="statement-totals" cellSpacing={0} cellPadding={0}>
          <colgroup>
            <col className="col-total-label" />
            <col className="col-total-value" />
          </colgroup>
          <tbody>
            <tr>
              <td>{t.supplyAmount}</td>
              <td>{totals.supplyLabel}</td>
            </tr>
            <tr>
              <td>
                {includeVat ? `${t.vat} (${vatPct}%)` : t.vatZero}
              </td>
              <td>{totals.vatLabel}</td>
            </tr>
            <tr className="statement-totals-sum">
              <td>
                {t.total} ({statement.currency})
              </td>
              <td>{totals.totalLabel}</td>
            </tr>
          </tbody>
        </table>

        <section className="statement-bank">
          <div className="statement-bank-title">{t.bank}</div>
          <div className="statement-bank-body">
            <p className="statement-bank-line">
              <span className="statement-bank-label">{t.bankName}</span>
              <span>{bankName}</span>
            </p>
            <p className="statement-bank-line">
              <span className="statement-bank-label">{t.accountNo}</span>
              <span className="statement-bank-account">
                {STATEMENT_BANK.accountNo}
              </span>
            </p>
            <p className="statement-bank-line">
              <span className="statement-bank-label">{t.accountHolder}</span>
              <span>{accountHolder}</span>
            </p>
          </div>
        </section>

        {statement.notes ? (
          <section className="statement-notes">
            <div className="statement-notes-title">{t.notes}</div>
            <div className="statement-notes-body">{statement.notes}</div>
          </section>
        ) : null}

        <p className="statement-footer">
          {includeVat ? t.footerVat(vatPct) : t.footerNoVat}
        </p>
      </div>
    </div>
  );
}
