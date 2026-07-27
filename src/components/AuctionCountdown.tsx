"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  endsAt: string;
  /** Compact label under listing cards */
  compact?: boolean;
  /** Stronger tension styling for member-facing surfaces */
  emphasize?: boolean;
  className?: string;
};

type Parts = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  totalMs: number;
};

function toParts(ms: number): Parts {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    mins: Math.floor((totalSec % 3600) / 60),
    secs: totalSec % 60,
    totalMs: clamped,
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCompact(parts: Parts): string {
  const hms = `${pad2(parts.hours)}:${pad2(parts.mins)}:${pad2(parts.secs)}`;
  return parts.days > 0 ? `${parts.days}d ${hms}` : hms;
}

function DigitBlock({
  value,
  label,
  urgent,
}: {
  value: string;
  label: string;
  urgent: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div
        className={`rounded-sm border px-1 py-2 font-mono text-[1.35rem] font-semibold tabular-nums tracking-[0.06em] sm:text-[1.65rem] ${
          urgent
            ? "border-amber-300/50 bg-black/35 text-amber-50"
            : "border-white/15 bg-black/25 text-white"
        }`}
      >
        {value}
      </div>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/65">
        {label}
      </p>
    </div>
  );
}

function Colon({ urgent }: { urgent: boolean }) {
  return (
    <span
      className={`mb-5 select-none self-center font-mono text-[1.25rem] font-bold sm:text-[1.45rem] ${
        urgent ? "animate-pulse text-amber-200" : "text-white/55"
      }`}
      aria-hidden
    >
      :
    </span>
  );
}

export function AuctionCountdown({
  endsAt,
  compact = false,
  emphasize = true,
  className = "",
}: Props) {
  const router = useRouter();
  const endMs = new Date(endsAt).getTime();
  const [parts, setParts] = useState<Parts>(() =>
    toParts(Number.isFinite(endMs) ? endMs - Date.now() : 0),
  );

  useEffect(() => {
    if (!Number.isFinite(endMs)) return;

    const tick = () => {
      const next = endMs - Date.now();
      setParts(toParts(next));
      if (next <= 0) {
        router.refresh();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endMs, router]);

  const ended = parts.totalMs <= 0;
  const urgent = !ended && parts.totalMs < 60 * 60 * 1000;
  const finalMinutes = !ended && parts.totalMs < 10 * 60 * 1000;

  if (compact) {
    return (
      <p
        className={`mt-1 flex items-center gap-1.5 font-mono text-[11.5px] tabular-nums tracking-wide ${
          ended
            ? "text-neutral-400"
            : urgent
              ? "font-semibold text-rose-700"
              : "font-medium text-rose-700"
        } ${className}`}
      >
        {!ended ? (
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              urgent ? "animate-pulse bg-rose-600" : "bg-rose-500"
            }`}
            aria-hidden
          />
        ) : null}
        {ended ? "Auction ended" : `Ends in ${formatCompact(parts)}`}
      </p>
    );
  }

  if (ended) {
    return (
      <div
        className={`mb-4 rounded-sm border border-neutral-200 bg-neutral-50 px-3 py-3 sm:px-4 ${className}`}
        lang="en"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          Live Auction
        </p>
        <p className="mt-1 font-mono text-[1.2rem] tabular-nums tracking-wide text-neutral-600">
          Auction ended
        </p>
      </div>
    );
  }

  if (!emphasize) {
    return (
      <div
        className={`mb-4 rounded-sm border border-rose-200 bg-rose-50/70 px-3 py-2.5 ${className}`}
        lang="en"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
          Live Auction
        </p>
        <p className="mt-0.5 font-mono text-[1.15rem] tabular-nums tracking-wide text-rose-800">
          {formatCompact(parts)}
        </p>
        <p className="mt-0.5 text-[12px] tracking-wide text-neutral-500">
          Time remaining until bidding closes
        </p>
      </div>
    );
  }

  const statusLine = finalMinutes
    ? "Closing soon — submit your offer now"
    : urgent
      ? "Final hour — bidding closes soon"
      : "Time remaining until bidding closes";

  return (
    <div
      className={`mb-5 overflow-hidden rounded-sm border shadow-sm ${
        urgent
          ? "border-amber-600/80 bg-[#7a101f] shadow-amber-900/10"
          : "border-[#9a1528] bg-[#8f1224]"
      } ${className}`}
      lang="en"
      role="timer"
      aria-live="polite"
      aria-label={`Live auction ends in ${formatCompact(parts)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/55" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            Live Auction
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
            urgent ? "animate-pulse text-amber-200" : "text-white/75"
          }`}
        >
          {finalMinutes ? "Closing soon" : urgent ? "Final hour" : "Bidding open"}
        </span>
      </div>

      <div
        className={`px-3 pb-3 pt-1 sm:px-4 sm:pb-3.5 ${
          urgent ? "bg-black/25" : "bg-black/20"
        }`}
      >
        <div className="flex items-end gap-1.5 sm:gap-2">
          {parts.days > 0 ? (
            <>
              <DigitBlock
                value={String(parts.days)}
                label="Days"
                urgent={urgent}
              />
              <Colon urgent={urgent} />
            </>
          ) : null}
          <DigitBlock value={pad2(parts.hours)} label="Hours" urgent={urgent} />
          <Colon urgent={urgent} />
          <DigitBlock value={pad2(parts.mins)} label="Mins" urgent={urgent} />
          <Colon urgent={urgent} />
          <DigitBlock value={pad2(parts.secs)} label="Secs" urgent={urgent} />
        </div>
        <p className="mt-2.5 text-[12.5px] tracking-wide text-white/80">
          {statusLine}
        </p>
      </div>
    </div>
  );
}
