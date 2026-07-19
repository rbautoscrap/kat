"use client";

import { useEffect } from "react";

export function VisitTracker() {
  useEffect(() => {
    void fetch("/api/visits", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
