import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";

/** Stable browser id for signup duplicate checks (separate from offer cookie). */
export const SIGNUP_DEVICE_COOKIE = "kat_signup_device";

/** Read or create a stable signup device id cookie (httpOnly). */
export async function resolveSignupDeviceId() {
  const jar = await cookies();
  const existing = jar.get(SIGNUP_DEVICE_COOKIE)?.value?.trim();
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    return existing;
  }

  const deviceId = randomUUID().replace(/-/g, "");
  jar.set(SIGNUP_DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return deviceId;
}
