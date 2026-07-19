"use client";

import { useRouter } from "next/navigation";

type Props = {
  /** Fallback when there is no browser history */
  href: string;
  label?: string;
};

export function BackButton({ href, label = "Back" }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(href);
      }}
      className="group inline-flex h-11 items-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 text-[15px] font-medium tracking-wide text-neutral-800 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-950"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="h-5 w-5 shrink-0 text-neutral-600 transition group-hover:-translate-x-0.5 group-hover:text-neutral-900"
      >
        <path
          d="M12.5 4.5 7 10l5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </button>
  );
}
