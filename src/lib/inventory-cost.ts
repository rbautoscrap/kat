import "server-only";

import type { ListingSaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Inventory cost includes on-sale units only; sold (and reserved) are excluded. */
export const INVENTORY_SALE_STATUSES: ListingSaleStatus[] = ["AVAILABLE"];

/** Known storage locations shown first in admin breakdowns. */
export const INVENTORY_STORAGE_LOCATIONS = ["진천사업소", "충주사업소"] as const;

export const UNASSIGNED_STORAGE_LABEL = "미지정";

export function parseCostPrice(value?: string | null): number {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

export function formatCostWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export type InventoryCostByLocation = {
  location: string;
  total: number;
  count: number;
};

export type InventoryCostSummary = {
  /** Sum of costPrice for non-sold listings */
  total: number;
  /** AVAILABLE + RESERVED count */
  count: number;
  availableCount: number;
  reservedCount: number;
  /** SOLD count (excluded from total) */
  soldCount: number;
  /** Cost totals grouped by storageLocation */
  byLocation: InventoryCostByLocation[];
};

function normalizeLocation(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNASSIGNED_STORAGE_LABEL;
}

/**
 * Inventory cost for 판매중 (AVAILABLE) listings only.
 * 판매완료 (SOLD) — and 예약완료 (RESERVED) — are excluded from the total.
 */
export async function getInventoryCostSummary(): Promise<InventoryCostSummary> {
  const [stockRows, reservedCount, soldCount] = await Promise.all([
    prisma.listing.findMany({
      where: { saleStatus: { in: INVENTORY_SALE_STATUSES } },
      select: { costPrice: true, saleStatus: true, storageLocation: true },
    }),
    prisma.listing.count({ where: { saleStatus: "RESERVED" } }),
    prisma.listing.count({ where: { saleStatus: "SOLD" } }),
  ]);

  let total = 0;
  const locationMap = new Map<string, { total: number; count: number }>();

  for (const row of stockRows) {
    const cost = parseCostPrice(row.costPrice);
    total += cost;
    const location = normalizeLocation(row.storageLocation);
    const prev = locationMap.get(location) ?? { total: 0, count: 0 };
    locationMap.set(location, {
      total: prev.total + cost,
      count: prev.count + 1,
    });
  }

  const byLocation: InventoryCostByLocation[] = [];
  for (const known of INVENTORY_STORAGE_LOCATIONS) {
    const row = locationMap.get(known);
    byLocation.push({
      location: known,
      total: row?.total ?? 0,
      count: row?.count ?? 0,
    });
    locationMap.delete(known);
  }

  const extras = [...locationMap.entries()].sort(([a], [b]) => {
    if (a === UNASSIGNED_STORAGE_LABEL) return 1;
    if (b === UNASSIGNED_STORAGE_LABEL) return -1;
    return a.localeCompare(b, "ko");
  });
  for (const [location, row] of extras) {
    byLocation.push({ location, total: row.total, count: row.count });
  }

  return {
    total,
    count: stockRows.length,
    availableCount: stockRows.length,
    reservedCount,
    soldCount,
    byLocation,
  };
}
