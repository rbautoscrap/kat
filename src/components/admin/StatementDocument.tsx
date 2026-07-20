import {
  STATEMENT_SELLER,
  formatStatementAmount,
  type StatementView,
} from "@/lib/statement";

type Props = {
  statement: StatementView;
};

export function StatementDocument({ statement }: Props) {
  const amountLabel = formatStatementAmount(
    statement.amount,
    statement.currency,
  );

  return (
    <div id="statement-document" className="statement-document">
      <div className="statement-sheet">
        <header className="statement-header">
          <h1 className="statement-title">거래명세서</h1>
          <p className="statement-subtitle">TRANSACTION STATEMENT</p>
        </header>

        <div className="statement-meta">
          <p>
            <span className="statement-meta-label">명세서 번호</span>
            <span className="statement-meta-value">{statement.statementNo}</span>
          </p>
          <p>
            <span className="statement-meta-label">발행일</span>
            <span className="statement-meta-value">{statement.issueDate}</span>
          </p>
        </div>

        <table className="statement-parties" cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <td className="statement-party">
                <div className="statement-party-title">공급자 (Seller)</div>
                <div className="statement-party-body">
                  <p className="statement-party-name">{STATEMENT_SELLER.name}</p>
                  <p>Tel / KakaoTalk: {STATEMENT_SELLER.phone}</p>
                  <p>WhatsApp: +{STATEMENT_SELLER.whatsapp}</p>
                </div>
              </td>
              <td className="statement-party">
                <div className="statement-party-title">공급받는자 (Buyer)</div>
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
              <th>금액</th>
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
              <td className="cell-amount">{amountLabel}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="cell-total-label">
                합계 ({statement.currency})
              </td>
              <td className="cell-total-amount">{amountLabel}</td>
            </tr>
          </tfoot>
        </table>

        {statement.notes ? (
          <section className="statement-notes">
            <div className="statement-notes-title">비고</div>
            <div className="statement-notes-body">{statement.notes}</div>
          </section>
        ) : null}

        <p className="statement-footer">
          본 명세서는 {STATEMENT_SELLER.name}에서 발행한 거래 확인용 문서입니다.
        </p>
      </div>
    </div>
  );
}
