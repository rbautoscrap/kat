import Link from "next/link";

type Props = {
  className?: string;
  /** Show text label next to the icon (desktop header). */
  showLabel?: boolean;
};

/** Header / menu link to the signed-in member's Used Parts listings. */
export function MyPartsNavLink({ className = "", showLabel = true }: Props) {
  return (
    <Link
      href="/my-parts"
      className={className}
      title="My parts"
      aria-label="My parts"
    >
      <span className="inline-flex items-center gap-1.5">
        <MyPartsIcon className="h-[1.05rem] w-[1.05rem] shrink-0" />
        {showLabel ? <span>My parts</span> : null}
      </span>
    </Link>
  );
}

export function MyPartsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Simple wrench / parts mark */}
      <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6.4 6.4a1.5 1.5 0 0 0 2.1 2.1l6.4-6.4a4 4 0 0 0 5.6-5.6l-2.5 2.5-2.1-2.1 2.5-2.5z" />
    </svg>
  );
}
