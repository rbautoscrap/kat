function formatWon(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  auctionPrice?: string | null;
  incidentalCost?: string | null;
  costPrice?: string | null;
  accumulatedDays?: number | null;
};

/** Admin-only internal cost / days summary on listing detail. */
export function AdminListingCostPanel({
  auctionPrice,
  incidentalCost,
  costPrice,
  accumulatedDays,
}: Props) {
  const rows = [
    { label: "낙찰가", value: formatWon(auctionPrice) },
    { label: "부대비용", value: formatWon(incidentalCost) },
    { label: "원가", value: formatWon(costPrice) },
    {
      label: "누적일",
      value:
        accumulatedDays == null
          ? "—"
          : `${accumulatedDays.toLocaleString("ko-KR")}일`,
    },
  ];

  return (
    <section className="mb-4 overflow-hidden rounded-sm border border-amber-200 bg-amber-50/60">
      <div className="flex items-center justify-between gap-3 border-b border-amber-200 px-3 py-1.5 sm:px-3.5">
        <h2 className="text-[12.5px] font-semibold tracking-wide text-amber-950">
          관리자 · 낙찰 / 원가 / 누적일
        </h2>
        <p className="text-[11px] tracking-wide text-amber-900/70">
          회원 비공개
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex min-h-[2.75rem] items-baseline justify-between gap-2 px-3 py-2 sm:flex-col sm:justify-center sm:gap-0.5 sm:px-3.5 ${
              index % 2 === 0 ? "border-r border-amber-200 sm:border-r" : ""
            } ${index < 2 ? "border-b border-amber-200 sm:border-b-0" : ""} ${
              index < rows.length - 1 ? "sm:border-r sm:border-amber-200" : ""
            }`}
          >
            <p className="shrink-0 text-[11px] font-medium tracking-wide text-amber-900/80">
              {row.label}
            </p>
            <p className="text-right text-[13.5px] font-semibold tabular-nums tracking-wide text-neutral-900 sm:text-left">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
