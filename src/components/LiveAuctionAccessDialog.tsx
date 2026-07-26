"use client";

import { useState } from "react";
import { AuthModalShell } from "@/components/AuthModalShell";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";
import { LIVE_AUCTION_ACCESS_MESSAGE } from "@/lib/live-auction";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Where to return after login (usually the listing detail URL). */
  callbackUrl?: string;
};

/** Warning dialog when a Live Auction listing is opened without member access. */
export function LiveAuctionAccessDialog({
  open,
  onClose,
  callbackUrl = "/listings?category=LIVE_AUCTION",
}: Props) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const gateVisible = open && !loginOpen && !joinOpen;

  return (
    <>
      <AuthModalShell
        open={gateVisible}
        onClose={onClose}
        title="Live Auction access"
        maxWidthClass="max-w-[26rem]"
        closeOnBackdrop={false}
        closeButtonClassName="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--accent)] transition hover:bg-red-50 hover:text-red-700"
      >
        <p className="text-center text-[11px] font-semibold tracking-[0.22em] text-neutral-500 uppercase">
          Live Auction
        </p>
        <p className="mt-4 text-center text-[14.5px] leading-relaxed tracking-wide text-neutral-700">
          {LIVE_AUCTION_ACCESS_MESSAGE}
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center bg-neutral-900 px-5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
            onClick={() => setLoginOpen(true)}
          >
            Login
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center border border-neutral-300 bg-white px-5 text-[13px] font-medium tracking-wide text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
            onClick={() => setJoinOpen(true)}
          >
            Register
          </button>
        </div>
      </AuthModalShell>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        callbackUrl={callbackUrl}
        onSwitchToJoin={() => {
          setLoginOpen(false);
          setJoinOpen(true);
        }}
      />
      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSwitchToLogin={() => {
          setJoinOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
}
