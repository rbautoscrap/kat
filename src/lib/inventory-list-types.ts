import type { ListingSaleStatus } from "@prisma/client";

export type InventoryListRow = {
  id: string;
  no: number;
  title: string;
  serialNumber: string;
  vin: string;
  vehicleNumber: string;
  categoryLabel: string;
  inboundDate: string;
  days: string;
  daysAlert: boolean;
  costLabel: string;
  cost: number;
  salePriceLabel: string;
};

export type InventoryStatusBlock = {
  status: ListingSaleStatus;
  label: string;
  rows: InventoryListRow[];
  count: number;
  costTotal: number;
};

export type InventoryLocationBlock = {
  location: string;
  statuses: InventoryStatusBlock[];
  count: number;
  costTotal: number;
};

export type InventoryListReport = {
  generatedAt: string;
  locations: InventoryLocationBlock[];
  totalCount: number;
  totalCost: number;
};
