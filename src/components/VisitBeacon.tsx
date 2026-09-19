"use client";

import { useEffect } from "react";

const SENT_KEY = "kat-visit-sent";

/** One POST per browser tab session. The cookie then skips extra DB writes. */
export function VisitBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SENT_KEY) === "1") return;
      sessionStorage.setItem(SENT_KEY, "1");
    } catch {
      /* private mode */
    }
    void fetch("/api/visits", { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, []);

  return null;
}
