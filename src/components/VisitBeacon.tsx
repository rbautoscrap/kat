"use client";

import { useEffect } from "react";

/** One POST per browser day to record a visit; display is server-rendered. */
export function VisitBeacon() {
  useEffect(() => {
    void fetch("/api/visits", { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, []);

  return null;
}
