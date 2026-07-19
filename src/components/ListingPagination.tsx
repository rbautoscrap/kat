import Link from "next/link";
import { buildPageHref, totalPages } from "@/lib/admin-pagination";

type Props = {
  basePath: string;
  page: number;
  total: number;
  pageSize: number;
  params?: Record<string, string | undefined>;
};

export function ListingPagination({
  basePath,
  page,
  total,
  pageSize,
  params = {},
}: Props) {
  const pages = totalPages(total, pageSize);
  if (total === 0 || pages <= 1) return null;

  const current = Math.min(page, pages);

  const prevHref = buildPageHref(basePath, current - 1, params);
  const nextHref = buildPageHref(basePath, current + 1, params);

  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((p) => {
      if (pages <= 7) return true;
      if (p === 1 || p === pages) return true;
      return Math.abs(p - current) <= 1;
    })
    .reduce<number[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1]! > 1) acc.push(-1);
      acc.push(p);
      return acc;
    }, []);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {current > 1 ? (
        <Link
          href={prevHref}
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-[14px] font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          Previous
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center rounded-md border border-neutral-100 px-4 text-[14px] text-neutral-300">
          Previous
        </span>
      )}

      <div className="flex items-center gap-1.5">
        {pageNumbers.map((p, idx) =>
          p === -1 ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-neutral-400">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildPageHref(basePath, p, params)}
              aria-current={p === current ? "page" : undefined}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md border text-[14px] font-medium tabular-nums transition ${
                p === current
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
              }`}
            >
              {p}
            </Link>
          ),
        )}
      </div>

      {current < pages ? (
        <Link
          href={nextHref}
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-[14px] font-medium text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
        >
          Next
        </Link>
      ) : (
        <span className="inline-flex h-10 items-center rounded-md border border-neutral-100 px-4 text-[14px] text-neutral-300">
          Next
        </span>
      )}
    </nav>
  );
}
