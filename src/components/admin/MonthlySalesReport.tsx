"use client";

import { useState } from "react";
import { adminActionBtnClass } from "@/lib/admin-ui";
import { formatSaleMoney } from "@/lib/sales-daily";
import type { MonthlySalesReportData } from "@/lib/sales-monthly";

type Props = {
  report: MonthlySalesReportData;
};

function waitFrames(count = 2) {
  return new Promise<void>((resolve) => {
    const step = (n: number) => {
      if (n <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(n - 1));
    };
    step(count);
  });
}

async function captureReportPng(
  source: HTMLElement,
  toPng: typeof import("html-to-image").toPng,
) {
  await document.fonts.ready.catch(() => undefined);
  const width = Math.max(source.scrollWidth, source.offsetWidth, 1100);
  const layer = document.createElement("div");
  Object.assign(layer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${width}px`,
    zIndex: "2147483646",
    background: "#ffffff",
    pointerEvents: "none",
  });
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  Object.assign(clone.style, {
    width: `${width}px`,
    maxWidth: `${width}px`,
    minWidth: `${width}px`,
    margin: "0",
    background: "#ffffff",
  });
  layer.appendChild(clone);
  document.body.appendChild(layer);
  try {
    await waitFrames(3);
    await new Promise((r) => setTimeout(r, 80));
    const height = Math.max(clone.scrollHeight, clone.offsetHeight, 400);
    return await toPng(clone, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width,
      height,
    });
  } finally {
    layer.remove();
  }
}

function money(value: number) {
  return formatSaleMoney(value, "KRW");
}

function pct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

function dateLabel(iso: string) {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

export function MonthlySalesReport({ report }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const maxDailySales = Math.max(...report.daily.map((d) => d.sales), 1);
  const maxBuyerSales = Math.max(...report.buyers.map((b) => b.total), 1);
  const maxBuyerRemain = Math.max(
    ...report.outstandingBuyers.map((b) => b.remaining),
    1,
  );
  const statusTotal = report.statuses.reduce((sum, s) => sum + s.count, 0);

  async function saveImage() {
    const node = document.getElementById("monthly-sales-document");
    if (!node) {
      setMessage("미리보기 영역을 찾을 수 없습니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await captureReportPng(node, toPng);
      if (!dataUrl || dataUrl.length < 200) throw new Error("empty image");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `월말보고서-${report.month}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      setMessage("이미지 저장에 실패했습니다. 출력을 이용해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="daily-sales-print-root">
      <div className="daily-sales-preview-bar daily-sales-no-print">
        <button
          type="button"
          className={adminActionBtnClass}
          disabled={busy}
          onClick={() => window.print()}
        >
          출력
        </button>
        <button
          type="button"
          className={adminActionBtnClass}
          disabled={busy}
          onClick={() => void saveImage()}
        >
          {busy ? "이미지 저장 중…" : "이미지 저장"}
        </button>
      </div>
      {message ? (
        <p className="daily-sales-no-print mb-3 text-right text-[13px] font-medium text-red-600">
          {message}
        </p>
      ) : null}

      <div id="monthly-sales-document" className="daily-sales-document">
        <div className="daily-sales-print-title">
          <h1>{report.label} 월말보고서</h1>
          <p>
            {report.start} ~ {report.end}
          </p>
        </div>

        <section className="month-kpis" aria-label="월간 요약">
          <Kpi
            label="당월 판매액"
            value={money(report.sales.total)}
            note={`${report.salesCount}건 · 공급 ${money(report.sales.supply)} · 부가세 ${money(report.sales.vat)}`}
          />
          <Kpi
            label="영업이익"
            value={money(report.sales.profit)}
            note={`공급 ${money(report.sales.supply)} − 원가 ${money(report.sales.cost)}`}
            tone={report.sales.profit >= 0 ? "profit" : "loss"}
          />
          <Kpi
            label="당월 매입비용"
            value={money(report.purchases.cost)}
            note={`${report.purchases.count}대 · 낙찰 ${money(report.purchases.auction)} · 부대 ${money(report.purchases.incidental)}`}
          />
          <Kpi label="당월 입금" value={money(report.sales.paid)} />
          <Kpi
            label="당월 미수"
            value={money(report.monthReceivables.remaining)}
            note={`${report.monthReceivableCount}건`}
            tone="warn"
          />
          <Kpi
            label="외화 미수"
            value={
              report.fxCount
                ? formatSaleMoney(report.fxRemaining, report.fxCurrency)
                : "0"
            }
            note={report.fxCount ? `${report.fxCount}건` : "없음"}
          />
        </section>

        <p className="month-insight">
          {report.start}부터 {report.end}까지 거래명세서와 입고 매입 기준입니다.
          영업이익은 공급가액에서 판매 낙찰원가를 뺀 금액입니다. 매입비용은
          해당 월 입고 차량의 낙찰가+부대비용입니다. 최고 판매일{" "}
          {dateLabel(report.peakSalesDate)} · 최고 이익일{" "}
          {dateLabel(report.peakProfitDate)}
        </p>

        <section className="month-panel">
          <div className="month-panel-head">
            <h2>당월 매입비용</h2>
            <p>Stand by · Car Listings 입고 기준 · 낙찰가 + 부대비용</p>
          </div>
          <div className="month-status">
            <div>
              <span>낙찰가</span>
              <strong>{money(report.purchases.auction)}</strong>
            </div>
            <div>
              <span>부대비용</span>
              <strong>{money(report.purchases.incidental)}</strong>
            </div>
            <div>
              <span>매입 합계</span>
              <strong>{money(report.purchases.cost)}</strong>
            </div>
            <div>
              <span>입고 대수</span>
              <strong>{report.purchases.count}대</strong>
            </div>
            <div>
              <span>판매 원가</span>
              <strong>{money(report.sales.cost)}</strong>
            </div>
          </div>
        </section>

        <section className="month-panel">
          <div className="month-panel-head">
            <h2>일별 판매·영업이익</h2>
            <p>막대는 판매액, 점은 영업이익 비중입니다.</p>
          </div>
          <div className="month-chart" role="img" aria-label="일별 판매 그래프">
            {report.daily.map((point) => (
              <div
                key={point.date}
                className="month-chart-col"
                title={`${dateLabel(point.date)} 판매 ${money(point.sales)} / 이익 ${money(point.profit)}`}
              >
                <div className="month-chart-track">
                  <span
                    className="month-chart-bar"
                    style={{ height: `${pct(point.sales, maxDailySales)}%` }}
                  />
                  <i
                    className="month-chart-dot"
                    style={{ bottom: `${pct(Math.max(point.profit, 0), maxDailySales)}%` }}
                  />
                </div>
                <em>{point.day}</em>
              </div>
            ))}
          </div>
        </section>

        <div className="month-grid">
          <section className="month-panel">
            <div className="month-panel-head">
              <h2>구매자 판매 순위</h2>
              <p>당월 누적 판매액 기준</p>
            </div>
            {report.buyers.length === 0 ? (
              <p className="month-empty">당월 판매 자료가 없습니다.</p>
            ) : (
              <ol className="month-rank">
                {report.buyers.map((buyer, index) => (
                  <li key={buyer.buyerName}>
                    <span className="month-rank-no">{index + 1}</span>
                    <div className="month-rank-body">
                      <div className="month-rank-line">
                        <strong>{buyer.buyerName}</strong>
                        <b>{money(buyer.total)}</b>
                      </div>
                      <div
                        className="month-rank-bar"
                        style={{ width: `${pct(buyer.total, maxBuyerSales)}%` }}
                      />
                      <small>
                        {buyer.count}건 · 입금 {money(buyer.paid)} · 이익{" "}
                        {money(buyer.profit)}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="month-panel">
            <div className="month-panel-head">
              <h2>미수 구매자</h2>
              <p>미수 잔액 기준</p>
            </div>
            {report.outstandingBuyers.length === 0 ? (
              <p className="month-empty">미수 구매자가 없습니다.</p>
            ) : (
              <ol className="month-rank">
                {report.outstandingBuyers.map((buyer, index) => (
                  <li key={buyer.buyerName}>
                    <span className="month-rank-no">{index + 1}</span>
                    <div className="month-rank-body">
                      <div className="month-rank-line">
                        <strong>{buyer.buyerName}</strong>
                        <b className="is-remain">{money(buyer.remaining)}</b>
                      </div>
                      <div
                        className="month-rank-bar is-remain"
                        style={{ width: `${pct(buyer.remaining, maxBuyerRemain)}%` }}
                      />
                      <small>
                        {buyer.count}건 · 판매 {money(buyer.total)}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className="month-panel">
          <div className="month-panel-head">
            <h2>분류 현황</h2>
            <p>당월 발행 명세서 기준</p>
          </div>
          <div className="month-status">
            {report.statuses.map((status) => (
              <div key={status.type}>
                <span>{status.type}</span>
                <strong>
                  {status.count}건
                  {statusTotal ? ` · ${Math.round((status.count / statusTotal) * 100)}%` : ""}
                </strong>
                <div className="month-status-track">
                  <i
                    style={{
                      width: `${statusTotal ? Math.round((status.count / statusTotal) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "profit" | "loss" | "warn";
}) {
  return (
    <div className={`month-kpi${tone ? ` is-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <em>{note}</em> : null}
    </div>
  );
}
