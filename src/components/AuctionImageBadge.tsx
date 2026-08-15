type Props = {
  size?: "card" | "detail";
};

function GavelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M13.2 3.4 20.6 10.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M11.1 5.5 18.5 12.9"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M8.6 11.2 4.4 15.4c-.8.8-.8 2.1 0 2.9l1.3 1.3c.8.8 2.1.8 2.9 0l4.2-4.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 20.5h7.2"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Photo overlay for Live Auction listings. */
export function AuctionImageBadge({ size = "card" }: Props) {
  const compact = size === "card";

  return (
    <span
      className={`pointer-events-none absolute right-0 top-0 z-[1] inline-flex items-center gap-0.5 bg-neutral-950/80 font-extrabold uppercase tracking-[0.06em] text-white ${
        compact
          ? "px-1 py-0.5 text-[8px] sm:px-1.5 sm:text-[9px]"
          : "px-1.5 py-1 text-[10px] sm:px-2 sm:text-[11px]"
      }`}
      aria-hidden
    >
      <GavelIcon
        className={compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5"}
      />
      Auction
    </span>
  );
}
