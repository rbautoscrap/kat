"use client";

import { useEffect, useState } from "react";
import { searchDocumentListings } from "@/app/admin/listing-picker-actions";
import type { ListingOption } from "@/lib/statement";

function matches(l: ListingOption, q: string) {
  return (
    l.label.toLowerCase().includes(q) ||
    l.serialNumber.toLowerCase().includes(q) ||
    (l.vin ?? "").toLowerCase().includes(q) ||
    (l.vehicleNumber ?? "").toLowerCase().includes(q)
  );
}

/**
 * Preloaded recent listings filter instantly; a typed query also searches the
 * whole DB once after a short pause, so older listings always show up.
 */
export function useDocumentListingSearch(
  listings: ListingOption[],
  query: string,
  labelMode: "vehicle" | "title" = "vehicle",
) {
  const q = query.trim();
  const [remote, setRemote] = useState<{ q: string; rows: ListingOption[] }>({
    q: "",
    rows: [],
  });
  const [loadingQ, setLoadingQ] = useState("");

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingQ(q);
      searchDocumentListings(q, labelMode)
        .then((rows) => {
          if (!cancelled) setRemote({ q, rows });
        })
        .catch(() => {
          if (!cancelled) setRemote({ q, rows: [] });
        })
        .finally(() => {
          if (!cancelled) setLoadingQ("");
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, labelMode]);

  if (!q) return { results: listings, searching: false };

  const lower = q.toLowerCase();
  const seen = new Set<string>();
  const results: ListingOption[] = [];
  for (const l of listings) {
    if (matches(l, lower) && !seen.has(l.id)) {
      seen.add(l.id);
      results.push(l);
    }
  }
  if (remote.q === q) {
    for (const l of remote.rows) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        results.push(l);
      }
    }
  }
  return {
    results,
    searching: loadingQ === q || remote.q !== q,
  };
}
