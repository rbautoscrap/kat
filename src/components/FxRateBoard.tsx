"use client";

import { useEffect, useState } from "react";
import type { FxBoardQuote } from "@/lib/fx-rates";

const POLL_MS = 45_000;

function formatWon(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatKstTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function Pair({
  code,
  value,
  unit,
}: {
  code: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-3 sm:px-5">
      <span className="text-[10px] font-semibold tracking-[0.18em] text-neutral-400">
        {code}
      </span>
      <strong className="mt-0.5 font-medium tabular-nums text-[15px] leading-none tracking-tight text-neutral-800 sm:text-[17px]">
        {value}
      </strong>
      <span className="mt-1 text-[10px] tracking-wide text-neutral-400">
        {unit}
      </span>
    </div>
  );
}

export function FxRateBoard({ initial }: { initial?: FxBoardQuote | null }) {
  const [quote, setQuote] = useState<FxBoardQuote | null>(initial ?? null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/fx", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as FxBoardQuote & { ok?: boolean };
        if (cancelled || !data.ok || !data.usd || !data.eur) return;
        setQuote({ usd: data.usd, eur: data.eur, asOf: data.asOf });
      } catch {
        /* keep last quote */
      }
    }

    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    if (!initial) void load();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial]);

  const time = quote ? formatKstTime(quote.asOf) : "";

  return (
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] text-neutral-400">
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-800"
          aria-hidden
        />
        <span>LIVE</span>
        {time ? <span className="tracking-wide">{time} KST</span> : null}
      </div>
      <div
        className="flex items-start divide-x divide-neutral-200"
        aria-label="Today's exchange rates"
      >
        <Pair
          code="USD"
          value={quote ? formatWon(quote.usd) : "—"}
          unit="₩ / $1"
        />
        <Pair
          code="EUR"
          value={quote ? formatWon(quote.eur) : "—"}
          unit="₩ / €1"
        />
        <Pair
          code="KRW"
          value="1,000"
          unit={
            quote
              ? `$${formatWon(1000 / quote.usd)} · €${formatWon(1000 / quote.eur)}`
              : "₩1,000"
          }
        />
      </div>
    </div>
  );
}
