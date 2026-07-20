import Link from "next/link";
import { buildPageHref } from "@/lib/admin-pagination";

export type StatementSort =
  | "newest"
  | "oldest"
  | "issue_desc"
  | "issue_asc"
  | "buyer_asc"
  | "buyer_desc"
  | "no_desc"
  | "no_asc";

export type StatementVatFilter = "ALL" | "INCLUDE" | "ZERO";

type Props = {
  q?: string;
  sort: StatementSort;
  vat: StatementVatFilter;
};

const SORT_OPTIONS: Array<{ value: StatementSort; label: string }> = [
  { value: "newest", label: "등록일 최신순" },
  { value: "oldest", label: "등록일 오래된순" },
  { value: "issue_desc", label: "발행일 최신순" },
  { value: "issue_asc", label: "발행일 오래된순" },
  { value: "buyer_asc", label: "거래처명 가나다순" },
  { value: "buyer_desc", label: "거래처명 역순" },
  { value: "no_desc", label: "명세서번호 내림차순" },
  { value: "no_asc", label: "명세서번호 오름차순" },
];

const VAT_OPTIONS: Array<{ value: StatementVatFilter; label: string }> = [
  { value: "ALL", label: "부가세 전체" },
  { value: "INCLUDE", label: "부가세 포함" },
  { value: "ZERO", label: "영세율" },
];

export function StatementListToolbar({ q = "", sort, vat }: Props) {
  const clearHref = buildPageHref("/admin/statements", 1, {});

  return (
    <form
      action="/admin/statements"
      method="get"
      className="flex flex-col gap-2.5 border-b border-[var(--line)] px-4 py-3.5 sm:px-5"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="admin-statement-q">
          거래명세서 검색
        </label>
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500">
          <input
            id="admin-statement-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="명세서번호, 거래처, 매물명, 시리얼 검색"
            className="h-10 min-w-0 flex-1 bg-white px-3.5 text-[13.5px] text-neutral-800 outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            className="shrink-0 border-l border-neutral-200 bg-neutral-800 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-700"
          >
            검색
          </button>
        </div>
        {q || sort !== "newest" || vat !== "ALL" ? (
          <Link
            href={clearHref}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 px-3 text-[13px] text-neutral-600 transition hover:bg-neutral-50"
          >
            초기화
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="admin-statement-sort">
          정렬
        </label>
        <select
          id="admin-statement-sort"
          name="sort"
          defaultValue={sort}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-700 outline-none focus:border-neutral-400"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="admin-statement-vat">
          부가세 필터
        </label>
        <select
          id="admin-statement-vat"
          name="vat"
          defaultValue={vat}
          className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-700 outline-none focus:border-neutral-400"
        >
          {VAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          적용
        </button>
      </div>
    </form>
  );
}
