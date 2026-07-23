import "server-only";

/** Normalize host or URL to `https://origin` (no trailing slash). */
export function toHttpsOrigin(raw: string | null | undefined): string | null {
  let v = String(raw ?? "").trim();
  if (!v) return null;
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
    return null;
  }
}

export function isRailwayHostname(hostname: string) {
  const h = hostname.toLowerCase();
  return h.endsWith(".up.railway.app") || h.endsWith(".railway.app");
}

/**
 * Direct Railway public origin (bypasses Cloudflare on custom domains).
 * Prefer RAILWAY_RESTORE_ORIGIN, then Railway-injected public domain.
 */
export function getRailwayPublicOrigin(): string | null {
  return (
    toHttpsOrigin(process.env.RAILWAY_RESTORE_ORIGIN) ||
    toHttpsOrigin(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    toHttpsOrigin(process.env.RAILWAY_STATIC_URL)
  );
}

/** Origins allowed to call Railway restore via CORS (custom domain → Railway). */
export function getRestoreCorsOrigins(): Set<string> {
  const set = new Set<string>();
  const auth = toHttpsOrigin(process.env.AUTH_URL);
  if (auth) {
    set.add(auth);
    try {
      const u = new URL(auth);
      if (u.hostname.startsWith("www.")) {
        set.add(`${u.protocol}//${u.hostname.slice(4)}`);
      } else if (!u.hostname.includes("localhost")) {
        set.add(`${u.protocol}//www.${u.hostname}`);
      }
    } catch {
      // ignore
    }
  }
  const railway = getRailwayPublicOrigin();
  if (railway) set.add(railway);

  for (const raw of (process.env.RESTORE_CORS_ORIGINS ?? "").split(",")) {
    const origin = toHttpsOrigin(raw);
    if (origin) set.add(origin);
  }
  return set;
}

export function restoreCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  if (!origin) return {};
  if (!getRestoreCorsOrigins().has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Kat-Restore-Ticket, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
