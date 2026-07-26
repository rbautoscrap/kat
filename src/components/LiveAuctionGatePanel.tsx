"use client";

import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { JoinModal } from "@/components/JoinModal";
import { LoginModal } from "@/components/LoginModal";
import { LIVE_AUCTION_ACCESS_MESSAGE } from "@/lib/live-auction";
import { CATEGORY_PATHS } from "@/lib/listings";

type Props = {
  backHref?: string;
  /** Listing detail URL for login redirect. */
  callbackUrl?: string;
};

/** Full-page gate when a Live Auction listing detail is opened without partner access. */
export function LiveAuctionGatePanel({
  backHref = CATEGORY_PATHS.LIVE_AUCTION,
  callbackUrl,
}: Props) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const afterLogin = callbackUrl || backHref;

  return (
    <div className="site-container py-10 sm:py-14" lang="en">
      <div className="mb-6">
        <BackButton href={backHref} />
      </div>
      <div className="mx-auto max-w-[26rem] border border-neutral-200 bg-white px-7 py-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-neutral-500 uppercase">
          Live Auction
        </p>
        <p className="mt-4 text-[14.5px] leading-relaxed tracking-wide text-neutral-700">
          {LIVE_AUCTION_ACCESS_MESSAGE}
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="inline-flex h-10 items-center justify-center bg-neutral-900 px-5 text-[13px] font-medium tracking-wide text-white transition hover:bg-neutral-800"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="inline-flex h-10 items-center justify-center border border-neutral-300 bg-white px-5 text-[13px] font-medium tracking-wide text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50"
          >
            Register
          </button>
        </div>
      </div>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        callbackUrl={afterLogin}
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
    </div>
  );
}
