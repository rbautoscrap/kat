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
 * Missing / zero cost tends toward the back.
 */
export function seededCostBiasedOrder(
  items: Array<{ id: string; costPrice?: string | null }>,
  seed: number,
): string[] {
  const rng = mulberry32(seed);
  const parsed = items.map((item) => ({
    id: item.id,
    cost: parseCostDigits(item.costPrice),
  }));
  const maxCost = Math.max(1, ...parsed.map((p) => p.cost));
  // Noise ~45% of max cost: high-cost units stay early, order still refreshes.
  const noise = maxCost * 0.45;

  return parsed
    .map((p) => ({
      id: p.id,
      score: p.cost + rng() * noise,
    }))
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
