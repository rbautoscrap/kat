"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveAuctionAccessDialog } from "@/components/LiveAuctionAccessDialog";
import { CATEGORY_PATHS } from "@/lib/listings";

type Props = {
  backHref?: string;
  /** Listing detail URL for login redirect. */
  callbackUrl?: string;
};

/**
 * Guest gate for Live Auction detail URLs: shows a centered popup,
 * then returns to the Live Auction list when dismissed.
 */
export function LiveAuctionGatePanel({
  backHref = CATEGORY_PATHS.LIVE_AUCTION,
  callbackUrl,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const afterLogin = callbackUrl || backHref;

  const handleClose = useCallback(() => {
    setOpen(false);
    router.push(backHref);
  }, [backHref, router]);

  return (
    <div className="min-h-[50vh] bg-white" lang="en" aria-hidden={!open}>
      <LiveAuctionAccessDialog
        open={open}
        onClose={handleClose}
        callbackUrl={afterLogin}
      />
    </div>
  );
}
