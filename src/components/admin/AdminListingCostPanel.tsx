function formatWon(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  const n = Number(digits);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("ko-KR")}원`;
}

type Props = {
  costPrice?: string | null;
  accumulatedDays?: number | null;
};

/** Admin-only cost / days summary on listing detail (members never see this). */
export function AdminListingCostPanel({
  costPrice,
  accumulatedDays,
}: Props) {
  const days =
    accumulatedDays == null
      ? "—"
      : `${accumulatedDays.toLocaleString("ko-KR")}일`;

  return (
    <section className="mb-3 rounded-sm border border-amber-200 bg-amber-50/60 px-3 py-2 sm:px-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          <p className="flex items-baseline gap-1.5">
            <span className="font-medium tracking-wide text-amber-900/80">
              원가
            </span>
            <span className="font-semibold tabular-nums text-red-600">
              {formatWon(costPrice)}
            </span>
          </p>
          <span className="hidden h-3 w-px bg-amber-200 sm:block" aria-hidden />
          <p className="flex items-baseline gap-1.5">
            <span className="font-medium tracking-wide text-amber-900/80">
              누적일
            </span>
            <span className="font-semibold tabular-nums text-red-600">
              {days}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-[11px] tracking-wide text-amber-900/65">
          관리자 · 회원 비공개
        </p>
      </div>
    </section>
  );
}
