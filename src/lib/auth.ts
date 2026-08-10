import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { verifyCredentials } from "@/lib/authenticate";
import { loginIdSchema } from "@/lib/login-id";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { recordUserAccess } from "@/lib/user-access";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    /** Epoch ms of last DB role/status revalidation */
    checkedAt?: number;
  }
}

/** How often to re-check user role/status from DB (cuts auth DB load). */
const JWT_DB_REVALIDATE_MS = 10 * 60 * 1000;

/** Set `code` after super() — Auth.js constructor resets it to "credentials". */
function credentialsError(code: string): CredentialsSignin {
  const error = new CredentialsSignin();
  error.code = code;
  return error;
}

/** Login accepts any non-empty password; strength is enforced at Join / change. */
const credentialsSchema = z.object({
  email: loginIdSchema,
  password: z.string().min(1, "Password is required"),
});

/** Absolute JWT lifetime. Cookie is also made browser-session scoped in the auth route. */
const SESSION_MAX_AGE_SEC = 8 * 60 * 60; // 8 hours

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    // Do not keep sliding the expiry forward on every request
    updateAge: SESSION_MAX_AGE_SEC,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SEC,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Prefer session cookie; Auth.js may still set Max-Age — stripped in route handler
        maxAge: SESSION_MAX_AGE_SEC,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Rate limiting is applied in diagnoseLogin (client form) and here for
        // any direct Auth.js credential posts. Soft limit so double-check on
        // success path rarely trips.
        const ip = await clientIpFromHeaders();
        const byIp = rateLimit(`login:ip:${ip}`, 40, 15 * 60 * 1000);
        const byId = rateLimit(
          `login:id:${parsed.data.email}`,
          20,
          15 * 60 * 1000,
        );
        if (!byIp.ok || !byId.ok) {
          throw credentialsError("rate_limited");
        }

        const result = await verifyCredentials(
          parsed.data.email,
          parsed.data.password,
        );

        if (!result.ok) {
          if (result.reason === "pending") throw credentialsError("pending");
          if (result.reason === "rejected") throw credentialsError("rejected");
          throw credentialsError("credentials");
        }

        await recordUserAccess(result.user.id, { force: true });

        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.sub = user.id;
        token.role = user.role;
        token.checkedAt = Date.now();
      }

      const userId =
        (typeof token.id === "string" && token.id) ||
        (typeof token.sub === "string" && token.sub) ||
        "";

      if (userId) {
        const stale =
          !token.checkedAt ||
          Date.now() - token.checkedAt > JWT_DB_REVALIDATE_MS;

        if (stale || user) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, name: true, email: true, status: true },
          });
          if (!dbUser) {
            delete token.id;
            delete token.sub;
            delete token.role;
            return token;
          }
          // Revoke session if a non-admin account is no longer approved.
          if (dbUser.role !== "ADMIN" && dbUser.status !== "APPROVED") {
            delete token.id;
            delete token.sub;
            delete token.role;
            return token;
          }
          token.id = userId;
          token.sub = userId;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.checkedAt = Date.now();
          // Fire-and-forget: never block JWT/auth on analytics writes (SQLite locks).
          if (!user) {
            void recordUserAccess(userId);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id =
          (typeof token.id === "string" && token.id) ||
          (typeof token.sub === "string" && token.sub) ||
          "";
        session.user.id = id;
        session.user.role = (token.role as Role | undefined) ?? "MEMBER";
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
      }
      return session;
    },
  },
});

/** Admins and authorized members may create vehicle listings. */
export function canManageListings(role?: Role) {
  return role === "ADMIN" || role === "AUTHORIZED";
}

/**
 * Any signed-in (approved) member may list Used Parts.
 * Login already blocks PENDING / REJECTED accounts.
 */
export function canListUsedParts(role?: Role) {
  return Boolean(role);
}

/** Create permission by category — Used Parts is open to all members. */
export function canCreateListing(
  role: Role | undefined,
  category: string | null | undefined,
) {
  if (!role) return false;
  if (category === "USED_PARTS") return canListUsedParts(role);
  return canManageListings(role);
}

/**
 * Live Auction detail + offers: any signed-in account.
 * Guests see a member-access popup instead of listing details.
 */
export function canAccessLiveAuction(role?: Role) {
  return Boolean(role);
}

/** Prefer when you already know the user is signed in. */
export function canAccessLiveAuctionAsSignedIn(isSignedIn: boolean) {
  return isSignedIn;
}

export function isAdmin(role?: Role) {
  return role === "ADMIN";
}

/**
 * Admins may modify any listing.
 * Authorized members may modify only listings they authored.
 * Regular members may modify only their own Used Parts listings.
 */
export function canModifyListing(
  role: Role | undefined,
  userId: string | undefined,
  authorId: string,
  category?: string | null,
) {
  if (!role || !userId) return false;
  if (role === "ADMIN") return true;
  if (userId !== authorId) return false;
  if (role === "AUTHORIZED") return true;
  if (role === "MEMBER" && category === "USED_PARTS") return true;
  return false;
}
