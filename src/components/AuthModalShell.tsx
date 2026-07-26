"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Accessible label for the dialog */
  title: string;
  /** Wider for join form */
  maxWidthClass?: string;
  children: ReactNode;
  closeLabel?: string;
};

/**
 * Viewport-centered modal via portal (avoids sticky/blur header clipping fixed UI).
 */
export function AuthModalShell({
  open,
  onClose,
  title,
  maxWidthClass = "max-w-[22.5rem]",
  children,
  closeLabel = "Close",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
          aria-label={closeLabel}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`relative w-full ${maxWidthClass} rounded-lg border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]`}
        >
          <div className="flex items-center justify-end px-2.5 pt-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
              aria-label={closeLabel}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="px-6 pb-7 pt-1 sm:px-7">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
