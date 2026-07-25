/**
 * Stand by listings are shuffled so newer units are not always on top.
 * Category pages use a URL `shuffle` seed (new on each menu click).
 * Home section uses a short time window so SSR stays stable within a request.
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

/** New seed for each Stand by menu visit. */
export function newStandByShuffleSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export function parseStandByShuffleSeed(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n >>> 0;
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
