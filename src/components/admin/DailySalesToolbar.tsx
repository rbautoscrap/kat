"use client";

import { useRouter } from "next/navigation";

type Props = {
  date: string;
};

export function DailySalesToolbar({ date }: Props) {
  const router = useRouter();

  return (
    <div className="daily-sales-toolbar">
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
    </div>
  );
}
