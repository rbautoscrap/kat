"use client";

import { useRouter } from "next/navigation";
import type { SalesDailyView } from "@/lib/sales-daily";

type Props = {
  date: string;
  month: string;
  view: SalesDailyView;
};

function LedgerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M5 2.5h8.5A1.5 1.5 0 0 1 15 4v12.5A1.5 1.5 0 0 1 13.5 18h-9A1.5 1.5 0 0 1 3 16.5V5.2L5 2.5Zm0 1.6L4.4 5H5V4.1ZM6.2 8.2h6.1v1.2H6.2V8.2Zm0 2.6h6.1v1.2H6.2v-1.2Zm0 2.6h4.4v1.2H6.2v-1.2Z" />
    </svg>
  );
}

function FxIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2Zm0 1.4a6.6 6.6 0 1 0 0 13.2A6.6 6.6 0 0 0 10 3.4Zm.9 2.4v1.15c1.15.18 2 .78 2 1.62 0 .97-1.08 1.62-2.55 1.78v2.38c.62-.08 1.16-.3 1.58-.64l.82.9c-.58.5-1.32.84-2.4.96V15h-1.5v-1.05c-1.2-.2-2.05-.82-2.05-1.72 0-1 .98-1.64 2.05-1.78V8.2c-.5.08-.92.26-1.24.52l-.78-.92c.5-.42 1.16-.72 2.02-.84V5.8h1.5Zm-1.5 6.38c-.42.1-.7.28-.7.5 0 .24.3.42.7.5v-1Zm1.5-3.55V7.1c.48.1.78.3.78.54 0 .24-.28.42-.78.5Z" />
    </svg>
  );
}

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
      <div className="daily-sales-ledger-icons" role="group" aria-label="미수금 조회">
        <button
          type="button"
          className={view === "recv" ? "is-active" : undefined}
          title="미수금 현황"
          aria-label="미수금 현황"
          aria-pressed={view === "recv"}
          onClick={() =>
            router.push(`/admin/sales-daily?view=recv&date=${date}`)
          }
        >
          <LedgerIcon />
          <span>미수</span>
        </button>
        <button
          type="button"
          className={view === "fx" ? "is-active" : undefined}
          title="외화 미수금 현황"
          aria-label="외화 미수금 현황"
          aria-pressed={view === "fx"}
          onClick={() => router.push(`/admin/sales-daily?view=fx&date=${date}`)}
        >
          <FxIcon />
          <span>외화</span>
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
              const viewQs =
                view === "recv" || view === "fx" ? `&view=${view}` : "";
              router.push(`/admin/sales-daily?date=${next}${viewQs}`);
            }}
            className="daily-sales-date-input"
          />
        </label>
      )}
    </div>
  );
}
