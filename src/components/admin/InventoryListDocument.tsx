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
  const url = `/listings/${listingId}`;
  // Do not use popup=yes — Chromium isolates that window and listing saves fail.
  const opened = window.open(
    url,
    `listing-${listingId}`,
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
  );
  if (!opened) window.open(url, "_blank");
}

function splitConsignment(block?: InventoryStatusBlock) {
  const stockRows = block?.rows.filter((row) => row.category !== "CONSIGNMENT_SALE") ?? [];
  const consignmentRows =
    block?.rows.filter((row) => row.category === "CONSIGNMENT_SALE") ?? [];
  return {
    stock: {
      status: block?.status ?? "AVAILABLE",
      label: block?.label ?? "",
      rows: stockRows.map((row, index) => ({ ...row, no: index + 1 })),
      count: stockRows.length,
      costTotal: stockRows.reduce((sum, row) => sum + row.cost, 0),
    } satisfies InventoryStatusBlock,
    consignment: {
      status: block?.status ?? "AVAILABLE",
      label: block?.label ?? "",
      rows: consignmentRows.map((row, index) => ({ ...row, no: index + 1 })),
      count: consignmentRows.length,
      costTotal: consignmentRows.reduce((sum, row) => sum + row.cost, 0),
    } satisfies InventoryStatusBlock,
  };
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

function ConsignmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
      <path
        d="M7.5 8.5h9.2a2 2 0 0 1 1.7 1l1.8 3v6.2H5.8V12.5l1.7-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8.5V6.6A2.6 2.6 0 0 1 11.6 4h.8A2.6 2.6 0 0 1 15 6.6v1.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
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
            <td className="is-code" title={row.serialNumber}>
              {row.serialNumber}
            </td>
            <td className="is-code" title={row.vin}>
              {row.vin}
            </td>
            <td className="is-code" title={row.vehicleNumber}>
              {row.vehicleNumber}
            </td>
            <td className="is-date">{row.inboundDate}</td>
            <td className={`is-num${row.daysAlert ? " is-days-alert" : ""}`}>
              {row.days}
            </td>
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
  const [showConsignment, setShowConsignment] = useState(false);

  const reservedCount = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "RESERVED");
    return sum + (block?.count ?? 0);
  }, 0);
  const soldCount = report.locations.reduce((sum, location) => {
    const block = location.statuses.find((item) => item.status === "SOLD");
    return sum + (block?.count ?? 0);
  }, 0);
  const availableParts = report.locations.map((location) => ({
    location: location.location,
    available: location.statuses.find((item) => item.status === "AVAILABLE"),
    reserved: location.statuses.find((item) => item.status === "RESERVED"),
    sold: location.statuses.find((item) => item.status === "SOLD"),
  }));
  const splitAvailable = availableParts.map((item) => ({
    ...item,
    ...splitConsignment(item.available),
  }));
  const availableCount = splitAvailable.reduce(
    (sum, item) => sum + item.stock.count,
    0,
  );
  const availableCost = splitAvailable.reduce(
    (sum, item) => sum + item.stock.costTotal,
    0,
  );
  const consignmentCount = splitAvailable.reduce(
    (sum, item) => sum + item.consignment.count,
    0,
  );

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
            className={`inventory-status-icon${showConsignment ? " is-on" : ""}`}
            aria-pressed={showConsignment}
            title="위탁 판매 보기"
            onClick={() => setShowConsignment((open) => !open)}
          >
            <ConsignmentIcon />
            <span>위탁 판매 {consignmentCount.toLocaleString("ko-KR")}</span>
          </button>
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

      {splitAvailable.map((location) => {
        return (
          <section key={location.location} className="inventory-location">
            <h2>
              {location.location}
              <CountLabel
                count={location.stock.count}
                cost={location.stock.costTotal}
              />
            </h2>

            <div className="inventory-status">
              <h3>
                판매중
                <CountLabel
                  count={location.stock.count}
                  cost={location.stock.costTotal}
                />
              </h3>
              <StatusTable block={location.stock} />
            </div>

            {showConsignment ? (
              <div className="inventory-status">
                <h3>
                  위탁 판매
                  <CountLabel
                    count={location.consignment.count}
                    cost={location.consignment.costTotal}
                  />
                </h3>
                <StatusTable block={location.consignment} />
              </div>
            ) : null}

            {showReserved && location.reserved ? (
              <div className="inventory-status">
                <h3>
                  예약완료
                  <CountLabel
                    count={location.reserved.count}
                    cost={location.reserved.costTotal}
                  />
                </h3>
                <StatusTable block={location.reserved} />
              </div>
            ) : null}

            {showSold && location.sold ? (
              <div className="inventory-status">
                <h3>
                  판매완료
                  <CountLabel
                    count={location.sold.count}
                    cost={location.sold.costTotal}
                  />
                </h3>
                <StatusTable block={location.sold} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
