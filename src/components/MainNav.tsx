"use client";

import Link from "next/link";
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
    href: "/listings?category=LIVE_AUCTION",
    label: "Live Auction",
    category: "LIVE_AUCTION",
  },
  {
    href: "/listings?category=STAND_BY",
    label: "Stand by",
    category: "STAND_BY",
  },
  { href: "/how-to-buy", label: "How to buy" },
  { href: "/about-us", label: "About Us" },
];

export function MainNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <nav
      aria-label="Main"
      className="hidden min-w-0 items-center justify-center gap-6 md:flex lg:gap-7"
    >
      {nav.map((item) => {
        const active =
          item.category != null
            ? pathname.startsWith("/listings") &&
              activeCategory === item.category
            : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${item.hot ? "nav-link-hot" : ""} ${active ? "is-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
