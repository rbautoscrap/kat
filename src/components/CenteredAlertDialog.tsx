"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";

type Props = {
  open: boolean;
  message: string;
  onClose: () => void;
  title?: string;
  confirmLabel?: string;
};

/** Viewport-centered notice dialog (replaces window.alert for balanced placement). */
export function CenteredAlertDialog({
  open,
  message,
  onClose,
  title = "Notice",
  confirmLabel = "OK",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted || !message) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
        aria-hidden
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="centered-alert-title"
          aria-describedby="centered-alert-message"
          className="relative w-full max-w-[22rem] rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-6 sm:py-6"
        >
          <h2
            id="centered-alert-title"
            className="text-[14px] font-semibold tracking-tight text-neutral-900"
          >
            {title}
          </h2>
          <p
            id="centered-alert-message"
            className="mt-2.5 text-[13.5px] leading-relaxed tracking-wide text-neutral-600"
          >
            {message}
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="inline-flex h-9 min-w-[4.5rem] items-center justify-center rounded-md bg-neutral-900 px-4 text-[13px] font-medium text-white transition hover:bg-neutral-800"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
