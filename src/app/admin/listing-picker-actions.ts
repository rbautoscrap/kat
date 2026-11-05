"use server";

import type { Prisma } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { resolveSessionDbUser } from "@/lib/listing-access";
import { listingVehicleLabel } from "@/lib/listings";
import { prisma } from "@/lib/prisma";
import type { ListingOption } from "@/lib/statement";

const PICKER_LIMIT = 50;

const pickerSelect = {
  id: true,
  serialNumber: true,
  title: true,
  year: true,
  manufactureMonth: true,
  make: true,
  model: true,
  vin: true,
  vehicleNumber: true,
} satisfies Prisma.ListingSelect;

type PickerRow = Prisma.ListingGetPayload<{ select: typeof pickerSelect }>;

function tokenWhere(token: string): Prisma.ListingWhereInput {
  const or: Prisma.ListingWhereInput[] = [
    { serialNumber: { contains: token } },
    { title: { contains: token } },
    { make: { contains: token } },
    { model: { contains: token } },
    { vin: { contains: token } },
    { vehicleNumber: { contains: token } },
  ];
  if (/^\d{4}$/.test(token)) or.push({ year: Number(token) });
  return { OR: or };
}

/** Admin document forms: search every listing, not just the preloaded recent set. */
export async function searchDocumentListings(
  query: string,
  labelMode: "vehicle" | "title" = "vehicle",
): Promise<ListingOption[]> {
  const session = await auth();
  const dbUser = await resolveSessionDbUser();
  if (!session?.user || !dbUser || !isAdmin(dbUser.role)) return [];

  const tokens = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((t) => t.slice(0, 40));
  if (tokens.length === 0) return [];

  const rows: PickerRow[] = await prisma.listing.findMany({
    where: { AND: tokens.map(tokenWhere) },
    orderBy: { createdAt: "desc" },
    take: PICKER_LIMIT,
    select: pickerSelect,
  });

  return rows.map((l) => ({
    id: l.id,
    serialNumber: l.serialNumber,
    label:
      labelMode === "title"
        ? l.title || listingVehicleLabel(l)
        : listingVehicleLabel(l),
    vin: l.vin,
    vehicleNumber: l.vehicleNumber,
  }));
}
