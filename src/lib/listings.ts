import type { ListingCategory, ListingSaleStatus } from "@prisma/client";

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  HOT_DEALS: "HOT DEALS",
  CAR_LISTINGS: "Car Listings",
  LIVE_AUCTION: "Live Auction",
  STAND_BY: "Stand by",
};

/** Public English overlays / badges */
export const SALE_STATUS_LABELS: Record<ListingSaleStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold out",
};

export const CATEGORY_PATHS: Record<ListingCategory, string> = {
  HOT_DEALS: "/listings?category=HOT_DEALS",
  CAR_LISTINGS: "/listings?category=CAR_LISTINGS",
  LIVE_AUCTION: "/listings?category=LIVE_AUCTION",
  STAND_BY: "/listings?category=STAND_BY",
};

/** Home section grid: 5 columns for larger listing tiles */
export const LISTING_GRID_CLASS =
  "grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-3.5 md:grid-cols-4 lg:grid-cols-5";

/** Category menu pages: 4–5 columns with roomier tiles */
export const LISTING_CATEGORY_GRID_CLASS =
  "grid grid-cols-2 items-start gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5";

export const LISTING_CATEGORY_PAGE_SIZE = 20;

export function parseCategory(
  value: string | null | undefined,
): ListingCategory | null {
  if (
    value === "HOT_DEALS" ||
    value === "CAR_LISTINGS" ||
    value === "LIVE_AUCTION" ||
    value === "STAND_BY"
  ) {
    return value;
  }
  return null;
}

export function youtubeEmbedUrl(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
  return null;
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const TRANSMISSION_LEGACY_EN: Record<string, string> = {
  자동: "Automatic",
  수동: "Manual",
  세미오토: "Semi-automatic",
  기타: "Other",
};

/** Normalize stored transmission for public English display. */
export function formatTransmission(value?: string | null) {
  if (!value) return "";
  return TRANSMISSION_LEGACY_EN[value] ?? value;
}

const FUEL_LEGACY_EN: Record<string, string> = {
  가솔린: "Gasoline",
  디젤: "Diesel",
  전기: "Electric",
  수소: "Hydrogen",
  기타: "Other",
};

/** Normalize stored fuel type for public English display. */
export function formatFuelType(value?: string | null) {
  if (!value) return "";
  return FUEL_LEGACY_EN[value] ?? value;
}

/** Format odometer for display with thousand separators and km unit. */
export function formatOdometerDisplay(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return value.trim();
  return `${Number(digits).toLocaleString("en-US")} km`;
}

/** Public notes: prefer English translation when available. */
export function formatNotesDisplay(
  damages?: string | null,
  damagesEn?: string | null,
) {
  const en = damagesEn?.trim();
  if (en) return en;
  return damages?.trim() || "";
}
