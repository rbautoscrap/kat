import Link from "next/link";
import { buildPageHref, totalPages } from "@/lib/admin-pagination";

type Props = {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
};

export function AdminPagination({
  basePath,
  page,
  total,
  pageSize,
  params = {},
}: Props) {
  const pages = totalPages(total, pageSize);
  if (total === 0) return null;

  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  const prevHref = buildPageHref(basePath, current - 1, params);
  const nextHref = buildPageHref(basePath, current + 1, params);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3.5 text-[12.5px] tracking-wide text-neutral-500">
      <p>
        총 {total.toLocaleString("ko-KR")}건 중 {start}–{end} · {current}/
        {pages} 페이지
      </p>
      <div className="flex items-center gap-1.5">
        {current > 1 ? (
          <Link
            href={prevHref}
            className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-neutral-700 hover:bg-neutral-50"
          >
            이전
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-neutral-100 px-3 text-neutral-300">
            이전
          </span>
        )}

        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter((p) => {
            if (pages <= 7) return true;
            if (p === 1 || p === pages) return true;
            return Math.abs(p - current) <= 1;
          })
          .reduce<number[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1]! > 1) acc.push(-1);
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === -1 ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-neutral-300">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={buildPageHref(basePath, p, params)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border text-center tabular-nums ${
                  p === current
                    ? "border-neutral-800 bg-neutral-800 text-white"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {p}
              </Link>
            ),
          )}

        {current < pages ? (
          <Link
            href={nextHref}
            className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-neutral-700 hover:bg-neutral-50"
          >
            다음
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center rounded-md border border-neutral-100 px-3 text-neutral-300">
            다음
          </span>
        )}
      </div>
    </div>
  );
}
