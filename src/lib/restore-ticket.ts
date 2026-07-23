import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type TicketPayload = {
  v: 1;
  uid: string;
  exp: number;
};

function secret() {
  const s = process.env.AUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET이 설정되지 않았습니다.");
  return s;
}

function sign(payloadB64: string) {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

/** Short-lived admin ticket for large ZIP restore via Railway origin. */
export function createRestoreTicket(userId: string, ttlSec = 45 * 60): string {
  const payload: TicketPayload = {
    v: 1,
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyRestoreTicket(
  ticket: string,
): { userId: string } | null {
  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as TicketPayload;
    if (json.v !== 1 || typeof json.uid !== "string" || typeof json.exp !== "number") {
      return null;
    }
    if (json.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: json.uid };
  } catch {
    return null;
  }
}
