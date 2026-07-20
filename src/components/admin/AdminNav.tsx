"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "개요", exact: true },
  { href: "/admin/users", label: "회원 관리", exact: false },
  { href: "/admin/listings", label: "매물 관리", exact: false },
  { href: "/admin/statements", label: "거래명세서", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors ${
              active
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:bg-white/80 hover:text-neutral-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
