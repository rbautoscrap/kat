import "server-only";

import type { ListingSaleStatus } from "@prisma/client";
import { displayAccumulatedDays } from "@/lib/listing-actions";
import { prisma } from "@/lib/prisma";
import {
  STORAGE_LOCATIONS,
  UNASSIGNED_STORAGE_LABEL,
  storageLocationLabel,
} from "@/lib/storage-location";

/** Inventory cost includes on-sale units only; sold (and reserved) are excluded. */
export const INVENTORY_SALE_STATUSES: ListingSaleStatus[] = ["AVAILABLE"];

export const INVENTORY_STORAGE_LOCATIONS = STORAGE_LOCATIONS;
export { UNASSIGNED_STORAGE_LABEL };

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

/** Prefer stored costPrice; fall back to auction + incidental when cost was not synced. */
export function resolveListingCost(row: {
  costPrice?: string | null;
  auctionPrice?: string | null;
  incidentalCost?: string | null;
}): number {
  const stored = parseCostPrice(row.costPrice);
  if (stored > 0) return stored;
  const auction = parseCostPrice(row.auctionPrice);
  const incidental = parseCostPrice(row.incidentalCost);
  return auction + incidental;
}

export type InventoryCostByLocation = {
  location: string;
  total: number;
  count: number;
};

/** Cost band threshold for dashboard counts (₩5,000,000). */
export const COST_BAND_5M = 5_000_000;

/** Inbound age (days) treated as stagnant / 악성재고 on the admin dashboard. */
export const STAGNANT_INBOUND_DAYS = 30;

export type InventoryCostSummary = {
  /** Sum of costPrice for non-sold listings */
  total: number;
  /** AVAILABLE + RESERVED count */
  count: number;
  availableCount: number;
  reservedCount: number;
  /** SOLD count (excluded from total) */
  soldCount: number;
  /** AVAILABLE units with cost ≤ ₩5M */
  costAtMost5mCount: number;
  /** AVAILABLE units with cost > ₩5M */
  costOver5mCount: number;
  /** AVAILABLE units inbound for ≥ 30 days */
  stagnantCount: number;
  /** Cost totals grouped by storageLocation */
  byLocation: InventoryCostByLocation[];
};

/**
 * Inventory cost for 판매중 (AVAILABLE) listings only.
 * 판매완료 (SOLD) — and 예약완료 (RESERVED) — are excluded from the total.
 */
export async function getInventoryCostSummary(): Promise<InventoryCostSummary> {
  const vehicleOnly = { NOT: { category: "USED_PARTS" as const } };
  const [stockRows, reservedCount, soldCount] = await Promise.all([
    prisma.listing.findMany({
      where: {
        AND: [{ saleStatus: { in: INVENTORY_SALE_STATUSES } }, vehicleOnly],
      },
      select: {
        costPrice: true,
        auctionPrice: true,
        incidentalCost: true,
        saleStatus: true,
        storageLocation: true,
        inboundDate: true,
        accumulatedDays: true,
      },
    }),
    prisma.listing.count({
      where: { AND: [{ saleStatus: "RESERVED" }, vehicleOnly] },
    }),
    prisma.listing.count({
      where: { AND: [{ saleStatus: "SOLD" }, vehicleOnly] },
    }),
  ]);

  let total = 0;
  let costAtMost5mCount = 0;
  let costOver5mCount = 0;
  let stagnantCount = 0;
  const locationMap = new Map<string, { total: number; count: number }>();

  for (const row of stockRows) {
    const cost = resolveListingCost(row);
    total += cost;
    if (cost <= COST_BAND_5M) costAtMost5mCount += 1;
    else costOver5mCount += 1;
    const days = displayAccumulatedDays(row);
    if (days != null && days >= STAGNANT_INBOUND_DAYS) stagnantCount += 1;
    const location = storageLocationLabel(row.storageLocation);
    const prev = locationMap.get(location) ?? { total: 0, count: 0 };
    locationMap.set(location, {
      total: prev.total + cost,
      count: prev.count + 1,
    });
  }

  const byLocation: InventoryCostByLocation[] = [];
  for (const known of STORAGE_LOCATIONS) {
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
    // Hide empty unassigned / legacy buckets so completed assignments stay clean.
    if (row.count <= 0) continue;
    byLocation.push({ location, total: row.total, count: row.count });
  }

  return {
    total,
    count: stockRows.length,
    availableCount: stockRows.length,
    reservedCount,
    soldCount,
    costAtMost5mCount,
    costOver5mCount,
    stagnantCount,
    byLocation,
  };
}
