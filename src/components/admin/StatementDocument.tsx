import {
  STATEMENT_SELLER,
  formatStatementAmount,
  type StatementView,
} from "@/lib/statement";

type Props = {
  statement: StatementView;
};

export function StatementDocument({ statement }: Props) {
  return (
    <div
      id="statement-document"
      className="statement-document mx-auto w-full max-w-[210mm] bg-white text-neutral-900"
    >
      <div className="border-2 border-neutral-800 px-5 py-6 sm:px-8 sm:py-8">
        <header className="mb-6 text-center">
          <h1 className="text-[1.5rem] font-semibold tracking-[0.12em] text-neutral-900">
            거래명세서
          </h1>
          <p className="mt-2 text-[13px] tracking-wide text-neutral-500">
            TRANSACTION STATEMENT
          </p>
        </header>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 text-[13px]">
          <div>
            <p>
              <span className="text-neutral-500">명세서 번호</span>{" "}
              <span className="font-medium">{statement.statementNo}</span>
            </p>
            <p className="mt-1">
              <span className="text-neutral-500">발행일</span>{" "}
              <span className="font-medium">{statement.issueDate}</span>
            </p>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <section className="border border-neutral-300">
            <h2 className="border-b border-neutral-300 bg-neutral-50 px-3 py-2 text-[12.5px] font-medium tracking-wide text-neutral-700">
              공급자 (Seller)
            </h2>
            <div className="space-y-1.5 px-3 py-3 text-[13px] leading-relaxed">
              <p className="font-medium">{STATEMENT_SELLER.name}</p>
              <p>Tel / KakaoTalk: {STATEMENT_SELLER.phone}</p>
              <p>WhatsApp: +{STATEMENT_SELLER.whatsapp}</p>
            </div>
          </section>
          <section className="border border-neutral-300">
            <h2 className="border-b border-neutral-300 bg-neutral-50 px-3 py-2 text-[12.5px] font-medium tracking-wide text-neutral-700">
              공급받는자 (Buyer)
            </h2>
            <div className="space-y-1.5 px-3 py-3 text-[13px] leading-relaxed">
              <p className="font-medium">{statement.buyerName}</p>
              {statement.buyerPhone ? <p>연락처: {statement.buyerPhone}</p> : null}
              {statement.buyerAddress ? (
                <p>주소: {statement.buyerAddress}</p>
              ) : null}
            </div>
          </section>
        </div>

        <table className="mb-5 w-full border-collapse border border-neutral-300 text-[13px]">
          <thead>
            <tr className="bg-neutral-50 text-left text-[12px] text-neutral-600">
              <th className="border border-neutral-300 px-3 py-2 font-medium">
                품목
              </th>
              <th className="border border-neutral-300 px-3 py-2 font-medium">
                상세
              </th>
              <th className="w-16 border border-neutral-300 px-3 py-2 text-center font-medium">
                수량
              </th>
              <th className="w-36 border border-neutral-300 px-3 py-2 text-right font-medium">
                금액
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-300 px-3 py-3 align-top font-medium">
                {statement.vehicleLabel}
              </td>
              <td className="border border-neutral-300 px-3 py-3 align-top text-neutral-700">
                <p>시리얼: {statement.serialNumber}</p>
                {statement.vin ? <p>VIN: {statement.vin}</p> : null}
                {statement.vehicleNumber ? (
                  <p>차량번호: {statement.vehicleNumber}</p>
                ) : null}
              </td>
              <td className="border border-neutral-300 px-3 py-3 text-center align-top">
                1
              </td>
              <td className="border border-neutral-300 px-3 py-3 text-right align-top font-medium">
                {formatStatementAmount(statement.amount, statement.currency)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={3}
                className="border border-neutral-300 bg-neutral-50 px-3 py-3 text-right font-medium"
              >
                합계 ({statement.currency})
              </td>
              <td className="border border-neutral-300 bg-neutral-50 px-3 py-3 text-right text-[15px] font-semibold">
                {formatStatementAmount(statement.amount, statement.currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        {statement.notes ? (
          <section className="mb-4 border border-neutral-300">
            <h2 className="border-b border-neutral-300 bg-neutral-50 px-3 py-2 text-[12.5px] font-medium tracking-wide text-neutral-700">
              비고
            </h2>
            <p className="whitespace-pre-wrap px-3 py-3 text-[13px] leading-relaxed text-neutral-700">
              {statement.notes}
            </p>
          </section>
        ) : null}

        <p className="mt-6 text-center text-[12px] leading-relaxed text-neutral-500">
          본 명세서는 {STATEMENT_SELLER.name}에서 발행한 거래 확인용 문서입니다.
        </p>
      </div>
    </div>
  );
}
