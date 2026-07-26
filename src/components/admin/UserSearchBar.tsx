import Link from "next/link";
import { buildPageHref } from "@/lib/admin-pagination";

type Props = {
  q?: string;
  role?: string;
  sort?: string;
};

export function UserSearchBar({ q = "", role, sort }: Props) {
  const clearHref = buildPageHref("/admin/users", 1, {
    role,
    sort: sort === "role" ? "role" : undefined,
  });

  return (
    <form
      action="/admin/users"
      method="get"
      className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-5 py-3"
    >
      {role ? <input type="hidden" name="role" value={role} /> : null}
      {sort && sort !== "newest" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      <label className="sr-only" htmlFor="admin-user-q">
        회원 검색
      </label>
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 sm:max-w-md">
        <input
          id="admin-user-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="이름 · 아이디 · 연락처"
          className="h-9 min-w-0 flex-1 bg-white px-3 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="shrink-0 border-l border-neutral-200 bg-neutral-800 px-3.5 text-[12.5px] font-medium text-white transition hover:bg-neutral-700"
        >
          검색
        </button>
      </div>
      {q ? (
        <Link
          href={clearHref}
          className="inline-flex h-9 shrink-0 items-center rounded-md border border-neutral-200 px-3 text-[12.5px] text-neutral-600 transition hover:bg-neutral-50"
        >
          초기화
        </Link>
      ) : null}
    </form>
  );
}
