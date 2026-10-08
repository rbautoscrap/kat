"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Card emphasis for auctions closing inside this window. */
export const LIVE_AUCTION_CLOSING_MS = 2 * 60 * 60 * 1000;

export function isAuctionClosingSoon(endsAt: string, now = Date.now()) {
  const endMs = new Date(endsAt).getTime();
  if (!Number.isFinite(endMs)) return false;
  const left = endMs - now;
  return left > 0 && left <= LIVE_AUCTION_CLOSING_MS;
}

type Props = {
  endsAt: string;
  /** Compact label under listing cards */
  compact?: boolean;
  /** Red inline timer above offer Currency label */
  variant?: "default" | "offer";
  /** Member detail gets a fuller timer; admin stays compact-inline */
  emphasize?: boolean;
  className?: string;
  /** Fires only when the closing-soon flag changes. */
  onClosingChange?: (closing: boolean) => void;
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
    <div className="w-[3.75rem] shrink-0 text-center sm:w-[4.25rem]">
      <div
        className={`rounded-sm border bg-neutral-50 px-1 py-2 font-mono text-[1.2rem] font-semibold tabular-nums tracking-[0.08em] sm:text-[1.35rem] ${
          urgent
            ? "border-[var(--accent)]/35 text-[var(--accent)]"
            : "border-[var(--line)] text-neutral-800"
        }`}
      >
        {value}
      </div>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
    </div>
  );
}

function Colon() {
  return (
    <span
      className="mb-5 select-none self-center font-mono text-[1.15rem] font-medium text-neutral-300 sm:text-[1.3rem]"
      aria-hidden
    >
      :
    </span>
  );
}

export function AuctionCountdown({
  endsAt,
  compact = false,
  variant = "default",
  emphasize = true,
  className = "",
  onClosingChange,
}: Props) {
  const router = useRouter();
  const onClosingChangeRef = useRef(onClosingChange);
  onClosingChangeRef.current = onClosingChange;
  const endMs = new Date(endsAt).getTime();
  const [parts, setParts] = useState<Parts>(() =>
    toParts(Number.isFinite(endMs) ? endMs - Date.now() : 0),
  );

  useEffect(() => {
    if (!Number.isFinite(endMs)) return;

    // Already ended when mounted — keep static label, do not refresh-loop.
    if (endMs - Date.now() <= 0) {
      setParts(toParts(0));
      return;
    }

    let refreshed = false;
    let id = 0;
    const closingRef = { current: isAuctionClosingSoon(endsAt) };
    const tick = () => {
      const next = endMs - Date.now();
      setParts(toParts(next));
      const closing = next > 0 && next <= LIVE_AUCTION_CLOSING_MS;
      if (closing !== closingRef.current) {
        closingRef.current = closing;
        onClosingChangeRef.current?.(closing);
      }
      if (next <= 0 && !refreshed) {
        refreshed = true;
        window.clearInterval(id);
        // Refresh once when the timer crosses zero (not every second while ended).
        router.refresh();
      }
    };

    tick();
    id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endMs, endsAt, router]);

  const ended = parts.totalMs <= 0;
  const urgent = !ended && parts.totalMs < 60 * 60 * 1000;
  const finalMinutes = !ended && parts.totalMs < 10 * 60 * 1000;

  if (variant === "offer") {
    return (
      <p
        className={`font-mono text-[24px] font-semibold leading-none tabular-nums tracking-wide text-red-600 ${className}`}
        lang="en"
        role="timer"
        aria-live="polite"
        aria-label={
          ended
            ? "Auction ended"
            : `Live auction ends in ${formatCompact(parts)}`
        }
      >
        {ended ? "Ended" : formatCompact(parts)}
      </p>
    );
  }

  if (compact) {
    return (
      <p
        className={`mt-1 font-mono text-[11.5px] tabular-nums tracking-wide ${
          ended
            ? "font-medium text-neutral-400"
            : parts.totalMs <= LIVE_AUCTION_CLOSING_MS
              ? "font-semibold text-red-700"
              : "font-medium text-red-600"
        } ${className}`}
      >
        {ended
          ? "Auction ended"
          : parts.totalMs <= LIVE_AUCTION_CLOSING_MS
            ? `Closing ${formatCompact(parts)}`
            : `Ends in ${formatCompact(parts)}`}
      </p>
    );
  }

  if (ended) {
    return (
      <div
        className={`mb-4 rounded-sm border border-[var(--line)] bg-white px-3 py-3 sm:px-4 ${className}`}
        lang="en"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
          Live Auction
        </p>
        <p className="mt-1 font-mono text-[1.1rem] tabular-nums tracking-wide text-neutral-500">
          Auction ended
        </p>
      </div>
    );
  }

  const statusRight = finalMinutes
    ? "Closing soon"
    : urgent
      ? "Final hour"
      : "Bidding open";

  const statusLine = finalMinutes
    ? "Closing soon — submit your offer now"
    : urgent
      ? "Final hour — bidding closes soon"
      : "Time remaining until bidding closes";

  // Admin: same white panel, single-line timer (less vertical space).
  if (!emphasize) {
    return (
      <div
        className={`mb-4 rounded-sm border border-[var(--line)] bg-white px-3 py-2.5 sm:px-4 ${className}`}
        lang="en"
        role="timer"
        aria-label={`Live auction ends in ${formatCompact(parts)}`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            Live Auction
          </p>
          <p
            className={`font-mono text-[1.05rem] tabular-nums tracking-wide ${
              urgent ? "text-[var(--accent)]" : "text-neutral-800"
            }`}
          >
            {formatCompact(parts)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-5 rounded-sm border border-[var(--line)] bg-white ${className}`}
      lang="en"
      role="timer"
      aria-live="polite"
      aria-label={`Live auction ends in ${formatCompact(parts)}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--line)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              urgent ? "bg-[var(--accent)]" : "bg-neutral-400"
            }`}
            aria-hidden
          />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Live Auction
          </span>
        </div>
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.12em] ${
            urgent ? "text-[var(--accent)]" : "text-neutral-400"
          }`}
        >
          {statusRight}
        </span>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex items-end gap-1.5 sm:gap-2">
          {parts.days > 0 ? (
            <>
              <DigitBlock
                value={String(parts.days)}
                label="Days"
                urgent={urgent}
              />
              <Colon />
            </>
          ) : null}
          <DigitBlock value={pad2(parts.hours)} label="Hours" urgent={urgent} />
          <Colon />
          <DigitBlock value={pad2(parts.mins)} label="Mins" urgent={urgent} />
          <Colon />
          <DigitBlock value={pad2(parts.secs)} label="Secs" urgent={urgent} />
        </div>
        <p className="mt-2.5 text-[12.5px] tracking-wide text-neutral-500">
          {statusLine}
        </p>
      </div>
    </div>
  );
}
