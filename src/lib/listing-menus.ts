import type { ListingCategory, Prisma } from "@prisma/client";

/** Public vehicle menus a listing can also appear on. Used Parts / Live Auction 본메뉴는 제외. */
export const LINKABLE_MENUS = [
  "CAR_LISTINGS",
  "STAND_BY",
  "DRIVABLE_CARS",
] as const;

export type LinkableMenu = (typeof LINKABLE_MENUS)[number];

export const LINKABLE_MENU_LABELS: Record<LinkableMenu, string> = {
  CAR_LISTINGS: "Car Listings",
  STAND_BY: "Stand by",
  DRIVABLE_CARS: "Drivable Cars",
};

export function isLinkableMenu(value: string): value is LinkableMenu {
  return (LINKABLE_MENUS as readonly string[]).includes(value);
}

export function parseLinkedMenus(
  raw: string | null | undefined,
): LinkableMenu[] {
  if (!raw) return [];
  const seen = new Set<LinkableMenu>();
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (isLinkableMenu(token)) seen.add(token);
  }
  return LINKABLE_MENUS.filter((menu) => seen.has(menu));
}

/** Primary category already covers this public menu. */
export function menuCoveredByCategory(
  category: ListingCategory | string | null | undefined,
  menu: LinkableMenu,
) {
  if (menu === "CAR_LISTINGS") {
    return category === "CAR_LISTINGS" || category === "CONSIGNMENT_SALE";
  }
  return category === menu;
}

export function serializeLinkedMenus(
  menus: readonly string[],
  primary?: ListingCategory | string | null,
): string | null {
  const extra = LINKABLE_MENUS.filter(
    (menu) =>
      menus.includes(menu) && !menuCoveredByCategory(primary, menu),
  );
  if (extra.length === 0) return null;
  return `,${extra.join(",")},`;
}

export function selectedMenusFromListing(
  category: ListingCategory | string | null | undefined,
  linkedMenus?: string | null,
): LinkableMenu[] {
  const selected = new Set(parseLinkedMenus(linkedMenus));
  if (isLinkableMenu(String(category ?? ""))) {
    selected.add(category as LinkableMenu);
  }
  if (category === "CONSIGNMENT_SALE") selected.add("CAR_LISTINGS");
  return LINKABLE_MENUS.filter((menu) => selected.has(menu));
}

/** Checkbox set is the source of truth. Unchecking Stand by leaves that menu. */
export function applyLinkedMenuSelection(
  selected: readonly string[],
  current: ListingCategory,
): { category: ListingCategory; linkedMenus: string | null } {
  const menus = LINKABLE_MENUS.filter((menu) => selected.includes(menu));
  if (current === "USED_PARTS") {
    return { category: current, linkedMenus: null };
  }
  if (current === "LIVE_AUCTION") {
    return {
      category: current,
      linkedMenus: serializeLinkedMenus(menus, current),
    };
  }
  if (menus.length === 0) {
    const fallback =
      current === "STAND_BY" || current === "DRIVABLE_CARS"
        ? "CAR_LISTINGS"
        : current;
    return { category: fallback, linkedMenus: null };
  }
  const category =
    isLinkableMenu(current) && menus.includes(current) ? current : menus[0]!;
  return {
    category,
    linkedMenus: serializeLinkedMenus(menus, category),
  };
}

export function listingShowsOnMenu(
  listing: {
    category: ListingCategory | string;
    linkedMenus?: string | null;
  },
  menu: LinkableMenu,
) {
  if (menuCoveredByCategory(listing.category, menu)) return true;
  return parseLinkedMenus(listing.linkedMenus).includes(menu);
}

export function publicMenuWhere(
  menu: ListingCategory,
): Prisma.ListingWhereInput {
  if (menu === "CAR_LISTINGS") {
    return {
      OR: [
        { category: { in: ["CAR_LISTINGS", "CONSIGNMENT_SALE"] } },
        { linkedMenus: { contains: "CAR_LISTINGS" } },
      ],
    };
  }
  if (isLinkableMenu(menu)) {
    return {
      OR: [
        { category: menu },
        { linkedMenus: { contains: menu } },
      ],
    };
  }
  return { category: menu };
}
