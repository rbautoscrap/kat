"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "개요", exact: true },
  { href: "/admin/users", label: "회원 관리", exact: false },
  { href: "/admin/listings", label: "매물 관리", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-[var(--line)]">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`border-b-2 px-3 py-2.5 text-[13.5px] font-medium tracking-wide transition-colors ${
              active
                ? "border-neutral-800 text-neutral-900"
                : "border-transparent text-neutral-600 hover:bg-white hover:text-neutral-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
