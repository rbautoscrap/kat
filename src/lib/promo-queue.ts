import "server-only";

import { CONTACT_WHATSAPP } from "@/lib/contact";
import { listingCardCoverUrl } from "@/lib/listing-images";
import { displayAccumulatedDays } from "@/lib/listing-actions";
import { resolveListingCost } from "@/lib/inventory-cost";
import { getPublicSiteOrigin } from "@/lib/listings";
import { prisma } from "@/lib/prisma";
import type { Listing, ListingImage } from "@prisma/client";

export const PROMO_STATUSES = ["DRAFT", "APPROVED", "POSTED", "SKIPPED"] as const;
export type PromoStatus = (typeof PROMO_STATUSES)[number];

/** Available + aged OR high cost — stuck high-value stock. */
export const PROMO_MIN_COST_WON = 3_000_000;
export const PROMO_MIN_AGE_DAYS = 30;
export const PROMO_FILL_LIMIT = 20;
export const PROMO_DEFAULT_CHANNELS = "telegram,instagram,facebook,x";

export function promoWebhookSecret() {
  return (
    process.env.PROMO_WEBHOOK_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    ""
  );
}

function vehicleLine(listing: {
  year: number;
  make: string;
  model: string;
  serialNumber: string;
}) {
  return `${listing.year} ${listing.make} ${listing.model}`.trim();
}

export function buildPromoCopy(listing: {
  year: number;
  make: string;
  model: string;
  serialNumber: string;
  highlights?: string | null;
  damagesEn?: string | null;
  damages?: string | null;
  engineStatus?: string | null;
  odometer?: string | null;
  listingUrl: string;
}) {
  const title = vehicleLine(listing);
  const bits = [
    listing.odometer ? `Odo ${listing.odometer}` : null,
    listing.engineStatus ? `Engine ${listing.engineStatus}` : null,
    listing.highlights?.trim() || null,
    (listing.damagesEn || listing.damages)?.trim() || null,
  ].filter(Boolean) as string[];
  const detail = bits.slice(0, 2).join(" · ");
  const headline = `${title} (S/N ${listing.serialNumber})`;
  const body = [
    headline,
    detail || "Korea export stock — inspect photos and inquire.",
    `View: ${listing.listingUrl}`,
    `WhatsApp: +${CONTACT_WHATSAPP}`,
    "#KoreaAutoTrade #UsedCarsKorea #ExportCars",
  ].join("\n");
  return { headline, body };
}

type ListingForPromo = Listing & { images: ListingImage[] };

function scoreRow(listing: ListingForPromo) {
  const costWon = resolveListingCost(listing);
  const ageDays = displayAccumulatedDays(listing) ?? 0;
  return { costWon, ageDays };
}

function qualifies(costWon: number, ageDays: number) {
  return costWon >= PROMO_MIN_COST_WON || ageDays >= PROMO_MIN_AGE_DAYS;
}

/** Pull high-cost / aging AVAILABLE vehicles into DRAFT rows. */
export async function fillPromoQueue(limit = PROMO_FILL_LIMIT) {
  const origin = getPublicSiteOrigin() || "https://www.rbautotrade.com";
  const active = await prisma.promoQueueItem.findMany({
    where: { status: { in: ["DRAFT", "APPROVED"] } },
    select: { listingId: true },
  });
  const blocked = new Set(active.map((r) => r.listingId));

  const recentPosted = await prisma.promoQueueItem.findMany({
    where: {
      status: "POSTED",
      postedAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
    },
    select: { listingId: true },
  });
  for (const row of recentPosted) blocked.add(row.listingId);

  const candidates = await prisma.listing.findMany({
    where: {
      saleStatus: "AVAILABLE",
      category: {
        in: [
          "CAR_LISTINGS",
          "CONSIGNMENT_SALE",
          "STAND_BY",
          "DRIVABLE_CARS",
          "LIVE_AUCTION",
        ],
      },
    },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    take: 400,
    orderBy: { createdAt: "desc" },
  });

  const ranked = candidates
    .filter((row) => !blocked.has(row.id))
    .map((row) => {
      const { costWon, ageDays } = scoreRow(row);
      return { row, costWon, ageDays };
    })
    .filter((x) => qualifies(x.costWon, x.ageDays))
    .sort((a, b) => b.costWon - a.costWon || b.ageDays - a.ageDays)
    .slice(0, limit);

  let created = 0;
  for (const { row, costWon, ageDays } of ranked) {
    const listingUrl = `${origin}/listings/${row.id}`;
    const cover = listingCardCoverUrl(row.images, row.displayedImageGroup);
    const imageUrl = cover
      ? cover.startsWith("http")
        ? cover
        : `${origin}${cover.startsWith("/") ? "" : "/"}${cover}`
      : null;
    const { headline, body } = buildPromoCopy({
      ...row,
      listingUrl,
    });
    await prisma.promoQueueItem.create({
      data: {
        listingId: row.id,
        status: "DRAFT",
        headline,
        body,
        imageUrl,
        listingUrl,
        costWon,
        ageDays,
        channels: PROMO_DEFAULT_CHANNELS,
      },
    });
    created += 1;
  }

  return { created, considered: ranked.length };
}

export async function listPromoQueue() {
  return prisma.promoQueueItem.findMany({
    orderBy: [{ status: "asc" }, { costWon: "desc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      listing: {
        select: {
          id: true,
          serialNumber: true,
          year: true,
          make: true,
          model: true,
          saleStatus: true,
          category: true,
        },
      },
    },
  });
}
