export const PROMO_CHANNEL_KEYS = [
  "telegram",
  "instagram",
  "facebook",
  "x",
] as const;

export type PromoChannelKey = (typeof PROMO_CHANNEL_KEYS)[number];

export type PromoChannelResult = {
  ok: boolean;
  /** ISO timestamp */
  at?: string;
  url?: string;
  error?: string;
};

export type PromoChannelResults = Partial<
  Record<PromoChannelKey, PromoChannelResult>
>;

export const PROMO_CHANNEL_LABELS: Record<PromoChannelKey, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
};

export function isPromoChannelKey(value: string): value is PromoChannelKey {
  return (PROMO_CHANNEL_KEYS as readonly string[]).includes(value);
}

export function parseChannelResults(
  raw: string | null | undefined,
): PromoChannelResults {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: PromoChannelResults = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isPromoChannelKey(key) || !value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      out[key] = {
        ok: Boolean(row.ok),
        at: typeof row.at === "string" ? row.at : undefined,
        url: typeof row.url === "string" ? row.url : undefined,
        error: typeof row.error === "string" ? row.error : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeChannelResults(results: PromoChannelResults) {
  return JSON.stringify(results);
}

/** Merge n8n/admin channel payloads into stored JSON. */
export function mergeChannelResults(
  existingRaw: string | null | undefined,
  incoming: PromoChannelResults,
  fallbackAt = new Date().toISOString(),
): PromoChannelResults {
  const merged = { ...parseChannelResults(existingRaw) };
  for (const key of PROMO_CHANNEL_KEYS) {
    const next = incoming[key];
    if (!next) continue;
    merged[key] = {
      ok: Boolean(next.ok),
      at: next.at || fallbackAt,
      url: next.url?.trim() || undefined,
      error: next.ok ? undefined : next.error?.trim() || undefined,
    };
  }
  return merged;
}
