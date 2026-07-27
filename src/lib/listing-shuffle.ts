/**
 * Some category pages shuffle so newer units are not always on top.
 * Category pages use a URL `shuffle` seed (new on each menu click).
 * Car Listings uses a cost-biased shuffle (higher costPrice tends to appear earlier).
 */

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

/**
 * Seeded order that prefers higher costPrice while still varying each visit.
 * Brand-new listings get a freshness boost so they are not buried when
 * costPrice is still empty (common right after registration).
 */
export function seededCostBiasedOrder(
  items: Array<{
    id: string;
    costPrice?: string | null;
    createdAt?: Date | string | null;
  }>,
  seed: number,
): string[] {
  const rng = mulberry32(seed);
  const now = Date.now();
  const parsed = items.map((item) => {
    const createdMs = item.createdAt
      ? new Date(item.createdAt).getTime()
      : Number.NaN;
    const ageDays = Number.isFinite(createdMs)
      ? Math.max(0, (now - createdMs) / (24 * 60 * 60 * 1000))
      : 999;
    return {
      id: item.id,
      cost: parseCostDigits(item.costPrice),
      ageDays,
    };
  });
  const maxCost = Math.max(1, ...parsed.map((p) => p.cost));
  // Noise keeps order fresh without erasing cost / freshness priority.
  const noise = maxCost * 0.35;

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
      return {
        id: p.id,
        score: base + freshBoost + rng() * noise,
      };
    })
    .sort((a, b) => b.score - a.score)
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
