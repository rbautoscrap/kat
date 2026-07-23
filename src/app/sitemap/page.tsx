import Link from "next/link";

export default function SitemapPage() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/listings?category=HOT_DEALS", label: "HOT DEALS" },
    { href: "/listings?category=CAR_LISTINGS", label: "Car Listings" },
    { href: "/listings?category=LIVE_AUCTION", label: "Live Auction" },
    { href: "/listings?category=STAND_BY", label: "Stand by" },
    { href: "/how-to-buy", label: "How to buy" },
    { href: "/about-us", label: "About Us" },
    { href: "/join", label: "Join" },
    { href: "/login", label: "Login" },
  ];

  return (
    <div className="site-container py-10" lang="en">
      <div className="mx-auto max-w-2xl">
        <h1 className="site-heading mb-4 text-[1.2rem] text-neutral-800">
          Sitemap
        </h1>
        <ul className="space-y-2 text-[14px]">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="tracking-wide text-neutral-700 underline hover:text-neutral-500"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
