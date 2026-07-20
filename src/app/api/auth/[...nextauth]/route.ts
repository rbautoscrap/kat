import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

/**
 * Convert Auth.js session-token cookies into browser session cookies
 * (strip Expires / Max-Age) so closing the browser clears the login.
 * JWT lifetime is still enforced via session.maxAge in auth.ts.
 */
function toBrowserSessionCookies(response: Response): Response {
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length === 0) return response;

  const headers = new Headers(response.headers);
  headers.delete("set-cookie");

  for (const cookie of cookies) {
    const namePart = cookie.split(";", 1)[0] ?? "";
    const isSessionToken =
      /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/i.test(namePart) ||
      /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?=/i.test(namePart);

    if (isSessionToken) {
      const isDelete = /;\s*Max-Age=0(?:;|$)/i.test(cookie);
      const sessionCookie = isDelete
        ? cookie
        : cookie
            .replace(/;\s*Expires=[^;]*/gi, "")
            .replace(/;\s*Max-Age=[^;]*/gi, "")
            .trim();
      headers.append("set-cookie", sessionCookie);
    } else {
      headers.append("set-cookie", cookie);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function GET(req: NextRequest) {
  const res = await handlers.GET(req);
  return toBrowserSessionCookies(res);
}

export async function POST(req: NextRequest) {
  const res = await handlers.POST(req);
  return toBrowserSessionCookies(res);
}
