"use client";

import { useEffect, useState } from "react";

function formatCount(n: number) {
  return n.toLocaleString("en-US");
}

export function VisitStats() {
  const [todayVisits, setTodayVisits] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);

  useEffect(() => {
    void fetch("/api/visits", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { todayVisits?: number; totalVisits?: number } | null) => {
        if (!data) return;
        setTodayVisits(Number(data.todayVisits) || 0);
        setTotalVisits(Number(data.totalVisits) || 0);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="text-neutral-400">
      Visits Today: {formatCount(todayVisits)} / Total: {formatCount(totalVisits)}
    </div>
  );
}
