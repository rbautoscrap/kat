import "server-only";

import type { ListingSaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Inventory cost includes on-sale units only; sold (and reserved) are excluded. */
export const INVENTORY_SALE_STATUSES: ListingSaleStatus[] = ["AVAILABLE"];

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

export type InventoryCostSummary = {
  /** Sum of costPrice for non-sold listings */
  total: number;
  /** AVAILABLE + RESERVED count */
  count: number;
  availableCount: number;
  reservedCount: number;
  /** SOLD count (excluded from total) */
  soldCount: number;
};

/**
 * Inventory cost for 판매중 (AVAILABLE) listings only.
 * 판매완료 (SOLD) — and 예약완료 (RESERVED) — are excluded from the total.
 */
export async function getInventoryCostSummary(): Promise<InventoryCostSummary> {
  const [stockRows, reservedCount, soldCount] = await Promise.all([
    prisma.listing.findMany({
      where: { saleStatus: { in: INVENTORY_SALE_STATUSES } },
      select: { costPrice: true, saleStatus: true },
    }),
    prisma.listing.count({ where: { saleStatus: "RESERVED" } }),
    prisma.listing.count({ where: { saleStatus: "SOLD" } }),
  ]);

  let total = 0;
  for (const row of stockRows) {
    total += parseCostPrice(row.costPrice);
  }

  return {
    total,
    count: stockRows.length,
    availableCount: stockRows.length,
    reservedCount,
    soldCount,
  };
}
