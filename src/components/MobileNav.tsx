"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";
import { MyPartsIcon } from "@/components/MyPartsNavLink";
import { ProfileModal } from "@/components/ProfileModal";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

const nav = [
  {
    href: "/listings?category=LIVE_AUCTION",
    label: "Live Auction",
    featured: true,
    category: "LIVE_AUCTION",
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
  {
    href: "/listings?category=USED_PARTS",
    label: "Used Parts",
    category: "USED_PARTS",
  },
  { href: "/about-us", label: "About Us" },
];

type UserProps = {
  name: string;
  email: string;
  role: "MEMBER" | "AUTHORIZED" | "ADMIN";
  canList: boolean;
  canListParts?: boolean;
  listHref?: string;
  admin: boolean;
} | null;

type AuthMode = "login" | "join" | null;

type Props = {
  user: UserProps;
  logoutAction: () => Promise<void>;
};

export function MobileNav({ user, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const rawCallback =
    `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}` ||
    "/";
  const callbackUrl =
    rawCallback.startsWith("/login") || rawCallback.startsWith("/join")
      ? "/"
      : rawCallback;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openAuth(mode: Exclude<AuthMode, null>) {
    setAuthMode(mode);
    setOpen(false);
  }

  function openProfile() {
    setProfileOpen(true);
    setOpen(false);
  }

  const menu =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[90] md:hidden"
            role="dialog"
            aria-modal
          >
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
                          className={`flex min-h-12 items-center px-1 text-[15px] tracking-wide ${
                            item.featured
                              ? "font-semibold text-[var(--accent)]"
                              : "font-medium text-neutral-800"
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
                            href={user.listHref ?? "/listings/new"}
                            className="flex min-h-12 items-center px-3 text-[15px] font-medium text-neutral-800"
                            onClick={() => setOpen(false)}
                          >
                            + List
                          </Link>
                        </li>
                      ) : null}
                      {user.canListParts ? (
                        <li>
                          <Link
                            href="/my-parts"
                            className="flex min-h-12 items-center gap-2 px-3 text-[15px] font-medium text-neutral-800"
                            onClick={() => setOpen(false)}
                          >
                            <MyPartsIcon className="h-4 w-4 shrink-0" />
                            My parts
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
                          href="/offers"
                          className="flex min-h-12 items-center px-3 text-[15px] font-semibold text-[var(--accent)]"
                          onClick={() => setOpen(false)}
                        >
                          My offers
                        </Link>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-center px-3 text-left text-[15px] font-medium text-neutral-800"
                          onClick={openProfile}
                        >
                          {user.name}
                        </button>
                      </li>
                      <li>
                        <form action={logoutAction}>
                          <button
                            type="submit"
                            className="flex min-h-12 w-full items-center px-3 text-left text-[15px] font-medium text-neutral-800"
                          >
                            Log out
                          </button>
                        </form>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-center px-3 text-left text-[15px] font-medium text-neutral-800"
                          onClick={() => openAuth("join")}
                        >
                          Join
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="flex min-h-12 w-full items-center bg-neutral-900 px-3 text-left text-[15px] font-medium text-white"
                          onClick={() => openAuth("login")}
                        >
                          Login
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </nav>
            </div>
          </div>,
          document.body,
        )
      : null;

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
      {menu}

      {/* Modals stay mounted outside the menu portal so closing the menu cannot kill them. */}
      {!user ? (
        <>
          <LoginModal
            open={authMode === "login"}
            onClose={() => setAuthMode(null)}
            callbackUrl={callbackUrl}
            onSwitchToJoin={() => setAuthMode("join")}
          />
          <JoinModal
            open={authMode === "join"}
            onClose={() => setAuthMode(null)}
            onSwitchToLogin={() => setAuthMode("login")}
          />
        </>
      ) : (
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={{
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        />
      )}
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
