"use client";

import { useState } from "react";
import type {
  InventoryListReport,
  InventoryStatusBlock,
} from "@/lib/inventory-list-types";

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function openListingPopup(listingId: string) {
  const width = Math.min(1280, Math.max(960, window.screen.availWidth - 80));
  const height = Math.min(900, Math.max(720, window.screen.availHeight - 80));
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  window.open(
    `/listings/${listingId}`,
    `listing-${listingId}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
}

type Props = {
  report: InventoryListReport;
};

function CountLabel({ count, cost }: { count: number; cost: number }) {
  return (
    <span className="inventory-count">
      {count.toLocaleString("ko-KR")}대
      {cost > 0 ? ` · 원가 ${formatWon(cost)}` : ""}
    </span>
  );
}

function ReservedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
      <path
        d="M7 3.75h10A1.25 1.25 0 0 1 18.25 5v15.1L12 16.2l-6.25 3.9V5A1.25 1.25 0 0 1 7 3.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SoldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 12.2 10.7 14.7 15.8 9.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusTable({ block }: { block: InventoryStatusBlock }) {
  if (block.rows.length === 0) {
    return <p className="inventory-empty">해당 없음</p>;
  }

  return (
    <table>
      <colgroup>
        <col className="col-no" />
        <col className="col-title" />
        <col className="col-cat" />
        <col className="col-sn" />
        <col className="col-vin" />
        <col className="col-car" />
        <col className="col-date" />
        <col className="col-days" />
        <col className="col-money" />
        <col className="col-money" />
      </colgroup>
      <thead>
        <tr>
          <th className="is-num">No</th>
          <th>차량명</th>
          <th>구분</th>
          <th>S/N</th>
          <th>VIN</th>
          <th>차량번호</th>
          <th>입고일</th>
          <th className="is-num">누적</th>
          <th className="is-num">원가</th>
          <th className="is-num">판매가</th>
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row) => (
          <tr key={row.id}>
            <td className="is-num">{row.no}</td>
            <td className="is-title">
              <a
                href={`/listings/${row.id}`}
                className="inventory-title-link"
                title={`${row.title} 매물 보기`}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return;
                  }
                  event.preventDefault();
                  openListingPopup(row.id);
                }}
              >
                {row.title}
              </a>
            </td>
            <td className="is-cat">{row.categoryLabel}</td>
            <td className="is-code">{row.serialNumber}</td>
            <td className="is-code">{row.vin}</td>
            <td className="is-code">{row.vehicleNumber}</td>
            <td className="is-date">{row.inboundDate}</td>
            <td className="is-num">{row.days}</td>
            <td className="is-num">{row.costLabel}</td>
            <td className="is-num">{row.salePriceLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InventoryListDocument({ report }: Props) {
  const [showReserved, setShowReserved] = useState(false);
  const [showSold, setShowSold] = useState(false);

  const reservedCount = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "RESERVED");
    return sum + (block?.count ?? 0);
  }, 0);
  const soldCount = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "SOLD");
    return sum + (block?.count ?? 0);
  }, 0);
  const availableCount = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "AVAILABLE");
    return sum + (block?.count ?? 0);
  }, 0);
  const availableCost = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "AVAILABLE");
    return sum + (block?.costTotal ?? 0);
  }, 0);

  return (
    <div className="inventory-sheet">
      <header className="inventory-head">
        <p className="inventory-brand">KOREA AUTO TRADE</p>
        <h1>재고 리스트</h1>
        <p className="inventory-meta">
          충주·진천 입고지별 · 판매중 · 원가 고액순
          <span> · </span>
          {report.generatedAt}
        </p>
        <p className="inventory-total">
          판매중 {availableCount.toLocaleString("ko-KR")}대
          {availableCost > 0 ? ` · 원가 합계 ${formatWon(availableCost)}` : ""}
        </p>
        <div className="inventory-status-toggles inventory-no-print">
          <button
            type="button"
            className={`inventory-status-icon${showReserved ? " is-on" : ""}`}
            aria-pressed={showReserved}
            title="예약완료 보기"
            onClick={() => setShowReserved((open) => !open)}
          >
            <ReservedIcon />
            <span>예약완료 {reservedCount.toLocaleString("ko-KR")}</span>
          </button>
          <button
            type="button"
            className={`inventory-status-icon${showSold ? " is-on" : ""}`}
            aria-pressed={showSold}
            title="판매완료 보기"
            onClick={() => setShowSold((open) => !open)}
          >
            <SoldIcon />
            <span>판매완료 {soldCount.toLocaleString("ko-KR")}</span>
          </button>
        </div>
      </header>

      {report.locations.map((location) => {
        const available = location.statuses.find(
          (item) => item.status === "AVAILABLE",
        );
        const reserved = location.statuses.find(
          (item) => item.status === "RESERVED",
        );
        const sold = location.statuses.find((item) => item.status === "SOLD");

        return (
          <section key={location.location} className="inventory-location">
            <h2>
              {location.location}
              <CountLabel
                count={available?.count ?? 0}
                cost={available?.costTotal ?? 0}
              />
            </h2>

            <div className="inventory-status">
              <h3>
                판매중
                <CountLabel
                  count={available?.count ?? 0}
                  cost={available?.costTotal ?? 0}
                />
              </h3>
              {available ? <StatusTable block={available} /> : null}
            </div>

            {showReserved && reserved ? (
              <div className="inventory-status">
                <h3>
                  예약완료
                  <CountLabel
                    count={reserved.count}
                    cost={reserved.costTotal}
                  />
                </h3>
                <StatusTable block={reserved} />
              </div>
            ) : null}

            {showSold && sold ? (
              <div className="inventory-status">
                <h3>
                  판매완료
                  <CountLabel count={sold.count} cost={sold.costTotal} />
                </h3>
                <StatusTable block={sold} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
