import Link from "next/link";
import type { Role } from "@prisma/client";
import { buildPageHref } from "@/lib/admin-pagination";
import { ROLE_LABELS } from "@/lib/admin-labels";

type RoleFilterValue = "ALL" | Role;
type SortValue = "newest" | "role";

type Props = {
  current?: RoleFilterValue;
  counts: Record<RoleFilterValue, number>;
  sort: SortValue;
};

const filters: Array<{ value: RoleFilterValue; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "MEMBER", label: ROLE_LABELS.MEMBER },
  { value: "AUTHORIZED", label: ROLE_LABELS.AUTHORIZED },
  { value: "ADMIN", label: ROLE_LABELS.ADMIN },
];

export function RoleFilter({
  current = "ALL",
  counts,
  sort,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => {
          const active = current === f.value;
          const href = buildPageHref("/admin/users", 1, {
            sort,
            role: f.value === "ALL" ? undefined : f.value,
          });
          return (
            <Link
              key={f.value}
              href={href}
              className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] tracking-wide transition ${
                active
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 tabular-nums ${active ? "text-neutral-300" : "text-neutral-400"}`}
              >
                {counts[f.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        <span className="shrink-0">정렬</span>
        <Link
          href={buildPageHref("/admin/users", 1, {
            sort: "newest",
            role: current === "ALL" ? undefined : current,
          })}
          className={`inline-flex h-8 items-center rounded-md border px-3 transition ${
            sort === "newest"
              ? "border-neutral-800 bg-white text-neutral-800"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
          }`}
        >
          최신순
        </Link>
        <Link
          href={buildPageHref("/admin/users", 1, {
            sort: "role",
            role: current === "ALL" ? undefined : current,
          })}
          className={`inline-flex h-8 items-center rounded-md border px-3 transition ${
            sort === "role"
              ? "border-neutral-800 bg-white text-neutral-800"
              : "border-neutral-200 text-neutral-500 hover:border-neutral-300"
          }`}
        >
          등급순
        </Link>
      </div>
    </div>
  );
}
