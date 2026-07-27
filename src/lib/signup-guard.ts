import "server-only";

import { createHash } from "crypto";
import { phoneKeyFromPhone } from "@/lib/phone";
import type { AccountStatus } from "@prisma/client";

export { phoneKeyFromPhone };

/** Statuses that still "own" a phone / IP / device for signup blocking. */
export const SIGNUP_BLOCKING_STATUSES: AccountStatus[] = [
  "PENDING",
  "APPROVED",
];

export function hashSignupIp(ip: string): string | null {
  const trimmed = ip.trim();
  if (!trimmed || trimmed === "unknown") return null;
  const salt =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!salt) {
    throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
  }
  return createHash("sha256")
    .update(`${salt}:join-ip:${trimmed}`)
    .digest("hex");
}

export const SIGNUP_DUP_MESSAGES = {
  phone: "This contact number is already registered.",
  ip: "An account has already been created from this network. Please contact the administrator.",
  device:
    "An account has already been created from this device. Please contact the administrator.",
} as const;
