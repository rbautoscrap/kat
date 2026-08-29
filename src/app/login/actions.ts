"use server";

import { diagnoseAccountStatus } from "@/lib/authenticate";
import { loginIdSchema } from "@/lib/login-id";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";

export type LoginDiagnoseResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "pending" | "rejected" | "rate_limited" | "invalid_input";
    };

/**
 * Validate credentials before Auth.js signIn so pending/rejected/rate-limit
 * reasons are not collapsed into a generic “Invalid ID or password” message.
 */
export async function diagnoseLogin(
  rawLoginId: string,
  password: string,
): Promise<LoginDiagnoseResult> {
  const parsedId = loginIdSchema.safeParse(rawLoginId);
  if (!parsedId.success || !password) {
    return { ok: false, reason: "invalid_input" };
  }

  const ip = await clientIpFromHeaders();
  const byIp = rateLimit(`login:ip:${ip}`, 200, 15 * 60 * 1000);
  const byId = rateLimit(`login:id:${parsedId.data}`, 60, 15 * 60 * 1000);
  if (!byIp.ok || !byId.ok) {
    return { ok: false, reason: "rate_limited" };
  }

  try {
    const result = await diagnoseAccountStatus(parsedId.data);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true };
  } catch (error) {
    console.error("[diagnoseLogin] failed open", error);
    return { ok: true };
  }
}
