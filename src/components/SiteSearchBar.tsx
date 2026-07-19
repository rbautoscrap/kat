"use client";

import { usePathname } from "next/navigation";

export function SiteSearchBar() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="border-b border-[var(--line)] bg-white">
      <div className="site-container py-3.5 sm:py-4">
        <form
          action="/listings"
          method="get"
          className="mx-auto w-full max-w-lg sm:max-w-xl"
          role="search"
        >
          <label htmlFor="site-search-q" className="sr-only">
            Search listings
          </label>
          <div className="flex h-11 overflow-hidden rounded-md border border-neutral-300 bg-white focus-within:border-neutral-500 sm:h-11">
            <input
              id="site-search-q"
              name="q"
              type="search"
              placeholder="Search by make, model, VIN, notes…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3.5 text-[13.5px] tracking-wide text-neutral-800 outline-none placeholder:text-neutral-400 sm:px-4 sm:text-[14px]"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 border-l border-neutral-200 bg-neutral-900 px-3.5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800 sm:px-4"
            >
              <SearchIcon />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
