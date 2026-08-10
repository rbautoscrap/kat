/**
 * Some category pages shuffle so newer units are not always on top.
 * Category pages use a URL `shuffle` seed (new on each menu click).
 * Car Listings uses a cost-biased shuffle (higher costPrice tends to appear earlier).
 * Stand by uses newest-first (createdAt desc) — no shuffle.
 *
 * Shared display rules:
 * - RESERVED / SOLD listings always sort after AVAILABLE
 * - Admin “상단” (`bumpedAt`) boosts to the front for 24 hours only
 */

/** How long an admin “상단” pin keeps the listing near the front. */
export const LISTING_BUMP_TTL_MS = 24 * 60 * 60 * 1000;

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** New seed for each shuffled category menu visit. */
export function newListingShuffleSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

/** @deprecated Prefer newListingShuffleSeed */
export function newStandByShuffleSeed() {
  return newListingShuffleSeed();
}

export function parseListingShuffleSeed(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n >>> 0;
}

/** @deprecated Prefer parseListingShuffleSeed */
export function parseStandByShuffleSeed(
  raw: string | null | undefined,
): number | null {
  return parseListingShuffleSeed(raw);
}

/** Home Stand by strip: rotates about every 10 minutes. */
export function standByHomeShuffleSeed(now = Date.now()) {
  return Math.floor(now / (10 * 60 * 1000));
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function parseCostDigits(value?: string | null): number {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function toMs(value?: Date | string | null): number {
  if (!value) return Number.NaN;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.NaN;
}

/** True while an admin “상단” pin is still within the 24h window. */
export function isListingBumpActive(
  bumpedAt?: Date | string | null,
  now = Date.now(),
): boolean {
  const ms = toMs(bumpedAt);
  if (!Number.isFinite(ms)) return false;
  const age = now - ms;
  return age >= 0 && age < LISTING_BUMP_TTL_MS;
}

/** 0 = for sale (front), 1 = reserved/sold (back). */
export function listingSaleStatusRank(
  saleStatus?: string | null,
): 0 | 1 {
  return saleStatus === "AVAILABLE" || !saleStatus ? 0 : 1;
}

export type ListingDisplayOrderFields = {
  id: string;
  saleStatus?: string | null;
  bumpedAt?: Date | string | null;
  createdAt?: Date | string | null;
  costPrice?: string | null;
};

/**
 * Newest-first with shared rules: available first, active 상단 pin next,
 * then createdAt desc. Reserved/sold always last.
 */
export function compareListingsForDisplay(
  a: ListingDisplayOrderFields,
  b: ListingDisplayOrderFields,
  now = Date.now(),
): number {
  const rankDiff =
    listingSaleStatusRank(a.saleStatus) - listingSaleStatusRank(b.saleStatus);
  if (rankDiff !== 0) return rankDiff;

  const bumpA = isListingBumpActive(a.bumpedAt, now);
  const bumpB = isListingBumpActive(b.bumpedAt, now);
  if (bumpA !== bumpB) return bumpA ? -1 : 1;
  if (bumpA && bumpB) {
    return (toMs(b.bumpedAt) || 0) - (toMs(a.bumpedAt) || 0);
  }

  return (toMs(b.createdAt) || 0) - (toMs(a.createdAt) || 0);
}

/** Id order for non-shuffled category pages / home strips. */
export function orderListingsNewestFirst(
  items: ListingDisplayOrderFields[],
  now = Date.now(),
): string[] {
  return [...items]
    .sort((a, b) => compareListingsForDisplay(a, b, now))
    .map((item) => item.id);
}

/**
 * Seeded order that prefers higher costPrice while still varying each visit.
 * Brand-new listings get a freshness boost so they are not buried when
 * costPrice is still empty (common right after registration).
 * Active 상단 pins (24h) float to the front; reserved/sold stay at the back.
 */
export function seededCostBiasedOrder(
  items: ListingDisplayOrderFields[],
  seed: number,
  now = Date.now(),
): string[] {
  const rng = mulberry32(seed);
  const parsed = items.map((item) => {
    const createdMs = toMs(item.createdAt);
    const ageDays = Number.isFinite(createdMs)
      ? Math.max(0, (now - createdMs) / (24 * 60 * 60 * 1000))
      : 999;
    return {
      id: item.id,
      cost: parseCostDigits(item.costPrice),
      ageDays,
      statusRank: listingSaleStatusRank(item.saleStatus),
      bumpActive: isListingBumpActive(item.bumpedAt, now),
      bumpedMs: toMs(item.bumpedAt),
    };
  });
  const maxCost = Math.max(1, ...parsed.map((p) => p.cost));
  // Noise keeps order fresh without erasing cost / freshness priority.
  const noise = maxCost * 0.35;
  // Strong enough that an active pin always beats cost/freshness among available.
  const bumpBoostAmount = maxCost * 10;
  // Larger than any available score so reserved/sold stay on later pages.
  const reservedPenalty = maxCost * 100 + bumpBoostAmount;

  return parsed
    .map((p) => {
      // Keep newly registered units on early pages even before cost is entered.
      const freshBoost =
        p.ageDays <= 3
          ? maxCost * 1.2
          : p.ageDays <= 14
            ? maxCost * 0.5
            : 0;
      // Missing cost → upper-mid band (not last pages).
      const base = p.cost > 0 ? p.cost : maxCost * 0.55;
      const bumpBoost = p.bumpActive ? bumpBoostAmount : 0;
      const statusPenalty = p.statusRank === 1 ? reservedPenalty : 0;
      // Tiny tie-break so more recent pins win when both are active.
      const bumpRecency =
        p.bumpActive && Number.isFinite(p.bumpedMs)
          ? (p.bumpedMs as number) / 1e15
          : 0;
      return {
        id: p.id,
        statusRank: p.statusRank,
        bumpActive: p.bumpActive,
        bumpedMs: Number.isFinite(p.bumpedMs) ? (p.bumpedMs as number) : 0,
        score: base + freshBoost + bumpBoost + bumpRecency + rng() * noise - statusPenalty,
      };
    })
    .sort((a, b) => {
      if (a.statusRank !== b.statusRank) return a.statusRank - b.statusRank;
      if (a.bumpActive !== b.bumpActive) return a.bumpActive ? -1 : 1;
      if (a.bumpActive && b.bumpActive && a.bumpedMs !== b.bumpedMs) {
        return b.bumpedMs - a.bumpedMs;
      }
      return b.score - a.score;
    })
    .map((p) => p.id);
}

/** Reorder rows to match an id sequence (e.g. after shuffled pagination). */
export function orderByIds<T extends { id: string }>(
  rows: T[],
  ids: string[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered: T[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) ordered.push(row);
  }
  return ordered;
}
