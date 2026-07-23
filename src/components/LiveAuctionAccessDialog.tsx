"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LIVE_AUCTION_ACCESS_MESSAGE } from "@/lib/live-auction";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Clean warning dialog when Live Auction is opened without partner access. */
export function LiveAuctionAccessDialog({ open, onClose }: Props) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="live-auction-gate-title"
        aria-describedby="live-auction-gate-desc"
        className="relative w-full max-w-[26rem] border border-neutral-200 bg-white px-7 py-8 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
      >
        <p
          id="live-auction-gate-title"
          className="text-center text-[11px] font-semibold tracking-[0.22em] text-neutral-500 uppercase"
        >
          Live Auction
        </p>
        <p
          id="live-auction-gate-desc"
          className="mt-4 text-center text-[14.5px] leading-relaxed tracking-wide text-neutral-700"
        >
          {LIVE_AUCTION_ACCESS_MESSAGE}
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/login?callbackUrl=/listings?category=LIVE_AUCTION"
            className="inline-flex h-10 items-center justify-center bg-neutral-900 px-5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
            onClick={onClose}
          >
            Login
          </Link>
          <Link
            href="/join"
            className="inline-flex h-10 items-center justify-center border border-neutral-300 bg-white px-5 text-[13px] font-medium tracking-wide text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
            onClick={onClose}
          >
            Register
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-4 block text-[12.5px] tracking-wide text-neutral-400 transition hover:text-neutral-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
