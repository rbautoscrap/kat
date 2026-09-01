/**
 * Live KRW → USD / EUR mid-market rates for public sale-price display.
 * Cached in process for an hour so listing pages do not hit the API every time.
 */

export type KrwFxRates = {
  usdPerKrw: number;
  eurPerKrw: number;
};

const CACHE_MS = 60 * 60 * 1000;

let cache: { at: number; rates: KrwFxRates } | null = null;
let inflight: Promise<KrwFxRates | null> | null = null;

function isUsable(rates: KrwFxRates) {
  return (
    Number.isFinite(rates.usdPerKrw) &&
    rates.usdPerKrw > 0 &&
    Number.isFinite(rates.eurPerKrw) &&
    rates.eurPerKrw > 0
  );
}

async function readJson(url: string) {
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`fx ${res.status}`);
  return res.json();
}

async function fetchFrankfurter(): Promise<KrwFxRates> {
  const json = (await readJson(
    "https://api.frankfurter.app/latest?from=KRW&to=USD,EUR",
  )) as { rates?: { USD?: number; EUR?: number } };
  const usdPerKrw = Number(json.rates?.USD);
  const eurPerKrw = Number(json.rates?.EUR);
  const rates = { usdPerKrw, eurPerKrw };
  if (!isUsable(rates)) throw new Error("frankfurter empty");
  return rates;
}

async function fetchOpenEr(): Promise<KrwFxRates> {
  const json = (await readJson("https://open.er-api.com/v6/latest/KRW")) as {
    rates?: { USD?: number; EUR?: number };
  };
  const usdPerKrw = Number(json.rates?.USD);
  const eurPerKrw = Number(json.rates?.EUR);
  const rates = { usdPerKrw, eurPerKrw };
  if (!isUsable(rates)) throw new Error("open.er empty");
  return rates;
}

async function loadRates(): Promise<KrwFxRates | null> {
  try {
    return await fetchFrankfurter();
  } catch {
    try {
      return await fetchOpenEr();
    } catch (error) {
      console.error("[fx-rates] lookup failed", error);
      return null;
    }
  }
}

export async function getKrwFxRates(): Promise<KrwFxRates | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rates;
  if (!inflight) {
    inflight = loadRates()
      .then((rates) => {
        if (rates) cache = { at: Date.now(), rates };
        return rates;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function convertKrw(amountKrw: number, perKrw: number) {
  if (!Number.isFinite(amountKrw) || amountKrw <= 0 || !Number.isFinite(perKrw)) {
    return 0;
  }
  return amountKrw * perKrw;
}

/** Foreign amount → KRW using a KRW-base mid-market rate (USD/EUR per 1 KRW). */
export function convertFxToKrw(amountFx: number, perKrw: number) {
  if (!Number.isFinite(amountFx) || amountFx === 0) return 0;
  if (!Number.isFinite(perKrw) || perKrw <= 0) return 0;
  return amountFx / perKrw;
}
