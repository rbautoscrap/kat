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
  /** When false, backdrop clicks do not dismiss (prevents losing form input). */
  closeOnBackdrop?: boolean;
  /** Extra classes for the X button (e.g. brand red on Join). */
  closeButtonClassName?: string;
};

/**
 * Viewport-centered modal via portal (avoids sticky/blur header clipping fixed UI).
 * On mobile, the shell is capped to the dynamic viewport and scrolls inside
 * so tall forms (listing / statement) remain fully usable.
 */
export function AuthModalShell({
  open,
  onClose,
  title,
  maxWidthClass = "max-w-[22.5rem]",
  children,
  closeLabel = "Close",
  closeOnBackdrop = true,
  closeButtonClassName,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
        aria-hidden
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div
          className="flex min-h-[100dvh] items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative flex w-full ${maxWidthClass} max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:max-h-[calc(100dvh-3rem)]`}
          >
            <div className="flex shrink-0 items-center justify-end px-2.5 pt-2.5">
              <button
                type="button"
                onClick={onClose}
                className={
                  closeButtonClassName ??
                  "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                }
                aria-label={closeLabel}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-1 [-webkit-overflow-scrolling:touch] sm:px-7 sm:pb-7">
              {children}
            </div>
          </div>
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
