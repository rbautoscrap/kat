import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { verifyCredentials } from "@/lib/authenticate";
import { loginIdSchema } from "@/lib/login-id";
import { prisma } from "@/lib/prisma";

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

class PendingApprovalError extends CredentialsSignin {
  code = "pending";
}

class RejectedAccountError extends CredentialsSignin {
  code = "rejected";
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

        const result = await verifyCredentials(
          parsed.data.email,
          parsed.data.password,
        );

        if (!result.ok) {
          if (result.reason === "pending") throw new PendingApprovalError();
          if (result.reason === "rejected") throw new RejectedAccountError();
          return null;
        }

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

/** Admins and authorized members may create listings. */
export function canManageListings(role?: Role) {
  return role === "ADMIN" || role === "AUTHORIZED";
}

/**
 * Live Auction: approved partner members only.
 * (Login already requires APPROVED status; role must be AUTHORIZED or ADMIN.)
 */
export function canAccessLiveAuction(role?: Role) {
  return role === "ADMIN" || role === "AUTHORIZED";
}

export function isAdmin(role?: Role) {
  return role === "ADMIN";
}

/**
 * Admins may modify any listing.
 * Authorized members may modify only listings they authored.
 */
export function canModifyListing(
  role: Role | undefined,
  userId: string | undefined,
  authorId: string,
) {
  if (!role || !userId) return false;
  if (role === "ADMIN") return true;
  if (role === "AUTHORIZED" && userId === authorId) return true;
  return false;
}
