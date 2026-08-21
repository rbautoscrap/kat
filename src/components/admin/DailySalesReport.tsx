"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  setReceivableLedger,
  updateSaleTracking,
} from "@/app/admin/sales-daily/actions";
import {
  SALE_SHIPMENT_TYPES,
  buyerSummaries,
  formatSaleMoney,
  formatSaleMoneyInput,
  isUnpaidRow,
  parseSaleMoney,
  remainingOf,
  saleDocHref,
  sumSaleRows,
  type DailySaleRow,
} from "@/lib/sales-daily";

type Props = {
  date: string;
  daySales: DailySaleRow[];
  receivables: DailySaleRow[];
  fxReceivables: DailySaleRow[];
  addableKrw: DailySaleRow[];
  addableFx: DailySaleRow[];
};

function applyPatch(
  rows: DailySaleRow[],
  itemId: string,
  patch: Partial<
    Pick<
      DailySaleRow,
      | "paidAmount"
      | "shipmentType"
      | "shippedDate"
      | "reportNote"
      | "inReceivableLedger"
    >
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

function optionLabel(row: DailySaleRow) {
  return `${row.issueDate} · ${row.buyerName} · ${row.vehicleLabel}`;
}

export function DailySalesReport({
  date,
  daySales: initialDaySales,
  receivables: initialReceivables,
  fxReceivables: initialFx,
  addableKrw: initialAddableKrw,
  addableFx: initialAddableFx,
}: Props) {
  const [daySales, setDaySales] = useState(initialDaySales);
  const [receivables, setReceivables] = useState(initialReceivables);
  const [fxReceivables, setFxReceivables] = useState(initialFx);
  const [addableKrw, setAddableKrw] = useState(initialAddableKrw);
  const [addableFx, setAddableFx] = useState(initialAddableFx);
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
    setAddableKrw((rows) => applyPatch(rows, itemId, patch));
    setAddableFx((rows) => applyPatch(rows, itemId, patch));
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

  function addToLedger(row: DailySaleRow) {
    setError("");
    setDaySales((rows) =>
      applyPatch(rows, row.itemId, { inReceivableLedger: true }),
    );
    if (row.currency === "KRW") {
      setReceivables((rows) =>
        rows.some((r) => r.itemId === row.itemId)
          ? rows
          : [...rows, { ...row, inReceivableLedger: true }],
      );
      setAddableKrw((rows) => rows.filter((r) => r.itemId !== row.itemId));
    } else {
      setFxReceivables((rows) =>
        rows.some((r) => r.itemId === row.itemId)
          ? rows
          : [...rows, { ...row, inReceivableLedger: true }],
      );
      setAddableFx((rows) => rows.filter((r) => r.itemId !== row.itemId));
    }
    startTransition(async () => {
      const result = await setReceivableLedger(row.itemId, true);
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
        addable={addableKrw}
        onAdd={addToLedger}
        highlightUnpaid
        empty="등록된 미수 항목이 없습니다."
      />

      <ReportTable
        title="외화 미수금현황"
        rows={fxReceivables}
        totals={fxTotals}
        pending={pending}
        onPatch={syncAll}
        onSave={save}
        addable={addableFx}
        onAdd={addToLedger}
        highlightUnpaid
        fx
        empty="등록된 외화 미수 항목이 없습니다."
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
  onAdd,
  addable,
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
  onAdd?: (row: DailySaleRow) => void;
  addable?: DailySaleRow[];
  highlightUnpaid?: boolean;
  fx?: boolean;
  empty: string;
}) {
  const currency = rows[0]?.currency ?? "KRW";
  const showVat = !fx;
  const colSpan = 6 + (showVat ? 1 : 0);

  return (
    <section className="daily-sales-section">
      <div className="daily-sales-section-head">
        <h2>{title}</h2>
        {addable && onAdd ? (
          <AddReceivableControl
            addable={addable}
            pending={pending}
            onAdd={onAdd}
          />
        ) : null}
      </div>
      <div className="daily-sales-scroll">
        <table className="daily-sales-table">
          <colgroup>
            <col className="col-buyer" />
            <col className="col-car" />
            <col className="col-num" />
            {showVat ? <col className="col-num" /> : null}
            <col className="col-num" />
            <col className="col-num" />
            <col className="col-ship" />
          </colgroup>
          <thead>
            <tr>
              <th>구매자</th>
              <th>차량명</th>
              <th>공급금액</th>
              {showVat ? <th>부가세</th> : null}
              <th>입금</th>
              <th>잔액금</th>
              <th>송품</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="daily-sales-empty">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const unpaid = isUnpaidRow(row);
                return (
                  <tr
                    key={row.itemId}
                    className={
                      highlightUnpaid && unpaid ? "is-unpaid" : undefined
                    }
                  >
                    <td>
                      <Link
                        href={saleDocHref(row)}
                        className="daily-sales-link"
                      >
                        {row.buyerName}
                      </Link>
                    </td>
                    <td className="is-name" title={row.vehicleLabel}>
                      {row.vehicleLabel}
                      {row.vehicleNumber ? (
                        <span className="daily-sales-plate">
                          {row.vehicleNumber}
                        </span>
                      ) : null}
                    </td>
                    <td className="is-num">
                      {formatSaleMoney(parseSaleMoney(row.supply), row.currency)}
                    </td>
                    {showVat ? (
                      <td className="is-num">
                        {formatSaleMoney(parseSaleMoney(row.vat), row.currency)}
                      </td>
                    ) : null}
                    <td className="is-edit is-num">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatSaleMoneyInput(
                          row.paidAmount,
                          row.currency,
                        )}
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
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="is-center is-strong">
                합 계
              </td>
              <td className="is-num">
                {formatSaleMoney(totals.supply, currency)}
              </td>
              {showVat ? (
                <td className="is-num">
                  {formatSaleMoney(totals.vat, currency)}
                </td>
              ) : null}
              <td className="is-num">
                {formatSaleMoney(totals.paid, currency)}
              </td>
              <td className="is-num is-remain">
                {formatSaleMoney(totals.remaining, currency)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {fx ? (
        <p className="daily-sales-fx-note">
          외화 금액은 명세서·인보이스 통화 기준입니다.
        </p>
      ) : null}
    </section>
  );
}

function AddReceivableControl({
  addable,
  pending,
  onAdd,
}: {
  addable: DailySaleRow[];
  pending: boolean;
  onAdd: (row: DailySaleRow) => void;
}) {
  const [itemId, setItemId] = useState("");
  if (addable.length === 0) return null;

  return (
    <form
      className="daily-sales-add daily-sales-no-print"
      onSubmit={(e) => {
        e.preventDefault();
        const row = addable.find((r) => r.itemId === itemId);
        if (!row) return;
        onAdd(row);
        setItemId("");
      }}
    >
      <select
        value={itemId}
        disabled={pending}
        onChange={(e) => setItemId(e.target.value)}
        aria-label="미수 등록할 품목"
      >
        <option value="">명세서 품목 선택</option>
        {addable.map((row) => (
          <option key={row.itemId} value={row.itemId}>
            {optionLabel(row)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="daily-sales-mini-btn"
        disabled={pending || !itemId}
      >
        등록
      </button>
    </form>
  );
}
