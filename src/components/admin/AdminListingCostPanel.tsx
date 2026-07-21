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
};

/** Admin-only internal cost summary on listing detail. */
export function AdminListingCostPanel({
  auctionPrice,
  incidentalCost,
  costPrice,
}: Props) {
  const rows = [
    { label: "낙찰가", value: formatWon(auctionPrice) },
    { label: "부대비용", value: formatWon(incidentalCost) },
    { label: "원가", value: formatWon(costPrice) },
  ];

  return (
    <section className="mb-7 overflow-hidden rounded-sm border border-amber-200 bg-amber-50/70">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-amber-200 px-4 py-2.5 sm:px-5">
        <div>
          <h2 className="text-[13.5px] font-semibold tracking-wide text-amber-950">
            관리자 · 낙찰 / 원가
          </h2>
          <p className="mt-0.5 text-[12px] tracking-wide text-amber-900/75">
            회원에게는 표시되지 않습니다.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`px-4 py-3.5 sm:px-5 ${
              index < rows.length - 1
                ? "border-b border-amber-200 sm:border-r sm:border-b-0"
                : ""
            }`}
          >
            <p className="text-[12px] font-medium tracking-wide text-amber-900/80">
              {row.label}
            </p>
            <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-wide text-neutral-900">
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
