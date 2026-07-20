import {
  STATEMENT_BANK,
  STATEMENT_SELLER,
  STATEMENT_VAT_RATE,
  calcStatementTotals,
  type StatementView,
} from "@/lib/statement";

type Props = {
  statement: StatementView;
};

export function StatementDocument({ statement }: Props) {
  const totals = calcStatementTotals(statement.amount, statement.currency);
  const vatPct = Math.round(STATEMENT_VAT_RATE * 100);

  return (
    <div id="statement-document" className="statement-document">
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
            <p className="statement-brand-sub">{STATEMENT_SELLER.company}</p>
          </div>
          <div className="statement-heading-block">
            <h1 className="statement-title">거래명세서</h1>
            <p className="statement-subtitle">Transaction Statement</p>
          </div>
        </header>

        <div className="statement-meta-row">
          <div className="statement-meta-chip">
            <span className="statement-meta-label">명세서 번호</span>
            <span className="statement-meta-value">{statement.statementNo}</span>
          </div>
          <div className="statement-meta-chip">
            <span className="statement-meta-label">발행일</span>
            <span className="statement-meta-value">{statement.issueDate}</span>
          </div>
        </div>

        <table className="statement-parties" cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <td className="statement-party">
                <div className="statement-party-title">공급자</div>
                <div className="statement-party-body">
                  <p className="statement-party-name">{STATEMENT_SELLER.name}</p>
                  <p>{STATEMENT_SELLER.company}</p>
                  <p>Tel / KakaoTalk: {STATEMENT_SELLER.phone}</p>
                  <p>WhatsApp: +{STATEMENT_SELLER.whatsapp}</p>
                </div>
              </td>
              <td className="statement-party">
                <div className="statement-party-title">공급받는자</div>
                <div className="statement-party-body">
                  <p className="statement-party-name">{statement.buyerName}</p>
                  {statement.buyerPhone ? (
                    <p>연락처: {statement.buyerPhone}</p>
                  ) : null}
                  {statement.buyerAddress ? (
                    <p>주소: {statement.buyerAddress}</p>
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
              <th>품목</th>
              <th>상세</th>
              <th>수량</th>
              <th>공급가액</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="cell-item">{statement.vehicleLabel}</td>
              <td className="cell-detail">
                <p>시리얼: {statement.serialNumber}</p>
                {statement.vin ? <p>VIN: {statement.vin}</p> : null}
                {statement.vehicleNumber ? (
                  <p>차량번호: {statement.vehicleNumber}</p>
                ) : null}
              </td>
              <td className="cell-qty">1</td>
              <td className="cell-amount">{totals.supplyLabel}</td>
            </tr>
          </tbody>
        </table>

        <table className="statement-totals" cellSpacing={0} cellPadding={0}>
          <colgroup>
            <col className="col-total-label" />
            <col className="col-total-value" />
          </colgroup>
          <tbody>
            <tr>
              <td>공급가액</td>
              <td>{totals.supplyLabel}</td>
            </tr>
            <tr>
              <td>부가세 ({vatPct}%)</td>
              <td>{totals.vatLabel}</td>
            </tr>
            <tr className="statement-totals-sum">
              <td>합계 ({statement.currency})</td>
              <td>{totals.totalLabel}</td>
            </tr>
          </tbody>
        </table>

        <section className="statement-bank">
          <div className="statement-bank-title">입금 계좌</div>
          <div className="statement-bank-body">
            <p className="statement-bank-line">
              <span className="statement-bank-label">은행</span>
              <span>{STATEMENT_BANK.bankName}</span>
            </p>
            <p className="statement-bank-line">
              <span className="statement-bank-label">계좌번호</span>
              <span className="statement-bank-account">
                {STATEMENT_BANK.accountNo}
              </span>
            </p>
            <p className="statement-bank-line">
              <span className="statement-bank-label">예금주</span>
              <span>{STATEMENT_BANK.accountHolder}</span>
            </p>
          </div>
        </section>

        {statement.notes ? (
          <section className="statement-notes">
            <div className="statement-notes-title">비고</div>
            <div className="statement-notes-body">{statement.notes}</div>
          </section>
        ) : null}

        <p className="statement-footer">
          본 명세서는 {STATEMENT_SELLER.name}({STATEMENT_SELLER.company})에서
          발행한 거래 확인용 문서입니다. 합계 금액에는 부가세 {vatPct}%가
          포함되어 있습니다.
        </p>
      </div>
    </div>
  );
}
