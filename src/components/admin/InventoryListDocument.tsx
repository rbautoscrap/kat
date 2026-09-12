"use client";

import { useState } from "react";
import type {
  InventoryListReport,
  InventoryListRow,
  InventoryStatusBlock,
} from "@/lib/inventory-list-types";

type SortKey = "cost" | "days";
type SortDir = "asc" | "desc";
type LocationSort = { key: SortKey; dir: SortDir };

const DEFAULT_SORT: LocationSort = { key: "cost", dir: "desc" };

function sortBlock(block: InventoryStatusBlock, sort: LocationSort): InventoryStatusBlock {
  const rows = [...block.rows].sort((a, b) => compareRows(a, b, sort));
  return {
    ...block,
    rows: rows.map((row, index) => ({ ...row, no: index + 1 })),
  };
}

function compareRows(a: InventoryListRow, b: InventoryListRow, sort: LocationSort) {
  if (sort.key === "days") {
    const aMissing = a.daysValue < 0;
    const bMissing = b.daysValue < 0;
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    if (a.daysValue !== b.daysValue) {
      return sort.dir === "desc"
        ? b.daysValue - a.daysValue
        : a.daysValue - b.daysValue;
    }
  } else if (a.cost !== b.cost) {
    return sort.dir === "desc" ? b.cost - a.cost : a.cost - b.cost;
  }
  return a.title.localeCompare(b.title, "ko");
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
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

function CostSortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.4v9.2M9.4 9.6c.6-.8 1.5-1.2 2.6-1.2 1.6 0 2.6.8 2.6 2 0 2.7-5.2 1.4-5.2 4 0 1.2 1.1 2.1 2.7 2.1 1.1 0 2-.4 2.6-1.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DaysSortIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-4 w-4">
      <rect
        x="4.4"
        y="5.4"
        width="15.2"
        height="14.2"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.8v3.2M16 3.8v3.2M4.6 9.4h14.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortDirIcon({ dir }: { dir: SortDir }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden className="h-3 w-3">
      {dir === "desc" ? (
        <path
          d="M2.2 4.2 6 8l3.8-3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M2.2 7.8 6 4l3.8 3.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function LocationSortButtons({
  location,
  sort,
  onSort,
}: {
  location: string;
  sort: LocationSort;
  onSort: (location: string, key: SortKey) => void;
}) {
  return (
    <div className="inventory-sort-toggles inventory-no-print">
      <button
        type="button"
        className={`inventory-sort-icon${sort.key === "cost" ? " is-on" : ""}`}
        aria-pressed={sort.key === "cost"}
        title={
          sort.key === "cost" && sort.dir === "desc"
            ? "원가 낮은순"
            : "원가 높은순"
        }
        onClick={() => onSort(location, "cost")}
      >
        <CostSortIcon />
        <span>원가</span>
        {sort.key === "cost" ? <SortDirIcon dir={sort.dir} /> : null}
      </button>
      <button
        type="button"
        className={`inventory-sort-icon${sort.key === "days" ? " is-on" : ""}`}
        aria-pressed={sort.key === "days"}
        title={
          sort.key === "days" && sort.dir === "desc"
            ? "누적일 낮은순"
            : "누적일 높은순"
        }
        onClick={() => onSort(location, "days")}
      >
        <DaysSortIcon />
        <span>누적</span>
        {sort.key === "days" ? <SortDirIcon dir={sort.dir} /> : null}
      </button>
    </div>
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
          <th>낙찰일</th>
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
                target="_blank"
                rel="noopener noreferrer"
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
  const [sorts, setSorts] = useState<Record<string, LocationSort>>({});

  function locationSort(location: string): LocationSort {
    return sorts[location] ?? DEFAULT_SORT;
  }

  function toggleLocationSort(location: string, key: SortKey) {
    setSorts((prev) => {
      const current = prev[location] ?? DEFAULT_SORT;
      if (current.key === key) {
        return {
          ...prev,
          [location]: { key, dir: current.dir === "desc" ? "asc" : "desc" },
        };
      }
      return { ...prev, [location]: { key, dir: "desc" } };
    });
  }

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
          충주·진천 입고지별 · 판매중 · 사업소별 원가·누적 정렬
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
        const sort = locationSort(location.location);
        const stock = sortBlock(location.stock, sort);
        const consignment = sortBlock(location.consignment, sort);
        const reserved = location.reserved
          ? sortBlock(location.reserved, sort)
          : null;
        const sold = location.sold ? sortBlock(location.sold, sort) : null;

        return (
          <section key={location.location} className="inventory-location">
            <div className="inventory-location-head">
              <h2>
                {location.location}
                <CountLabel
                  count={location.stock.count}
                  cost={location.stock.costTotal}
                />
              </h2>
              <LocationSortButtons
                location={location.location}
                sort={sort}
                onSort={toggleLocationSort}
              />
            </div>

            <div className="inventory-status">
              <h3>
                판매중
                <CountLabel
                  count={location.stock.count}
                  cost={location.stock.costTotal}
                />
              </h3>
              <StatusTable block={stock} />
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
                <StatusTable block={consignment} />
              </div>
            ) : null}

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
                  <CountLabel
                    count={sold.count}
                    cost={sold.costTotal}
                  />
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
