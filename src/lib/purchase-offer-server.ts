import "server-only";

import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { OFFER_DEVICE_COOKIE } from "@/lib/purchase-offer";

export function hashClientIp(ip: string) {
  const salt = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "kat";
  return createHash("sha256").update(`${salt}:offer-ip:${ip}`).digest("hex");
}

export async function resolveClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  const realIp = h.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 100);
  return "unknown";
}

/** Read or create a stable device id cookie (httpOnly). */
export async function resolveOfferDeviceId() {
  const jar = await cookies();
  const existing = jar.get(OFFER_DEVICE_COOKIE)?.value?.trim();
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    return existing;
  }

  const deviceId = randomUUID().replace(/-/g, "");
  jar.set(OFFER_DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return deviceId;
}
