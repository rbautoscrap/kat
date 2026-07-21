"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const nav = [
  {
    href: "/listings?category=HOT_DEALS",
    label: "HOT DEALS",
    hot: true,
    category: "HOT_DEALS",
  },
  {
    href: "/listings?category=CAR_LISTINGS",
    label: "Car Listings",
    category: "CAR_LISTINGS",
  },
  {
    href: "/listings?category=STAND_BY",
    label: "Stand by",
    category: "STAND_BY",
  },
  { href: "/how-to-buy", label: "How to buy" },
  { href: "/about-us", label: "About Us" },
];

type UserProps = {
  name: string;
  canList: boolean;
  admin: boolean;
} | null;

type Props = {
  user: UserProps;
  logoutAction: () => Promise<void>;
};

export function MobileNav({ user, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-800"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-[var(--line)] bg-white shadow-lg"
          >
            <div className="site-container flex h-14 items-center justify-between">
              <span className="site-title text-[0.9rem] text-neutral-900">
                Menu
              </span>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <nav aria-label="Mobile main" className="site-container pb-4">
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {nav.map((item) => {
                  const active =
                    item.category != null
                      ? pathname.startsWith("/listings") &&
                        activeCategory === item.category
                      : pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex min-h-12 items-center px-1 text-[15px] font-medium tracking-wide ${
                          item.hot ? "text-[var(--accent)]" : "text-neutral-800"
                        } ${active ? "bg-neutral-50" : ""}`}
                        onClick={() => setOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <ul className="mt-3 divide-y divide-[var(--line)] border border-[var(--line)]">
                {user ? (
                  <>
                    {user.canList ? (
                      <li>
                        <Link
                          href="/listings/new"
                          className="flex min-h-12 items-center px-3 text-[15px] font-medium text-neutral-800"
                          onClick={() => setOpen(false)}
                        >
                          + List
                        </Link>
                      </li>
                    ) : null}
                    {user.admin ? (
                      <li>
                        <Link
                          href="/admin"
                          className="flex min-h-12 items-center px-3 text-[15px] font-medium text-neutral-800"
                          onClick={() => setOpen(false)}
                        >
                          관리자
                        </Link>
                      </li>
                    ) : null}
                    <li>
                      <Link
                        href="/profile"
                        className="flex min-h-12 items-center px-3 text-[15px] font-medium text-neutral-800"
                        onClick={() => setOpen(false)}
                      >
                        {user.name}
                      </Link>
                    </li>
                    <li>
                      <form action={logoutAction}>
                        <button
                          type="submit"
                          className="flex min-h-12 w-full items-center px-3 text-left text-[15px] font-medium text-neutral-800"
                        >
                          Logout
                        </button>
                      </form>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link
                        href="/join"
                        className="flex min-h-12 items-center px-3 text-[15px] font-medium text-neutral-800"
                        onClick={() => setOpen(false)}
                      >
                        Join
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/login"
                        className="flex min-h-12 items-center bg-neutral-900 px-3 text-[15px] font-medium text-white"
                        onClick={() => setOpen(false)}
                      >
                        Login
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
