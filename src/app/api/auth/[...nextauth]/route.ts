import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

/**
 * Convert Auth.js session-token cookies into browser session cookies
 * (strip Expires / Max-Age) so closing the browser clears the login.
 * JWT lifetime is still enforced via session.maxAge in auth.ts.
 */
function toBrowserSessionCookies(response: Response): Response {
  try {
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
  } catch (error) {
    console.error("[auth-route] cookie rewrite failed", error);
    return response;
  }
}

async function safeAuth(
  method: "GET" | "POST",
  req: NextRequest,
): Promise<Response> {
  try {
    const res =
      method === "GET" ? await handlers.GET(req) : await handlers.POST(req);
    return toBrowserSessionCookies(res);
  } catch (error) {
    console.error(`[auth-route] ${method} failed`, error);
    return Response.json(
      {
        error: "AuthConfiguration",
        message:
          "Authentication service failed. Check AUTH_SECRET and AUTH_URL on the server.",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return safeAuth("GET", req);
}

export async function POST(req: NextRequest) {
  return safeAuth("POST", req);
}
