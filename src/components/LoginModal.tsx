"use client";

import { useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";

type Props = {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
  defaultId?: string;
  errorMessage?: string | null;
  pending?: boolean;
  registered?: boolean;
};

export function LoginModal({
  open,
  onClose,
  callbackUrl = "/",
  defaultId,
  errorMessage,
  pending,
  registered,
}: Props) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px]"
        aria-label="Close login"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="relative w-full max-w-[22.5rem] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-end border-b border-neutral-100 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-6 pb-7 pt-2 sm:px-7">
          <div id="login-modal-title" className="sr-only">
            Login
          </div>
          <LoginForm
            compact
            callbackUrl={callbackUrl}
            defaultId={defaultId}
            errorMessage={errorMessage}
            pending={pending}
            registered={registered}
            onJoinClick={onClose}
          />
        </div>
      </div>
    </div>
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
