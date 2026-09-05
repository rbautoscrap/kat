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

function Rate({
  code,
  value,
  unit,
}: {
  code: string;
  value: string;
  unit: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold tracking-[0.14em] text-neutral-400">
        {code}
      </span>
      <strong className="text-[12px] font-medium tabular-nums tracking-tight text-neutral-800">
        {value}
      </strong>
      <span className="text-[10px] text-neutral-400">{unit}</span>
    </span>
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
    <div className="border-t border-[var(--line)] bg-neutral-50/90">
      <div
        className="site-container flex h-8 items-center justify-center gap-x-3 overflow-x-auto whitespace-nowrap text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Today's exchange rates"
      >
        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] tracking-[0.12em] text-neutral-400">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-800"
            aria-hidden
          />
          LIVE
          {time ? <span className="tracking-wide">{time} KST</span> : null}
        </span>
        <Rate
          code="USD"
          value={quote ? formatWon(quote.usd) : "—"}
          unit="₩/$1"
        />
        <span className="h-3 w-px shrink-0 bg-neutral-200" aria-hidden />
        <Rate
          code="EUR"
          value={quote ? formatWon(quote.eur) : "—"}
          unit="₩/€1"
        />
        <span className="h-3 w-px shrink-0 bg-neutral-200" aria-hidden />
        <Rate
          code="KRW"
          value="1,000"
          unit={
            quote
              ? `$${formatWon(1000 / quote.usd)} · €${formatWon(1000 / quote.eur)}`
              : ""
          }
        />
      </div>
    </div>
  );
}
