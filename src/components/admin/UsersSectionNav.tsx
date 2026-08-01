import Link from "next/link";

type Tab = "manage" | "analytics";

type Props = {
  active: Tab;
  pendingCount?: number;
};

const tabs: Array<{ id: Tab; href: string; label: string }> = [
  { id: "manage", href: "/admin/users", label: "회원 관리" },
  { id: "analytics", href: "/admin/users/analytics", label: "회원 분석" },
];

export function UsersSectionNav({ active, pendingCount = 0 }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-wrap items-baseline gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-[14px] font-semibold tracking-tight transition ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {tab.label}
              {tab.id === "manage" && pendingCount > 0 ? (
                <span
                  className={`ml-1.5 tabular-nums text-[11.5px] ${
                    isActive ? "text-amber-200" : "text-amber-700"
                  }`}
                >
                  대기 {pendingCount.toLocaleString("ko-KR")}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
