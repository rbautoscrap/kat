"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LiveAuctionAccessDialog } from "@/components/LiveAuctionAccessDialog";

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

type Props = {
  canAccessLiveAuction?: boolean;
};

export function MainNav({ canAccessLiveAuction = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const [gateOpen, setGateOpen] = useState(false);
  const closeGate = useCallback(() => setGateOpen(false), []);

  return (
    <>
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

          const isLiveAuction = item.category === "LIVE_AUCTION";
          const className = `nav-link ${item.hot ? "nav-link-hot" : ""} ${active ? "is-active" : ""}`;

          if (isLiveAuction && !canAccessLiveAuction) {
            return (
              <button
                key={item.href}
                type="button"
                className={className}
                onClick={() => setGateOpen(true)}
              >
                {item.label}
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <LiveAuctionAccessDialog open={gateOpen} onClose={closeGate} />
    </>
  );
}
