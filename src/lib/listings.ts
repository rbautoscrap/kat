import type { ListingCategory, ListingSaleStatus } from "@prisma/client";

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  CAR_LISTINGS: "Car Listings",
  LIVE_AUCTION: "Live Auction",
  STAND_BY: "Stand by",
  USED_PARTS: "Used Parts",
};

/** Optional part-type values stored in Listing.highlights for USED_PARTS */
export const PART_TYPE_OPTIONS = [
  "Engine",
  "Transmission",
  "Body",
  "Interior",
  "Electrical",
  "Suspension / Steering",
  "Wheels / Tires",
  "Lights",
  "Other",
] as const;

export function isPartsCategory(
  category: ListingCategory | string | null | undefined,
): boolean {
  return category === "USED_PARTS";
}

/** Card / list label — parts use title; vehicles use year make model. */
export function listingCardLabel(listing: {
  category: ListingCategory;
  year: number;
  make: string;
  model: string;
  title: string;
}): string {
  if (isPartsCategory(listing.category)) {
    return listing.title?.trim() || listing.make;
  }
  return `${listing.year} ${listing.make} ${listing.model}`;
}

/** Used Parts stores seller name in `model`. */
export function listingSellerName(listing: {
  category: ListingCategory;
  model: string;
}): string | null {
  if (!isPartsCategory(listing.category)) return null;
  const name = listing.model.trim();
  if (!name || name === "-") return null;
  return name;
}

/** Public English overlays / badges */
export const SALE_STATUS_LABELS: Record<ListingSaleStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold out",
};

export const CATEGORY_PATHS: Record<ListingCategory, string> = {
  CAR_LISTINGS: "/listings?category=CAR_LISTINGS",
  LIVE_AUCTION: "/listings?category=LIVE_AUCTION",
  STAND_BY: "/listings?category=STAND_BY",
  USED_PARTS: "/listings?category=USED_PARTS",
};

/** Home section grid: 5 columns for larger listing tiles */
export const LISTING_GRID_CLASS =
  "grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-3.5 md:grid-cols-4 lg:grid-cols-5";

/** Category menu pages: 4–5 columns with roomier tiles */
export const LISTING_CATEGORY_GRID_CLASS =
  "grid grid-cols-2 items-start gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5";

/** Used Parts vertical list (12 rows per page) */
export const USED_PARTS_LIST_CLASS =
  "divide-y-0 border-t border-[var(--line)]";

export const LISTING_CATEGORY_PAGE_SIZE = 20;
export const USED_PARTS_PAGE_SIZE = 12;

/** Vehicle listings may attach many photos; Used Parts is capped lower. */
export const MAX_IMAGES_PER_LISTING = 100;
export const MAX_IMAGES_PER_USED_PARTS = 20;

export function maxImagesForCategory(
  category: ListingCategory | string | null | undefined,
) {
  return category === "USED_PARTS"
    ? MAX_IMAGES_PER_USED_PARTS
    : MAX_IMAGES_PER_LISTING;
}

export function parseCategory(
  value: string | null | undefined,
): ListingCategory | null {
  // Legacy Hot Deals URLs resolve to Car Listings.
  if (value === "HOT_DEALS") return "CAR_LISTINGS";
  if (
    value === "CAR_LISTINGS" ||
    value === "LIVE_AUCTION" ||
    value === "STAND_BY" ||
    value === "USED_PARTS"
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
  let digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  // Korea local mobile (010…) → international for wa.me
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = `82${digits.slice(1)}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type ListingInquiryPurpose = "price" | "cs";

export type ListingInquiryOptions = {
  listingUrl?: string | null;
  serialNumber?: string | null;
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  purpose?: ListingInquiryPurpose;
};

/**
 * Inquiry message for WhatsApp / KakaoTalk.
 * Vehicle title (and key identifiers) so the seller knows which unit.
 */
export function listingInquiryText(
  title: string,
  options?: ListingInquiryOptions,
) {
  const purpose = options?.purpose ?? "price";
  const vehicle = title.trim() || "this vehicle";
  const greeting =
    purpose === "cs"
      ? "Hello, I would like to inquire about documents, a transaction statement, deregistration, or customs for this vehicle."
      : "Hello, I would like to inquire about the price of this vehicle.";
  const closing =
    purpose === "cs"
      ? "Please advise on the required documents and process. Thank you."
      : "Please share the price. Thank you.";
  const lines = [greeting, "", `Vehicle: ${vehicle}`];
  const ym =
    options?.year && options?.make && options?.model
      ? `${options.year} ${options.make} ${options.model}`.trim()
      : "";
  if (ym && ym.toLowerCase() !== vehicle.toLowerCase()) {
    lines.push(`Model: ${ym}`);
  }
  const sn = options?.serialNumber?.trim();
  if (sn) lines.push(`S/N: ${sn}`);
  const vin = options?.vin?.trim();
  if (vin) lines.push(`VIN: ${vin}`);
  const url = options?.listingUrl?.trim();
  if (url) {
    lines.push(`Link: ${url}`);
  }
  lines.push("", closing);
  return lines.join("\n");
}

/** @deprecated Prefer listingInquiryText */
export function listingWhatsAppInquiryText(
  title: string,
  options?: ListingInquiryOptions,
) {
  return listingInquiryText(title, options);
}

/** Public site origin for WhatsApp listing links (server-side). */
export function getPublicSiteOrigin() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.AUTH_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
  ];
  for (const raw of candidates) {
    let v = String(raw ?? "").trim();
    if (!v) continue;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1).trim();
    }
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    try {
      return new URL(v).origin;
    } catch {
      // try next candidate
    }
  }
  return "";
}

export function resolveListingPublicUrl(
  options?: { listingId?: string; listingUrl?: string | null },
) {
  let listingUrl = options?.listingUrl?.trim() || "";
  if (!listingUrl && options?.listingId) {
    const origin = getPublicSiteOrigin();
    if (origin) listingUrl = `${origin}/listings/${options.listingId}`;
  }
  return listingUrl;
}

export function listingWhatsAppLink(
  phone: string,
  title: string,
  options?: ListingInquiryOptions & {
    listingId?: string;
    listingUrl?: string | null;
  },
) {
  const listingUrl = resolveListingPublicUrl(options);
  return whatsappLink(
    phone,
    listingInquiryText(title, {
      ...options,
      listingUrl: listingUrl || null,
    }),
  );
}

/** Build the same inquiry text used for KakaoTalk clipboard share. */
export function listingKakaoInquiryText(
  title: string,
  options?: ListingInquiryOptions & {
    listingId?: string;
    listingUrl?: string | null;
  },
) {
  const listingUrl = resolveListingPublicUrl(options);
  return listingInquiryText(title, {
    ...options,
    listingUrl: listingUrl || null,
  });
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

/** Format displacement (cc) with thousand separators. */
export function formatDisplacementDisplay(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return value.trim();
  return `${Number(digits).toLocaleString("en-US")} cc`;
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
