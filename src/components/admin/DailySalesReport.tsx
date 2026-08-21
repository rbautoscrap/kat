"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { updateSaleTracking } from "@/app/admin/sales-daily/actions";
import {
  SALE_SHIPMENT_TYPES,
  buyerSummaries,
  formatSaleMoney,
  isUnpaidRow,
  parseSaleMoney,
  remainingOf,
  sumSaleRows,
  type DailySaleRow,
} from "@/lib/sales-daily";

type Props = {
  date: string;
  daySales: DailySaleRow[];
  receivables: DailySaleRow[];
  fxReceivables: DailySaleRow[];
};

function applyPatch(
  rows: DailySaleRow[],
  itemId: string,
  patch: Partial<
    Pick<DailySaleRow, "paidAmount" | "shipmentType" | "shippedDate" | "reportNote">
  >,
) {
  return rows.map((row) => {
    if (row.itemId !== itemId) return row;
    const next = { ...row, ...patch };
    const paid = parseSaleMoney(next.paidAmount);
    next.remaining = String(
      remainingOf(parseSaleMoney(next.total), paid, next.currency),
    );
    return next;
  });
}

export function DailySalesReport({
  date,
  daySales: initialDaySales,
  receivables: initialReceivables,
  fxReceivables: initialFx,
}: Props) {
  const [daySales, setDaySales] = useState(initialDaySales);
  const [receivables, setReceivables] = useState(initialReceivables);
  const [fxReceivables, setFxReceivables] = useState(initialFx);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function syncAll(
    itemId: string,
    patch: Partial<
      Pick<DailySaleRow, "paidAmount" | "shipmentType" | "shippedDate" | "reportNote">
    >,
  ) {
    setDaySales((rows) => applyPatch(rows, itemId, patch));
    setReceivables((rows) => applyPatch(rows, itemId, patch));
    setFxReceivables((rows) => applyPatch(rows, itemId, patch));
  }

  function save(
    itemId: string,
    patch: Partial<
      Pick<DailySaleRow, "paidAmount" | "shipmentType" | "shippedDate" | "reportNote">
    >,
  ) {
    setError("");
    syncAll(itemId, patch);
    startTransition(async () => {
      const result = await updateSaleTracking({ itemId, ...patch });
      if (!result.ok) setError(result.error);
    });
  }

  const dayTotals = useMemo(() => sumSaleRows(daySales), [daySales]);
  const recvTotals = useMemo(() => sumSaleRows(receivables), [receivables]);
  const fxTotals = useMemo(
    () => sumSaleRows(fxReceivables, fxReceivables[0]?.currency ?? "USD"),
    [fxReceivables],
  );
  const buyers = useMemo(() => buyerSummaries(receivables), [receivables]);

  return (
    <div className="daily-sales-report">
      {error ? (
        <p className="mb-3 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      <section className="daily-sales-kpis" aria-label="요약">
        <Kpi label={`${date.slice(5).replace("-", "/")} 판매액`} value={dayTotals.total} />
        <Kpi
          label={`${date.slice(5).replace("-", "/")} 예상미수금`}
          value={recvTotals.remaining}
          warn
        />
        <Kpi label={`${date.slice(5).replace("-", "/")} 입금액`} value={dayTotals.paid} />
        <Kpi label="미수 원장" value={recvTotals.total} />
        <Kpi label="입금총액" value={dayTotals.paid} />
        <Kpi label="외화 미수금" value={fxTotals.remaining} fx={fxReceivables[0]?.currency} />
      </section>

      <ReportTable
        title="판매현황"
        rows={daySales}
        totals={dayTotals}
        pending={pending}
        onPatch={syncAll}
        onSave={save}
        empty="해당일 판매 명세서가 없습니다."
      />

      <ReportTable
        title="미수금현황"
        rows={receivables}
        totals={recvTotals}
        pending={pending}
        onPatch={syncAll}
        onSave={save}
        highlightUnpaid
        empty="미수 항목이 없습니다."
      />

      <div className="daily-sales-bottom">
        <ReportTable
          title="외화 미수금현황"
          rows={fxReceivables}
          totals={fxTotals}
          pending={pending}
          onPatch={syncAll}
          onSave={save}
          highlightUnpaid
          fx
          empty="외화 미수 항목이 없습니다."
        />

        <aside className="daily-sales-side">
          <div className="daily-sales-side-card">
            <h3>소계</h3>
            <p>
              <span>판매소계</span>
              <strong>{formatSaleMoney(recvTotals.total, "KRW")}</strong>
            </p>
            <p>
              <span>입금소계</span>
              <strong>{formatSaleMoney(recvTotals.paid, "KRW")}</strong>
            </p>
            <p>
              <span>외화미수금</span>
              <strong>
                {fxReceivables.length
                  ? formatSaleMoney(
                      fxTotals.remaining,
                      fxReceivables[0]!.currency,
                    )
                  : "0"}
              </strong>
            </p>
          </div>
          <div className="daily-sales-side-card">
            <h3>구매자별 현황</h3>
            {buyers.length === 0 ? (
              <p className="daily-sales-muted">미수 구매자가 없습니다.</p>
            ) : (
              <ul>
                {buyers.map((b) => (
                  <li key={b.buyerName}>
                    <span>
                      {b.buyerName}
                      <em>{b.count}건</em>
                    </span>
                    <strong>{formatSaleMoney(b.total, "KRW")}</strong>
                  </li>
                ))}
                <li className="is-sum">
                  <span>합계</span>
                  <strong>{formatSaleMoney(recvTotals.total, "KRW")}</strong>
                </li>
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  warn,
  fx,
}: {
  label: string;
  value: number;
  warn?: boolean;
  fx?: DailySaleRow["currency"];
}) {
  return (
    <div className={`daily-sales-kpi${warn ? " is-warn" : ""}`}>
      <span>{label}</span>
      <strong>
        {fx && fx !== "KRW"
          ? formatSaleMoney(value, fx)
          : formatSaleMoney(value, "KRW")}
      </strong>
    </div>
  );
}

function ReportTable({
  title,
  rows,
  totals,
  pending,
  onPatch,
  onSave,
  highlightUnpaid,
  fx,
  empty,
}: {
  title: string;
  rows: DailySaleRow[];
  totals: ReturnType<typeof sumSaleRows>;
  pending: boolean;
  onPatch: (
    itemId: string,
    patch: Partial<
      Pick<DailySaleRow, "paidAmount" | "shipmentType" | "shippedDate" | "reportNote">
    >,
  ) => void;
  onSave: (
    itemId: string,
    patch: Partial<
      Pick<DailySaleRow, "paidAmount" | "shipmentType" | "shippedDate" | "reportNote">
    >,
  ) => void;
  highlightUnpaid?: boolean;
  fx?: boolean;
  empty: string;
}) {
  const currency = rows[0]?.currency ?? "KRW";

  return (
    <section className="daily-sales-section">
      <h2>{title}</h2>
      <div className="daily-sales-scroll">
        <table className="daily-sales-table">
          <colgroup>
            <col className="col-no" />
            <col className="col-plate" />
            <col className="col-buyer" />
            <col className="col-car" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-ship" />
            <col className="col-date" />
            <col className="col-note" />
          </colgroup>
          <thead>
            <tr>
              <th>연번</th>
              <th>차량번호</th>
              <th>구매자</th>
              <th>차량명</th>
              <th>공급금액</th>
              <th>부가세</th>
              <th>입금</th>
              <th>잔액금</th>
              <th>계</th>
              <th>송품구분</th>
              <th>발송일자</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="daily-sales-empty">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const unpaid = isUnpaidRow(row);
                return (
                  <tr
                    key={row.itemId}
                    className={
                      highlightUnpaid && unpaid ? "is-unpaid" : undefined
                    }
                  >
                    <td className="is-center">{index + 1}</td>
                    <td>{row.vehicleNumber || (row.isExtra ? "—" : "")}</td>
                    <td>
                      <Link
                        href={`/admin/statements/${row.statementId}`}
                        className="daily-sales-link"
                      >
                        {row.buyerName}
                      </Link>
                    </td>
                    <td className="is-name" title={row.vehicleLabel}>
                      {row.vehicleLabel}
                    </td>
                    <td className="is-num">
                      {formatSaleMoney(parseSaleMoney(row.supply), row.currency)}
                    </td>
                    <td className="is-num">
                      {formatSaleMoney(parseSaleMoney(row.vat), row.currency)}
                    </td>
                    <td className="is-edit">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.paidAmount}
                        disabled={pending}
                        aria-label="입금"
                        placeholder="0"
                        onChange={(e) =>
                          onPatch(row.itemId, {
                            paidAmount: e.target.value.replace(/,/g, ""),
                          })
                        }
                        onBlur={(e) => {
                          const next = e.target.value.replace(/,/g, "").trim();
                          onSave(row.itemId, { paidAmount: next });
                        }}
                      />
                    </td>
                    <td className="is-num is-remain">
                      {formatSaleMoney(
                        parseSaleMoney(row.remaining),
                        row.currency,
                      )}
                    </td>
                    <td className="is-num is-strong">
                      {formatSaleMoney(parseSaleMoney(row.total), row.currency)}
                    </td>
                    <td className="is-edit">
                      <select
                        value={row.shipmentType}
                        disabled={pending}
                        aria-label="송품구분"
                        onChange={(e) =>
                          onSave(row.itemId, { shipmentType: e.target.value })
                        }
                      >
                        {SALE_SHIPMENT_TYPES.map((type) => (
                          <option key={type || "blank"} value={type}>
                            {type || "—"}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="is-edit">
                      <input
                        type="date"
                        value={row.shippedDate}
                        disabled={pending}
                        aria-label="발송일자"
                        onChange={(e) =>
                          onSave(row.itemId, { shippedDate: e.target.value })
                        }
                      />
                    </td>
                    <td className="is-edit">
                      <input
                        type="text"
                        value={row.reportNote}
                        disabled={pending}
                        aria-label="비고"
                        onChange={(e) =>
                          onPatch(row.itemId, { reportNote: e.target.value })
                        }
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          onSave(row.itemId, { reportNote: next });
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="is-center is-strong">
                합 계
              </td>
              <td className="is-num">
                {formatSaleMoney(totals.supply, currency)}
              </td>
              <td className="is-num">{formatSaleMoney(totals.vat, currency)}</td>
              <td className="is-num">
                {formatSaleMoney(totals.paid, currency)}
              </td>
              <td className="is-num is-remain">
                {formatSaleMoney(totals.remaining, currency)}
              </td>
              <td className="is-num is-strong">
                {formatSaleMoney(totals.total, currency)}
              </td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
      {fx ? (
        <p className="daily-sales-fx-note">
          외화 금액은 명세서 통화 기준입니다.
        </p>
      ) : null}
    </section>
  );
}
