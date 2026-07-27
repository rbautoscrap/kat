"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  endsAt: string;
  /** Compact label under listing cards */
  compact?: boolean;
  className?: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

export function AuctionCountdown({
  endsAt,
  compact = false,
  className = "",
}: Props) {
  const router = useRouter();
  const endMs = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() =>
    Number.isFinite(endMs) ? endMs - Date.now() : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(endMs)) return;

    const tick = () => {
      const next = endMs - Date.now();
      setRemaining(next);
      if (next <= 0) {
        router.refresh();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endMs, router]);

  const ended = remaining <= 0;
  const label = ended ? "Ended" : formatRemaining(remaining);

  if (compact) {
    return (
      <p
        className={`mt-1 font-mono text-[11.5px] tabular-nums tracking-wide ${
          ended ? "text-neutral-400" : "text-rose-700"
        } ${className}`}
      >
        {ended ? "Auction ended" : `Ends in ${label}`}
      </p>
    );
  }

  return (
    <div
      className={`mb-4 rounded-sm border px-3 py-2.5 ${
        ended
          ? "border-neutral-200 bg-neutral-50"
          : "border-rose-200 bg-rose-50/70"
      } ${className}`}
      lang="en"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        Live Auction
      </p>
      <p
        className={`mt-0.5 font-mono text-[1.15rem] tabular-nums tracking-wide ${
          ended ? "text-neutral-500" : "text-rose-800"
        }`}
      >
        {ended ? "Auction ended" : label}
      </p>
      {!ended ? (
        <p className="mt-0.5 text-[12px] tracking-wide text-neutral-500">
          Time remaining until bidding closes
        </p>
      ) : null}
    </div>
  );
}
