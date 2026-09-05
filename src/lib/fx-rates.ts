/**
 * Live KRW → USD / EUR mid-market rates for public sale-price display.
 * Cached in process for an hour so listing pages do not hit the API every time.
 */

export type KrwFxRates = {
  usdPerKrw: number;
  eurPerKrw: number;
};

/** Customer board: won per 1 USD / 1 EUR. */
export type FxBoardQuote = {
  usd: number;
  eur: number;
  asOf: string;
};

const CACHE_MS = 60 * 60 * 1000;
const BOARD_CACHE_MS = 60 * 1000;

let cache: { at: number; rates: KrwFxRates } | null = null;
let inflight: Promise<KrwFxRates | null> | null = null;
let boardCache: { at: number; quote: FxBoardQuote } | null = null;
let boardInflight: Promise<FxBoardQuote | null> | null = null;

function isUsable(rates: KrwFxRates) {
  return (
    Number.isFinite(rates.usdPerKrw) &&
    rates.usdPerKrw > 0 &&
    Number.isFinite(rates.eurPerKrw) &&
    rates.eurPerKrw > 0
  );
}

async function readJson(url: string, revalidate = 3600) {
  const res = await fetch(url, {
    next: { revalidate },
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`fx ${res.status}`);
  return res.json();
}

async function fetchFrankfurter(revalidate = 3600): Promise<KrwFxRates> {
  const json = (await readJson(
    "https://api.frankfurter.app/latest?from=KRW&to=USD,EUR",
    revalidate,
  )) as { rates?: { USD?: number; EUR?: number } };
  const usdPerKrw = Number(json.rates?.USD);
  const eurPerKrw = Number(json.rates?.EUR);
  const rates = { usdPerKrw, eurPerKrw };
  if (!isUsable(rates)) throw new Error("frankfurter empty");
  return rates;
}

async function fetchOpenEr(revalidate = 3600): Promise<KrwFxRates> {
  const json = (await readJson("https://open.er-api.com/v6/latest/KRW", revalidate)) as {
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

function toBoardQuote(rates: KrwFxRates, asOf = new Date().toISOString()): FxBoardQuote | null {
  const usd = 1 / rates.usdPerKrw;
  const eur = 1 / rates.eurPerKrw;
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(eur) || eur <= 0) {
    return null;
  }
  return { usd, eur, asOf };
}

async function loadBoardRates(): Promise<KrwFxRates | null> {
  try {
    return await fetchOpenEr(60);
  } catch {
    try {
      return await fetchFrankfurter(60);
    } catch (error) {
      console.error("[fx-rates] board lookup failed", error);
      return null;
    }
  }
}

export async function getFxBoardQuote(): Promise<FxBoardQuote | null> {
  if (boardCache && Date.now() - boardCache.at < BOARD_CACHE_MS) {
    return boardCache.quote;
  }
  if (!boardInflight) {
    boardInflight = loadBoardRates()
      .then((rates) => {
        const quote = rates ? toBoardQuote(rates) : null;
        if (quote) boardCache = { at: Date.now(), quote };
        return quote;
      })
      .finally(() => {
        boardInflight = null;
      });
  }
  return boardInflight;
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
