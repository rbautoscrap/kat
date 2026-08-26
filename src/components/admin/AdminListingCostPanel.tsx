const MARGIN_RATES = [0.05, 0.1, 0.2] as const;

function parseWonDigits(value?: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function formatWon(value?: string | null): string {
  const n = parseWonDigits(value);
  if (n == null) return "—";
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatMarginWon(cost: number, rate: number) {
  return `${Math.round(cost * (1 + rate)).toLocaleString("ko-KR")}원`;
}

type Props = {
  costPrice?: string | null;
  accumulatedDays?: number | null;
  /** Unique detail-page views (IP / member deduped). Admin-only. */
  viewCount?: number | null;
  /** When false, hide cost / days (e.g. used-parts listings). */
  showCostFields?: boolean;
};

/** Admin-only cost / days / views summary on listing detail (members never see this). */
export function AdminListingCostPanel({
  costPrice,
  accumulatedDays,
  viewCount = 0,
  showCostFields = true,
}: Props) {
  const days =
    accumulatedDays == null
      ? "—"
      : `${accumulatedDays.toLocaleString("ko-KR")}일`;
  const views = (viewCount ?? 0).toLocaleString("ko-KR");
  const cost = showCostFields ? parseWonDigits(costPrice) : null;

  return (
    <section className="mb-3 rounded-sm border border-amber-200 bg-amber-50/60 px-3 py-2 sm:px-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          {showCostFields ? (
            <>
              <p className="flex items-baseline gap-1.5">
                <span className="font-medium tracking-wide text-amber-900/80">
                  원가
                </span>
                <span className="font-semibold tabular-nums text-red-600">
                  {formatWon(costPrice)}
                </span>
              </p>
              <span
                className="hidden h-3 w-px bg-amber-200 sm:block"
                aria-hidden
              />
              <p className="flex items-baseline gap-1.5">
                <span className="font-medium tracking-wide text-amber-900/80">
                  누적일
                </span>
                <span className="font-semibold tabular-nums text-red-600">
                  {days}
                </span>
              </p>
              <span
                className="hidden h-3 w-px bg-amber-200 sm:block"
                aria-hidden
              />
            </>
          ) : null}
          <p className="flex items-baseline gap-1.5">
            <span className="font-medium tracking-wide text-amber-900/80">
              조회수
            </span>
            <span
              className={`font-semibold tabular-nums ${
                (viewCount ?? 0) >= 300 ? "text-blue-600" : "text-red-600"
              }`}
              title="상세 페이지 고유 조회수 (동일 IP·회원 중복 제외)"
            >
              {views}
            </span>
          </p>
        </div>
        <p className="shrink-0 text-[11px] tracking-wide text-amber-900/65">
          관리자 · 회원 비공개
        </p>
      </div>
      {cost != null && cost > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-amber-200/80 pt-1.5 text-[12.5px]">
          {MARGIN_RATES.map((rate) => (
            <p key={rate} className="flex items-baseline gap-1.5">
              <span className="font-medium tracking-wide text-amber-900/80">
                마진 {Math.round(rate * 100)}%
              </span>
              <span className="font-semibold tabular-nums text-red-700">
                {formatMarginWon(cost, rate)}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
