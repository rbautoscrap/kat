import "server-only";

import type { ListingCategory, ListingSaleStatus } from "@prisma/client";
import {
  ADMIN_CATEGORY_LABELS,
  SALE_STATUS_ADMIN_LABELS,
} from "@/lib/admin-labels";
import { formatKoreaDateTime } from "@/lib/format-korea-time";
import {
  formatCostWon,
  resolveListingCost,
} from "@/lib/inventory-cost";
import type {
  InventoryListReport,
  InventoryListRow,
  InventoryLocationBlock,
  InventoryStatusBlock,
} from "@/lib/inventory-list-types";
import { displayAccumulatedDays } from "@/lib/listing-actions";
import { formatRegistrationDate, listingVehicleLabel } from "@/lib/listings";
import { prisma } from "@/lib/prisma";
import {
  STORAGE_LOCATIONS,
  UNASSIGNED_STORAGE_LABEL,
  storageLocationLabel,
} from "@/lib/storage-location";

export type {
  InventoryListReport,
  InventoryListRow,
  InventoryLocationBlock,
  InventoryStatusBlock,
} from "@/lib/inventory-list-types";

const STATUS_ORDER = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
] as const satisfies readonly ListingSaleStatus[];

function moneyLabel(value: number) {
  return value > 0 ? formatCostWon(value) : "—";
}

function salePriceLabel(value?: string | null) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return formatCostWon(n);
}

function parseWonAmount(value?: string | null) {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function displayTitle(
  listing: { year: number; make: string; model: string; title: string; serialNumber: string },
) {
  const raw =
    listingVehicleLabel(listing) || listing.title.trim() || listing.serialNumber;
  return raw.replace(/\s*\(S\/N:\s*[^)]+\)/gi, "").replace(/\s+/g, " ").trim();
}

function compareHighValueFirst(
  a: { cost: number; sale: number; title: string },
  b: { cost: number; sale: number; title: string },
) {
  if (b.cost !== a.cost) return b.cost - a.cost;
  if (b.sale !== a.sale) return b.sale - a.sale;
  return a.title.localeCompare(b.title, "ko");
}

function toRow(
  listing: {
    id: string;
    title: string;
    year: number;
    make: string;
    model: string;
    serialNumber: string;
    vin: string | null;
    vehicleNumber: string | null;
    category: ListingCategory;
    inboundDate: string | null;
    accumulatedDays: string | null;
    costPrice: string | null;
    auctionPrice: string | null;
    incidentalCost: string | null;
    salePrice: string | null;
  },
  no: number,
): InventoryListRow {
  const days = displayAccumulatedDays(listing);
  const cost = resolveListingCost(listing);
  const title = displayTitle(listing);
  return {
    id: listing.id,
    no,
    title,
    serialNumber: listing.serialNumber,
    vin: listing.vin?.trim() || "—",
    vehicleNumber: listing.vehicleNumber?.trim() || "—",
    categoryLabel: ADMIN_CATEGORY_LABELS[listing.category],
    inboundDate: formatRegistrationDate(listing.inboundDate) || "—",
    days: days == null ? "—" : `${days.toLocaleString("ko-KR")}일`,
    costLabel: moneyLabel(cost),
    cost,
    salePriceLabel: salePriceLabel(listing.salePrice),
  };
}

export async function loadInventoryListReport(): Promise<InventoryListReport> {
  const listings = await prisma.listing.findMany({
    where: { category: { in: ["CAR_LISTINGS", "CONSIGNMENT_SALE", "STAND_BY"] } },
    select: {
      id: true,
      title: true,
      year: true,
      make: true,
      model: true,
      serialNumber: true,
      vin: true,
      vehicleNumber: true,
      category: true,
      saleStatus: true,
      storageLocation: true,
      inboundDate: true,
      accumulatedDays: true,
      costPrice: true,
      auctionPrice: true,
      incidentalCost: true,
      salePrice: true,
    },
  });

  const locationNames = ["충주사업소", "진천사업소"].filter((name) =>
    STORAGE_LOCATIONS.includes(name as (typeof STORAGE_LOCATIONS)[number]),
  );
  const hasUnassigned = listings.some(
    (row) => storageLocationLabel(row.storageLocation) === UNASSIGNED_STORAGE_LABEL,
  );
  if (hasUnassigned) locationNames.push(UNASSIGNED_STORAGE_LABEL);

  const locations = locationNames.map((location) => {
    const atLocation = listings.filter(
      (row) => storageLocationLabel(row.storageLocation) === location,
    );

    const statuses = STATUS_ORDER.map((status) => {
      const rows = atLocation
        .filter((row) => row.saleStatus === status)
        .map((row) => ({
          listing: row,
          cost: resolveListingCost(row),
          sale: parseWonAmount(row.salePrice),
          title: displayTitle(row),
        }))
        .sort(compareHighValueFirst)
        .map((row, index) => toRow(row.listing, index + 1));
      const costTotal = rows.reduce((sum, row) => sum + row.cost, 0);
      return {
        status,
        label: SALE_STATUS_ADMIN_LABELS[status],
        rows,
        count: rows.length,
        costTotal,
      };
    });

    return {
      location,
      statuses,
      count: statuses.reduce((sum, block) => sum + block.count, 0),
      costTotal: statuses.reduce((sum, block) => sum + block.costTotal, 0),
    };
  });

  return {
    generatedAt: formatKoreaDateTime(new Date()),
    locations,
    totalCount: locations.reduce((sum, block) => sum + block.count, 0),
    totalCost: locations.reduce((sum, block) => sum + block.costTotal, 0),
  };
}
