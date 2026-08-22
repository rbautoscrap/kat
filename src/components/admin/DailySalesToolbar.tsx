"use client";

import { useRouter } from "next/navigation";

type Props = {
  date: string;
  month: string;
  view: "daily" | "month";
};

export function DailySalesToolbar({ date, month, view }: Props) {
  const router = useRouter();

  return (
    <div className="daily-sales-toolbar">
      <div className="daily-sales-view-tabs" role="tablist" aria-label="보고서 종류">
        <button
          type="button"
          role="tab"
          aria-selected={view === "daily"}
          className={view === "daily" ? "is-active" : undefined}
          onClick={() => router.push(`/admin/sales-daily?date=${date}`)}
        >
          일일
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "month"}
          className={view === "month" ? "is-active" : undefined}
          onClick={() =>
            router.push(`/admin/sales-daily?view=month&month=${month}`)
          }
        >
          월말보고
        </button>
      </div>
      {view === "month" ? (
        <label className="daily-sales-date-label">
          기준월
          <input
            type="month"
            value={month}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              router.push(`/admin/sales-daily?view=month&month=${next}`);
            }}
            className="daily-sales-date-input"
          />
        </label>
      ) : (
        <label className="daily-sales-date-label">
          작성일
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              router.push(`/admin/sales-daily?date=${next}`);
            }}
            className="daily-sales-date-input"
          />
        </label>
      )}
    </div>
  );
}
