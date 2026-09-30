type Props = {
  size?: "card" | "detail";
};

function DropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.8c-.3 0-.6.2-.8.4C9.6 5.3 5.5 10.6 5.5 14.5a6.5 6.5 0 0 0 13 0c0-3.9-4.1-9.2-5.7-11.3-.2-.2-.5-.4-.8-.4Z" />
    </svg>
  );
}

/** Photo overlay for flood-damaged listings. */
export function FloodImageBadge({ size = "card" }: Props) {
  const compact = size === "card";

  return (
    <span
      className={`pointer-events-none inline-flex items-center gap-0.5 bg-sky-700/90 font-extrabold uppercase tracking-[0.06em] text-white ${
        compact
          ? "px-1 py-0.5 text-[8px] sm:px-1.5 sm:text-[9px]"
          : "px-1.5 py-1 text-[10px] sm:px-2 sm:text-[11px]"
      }`}
      aria-label="Flood damaged"
    >
      <DropIcon
        className={compact ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5"}
      />
      Water
    </span>
  );
}
