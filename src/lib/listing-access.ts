import "server-only";
import type { Role } from "@prisma/client";
import { auth, canModifyListing } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionDbUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

/** Resolve the signed-in user from DB (id first, then login email). */
export async function resolveSessionDbUser(): Promise<SessionDbUser | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const select = { id: true, role: true, email: true, name: true } as const;

    if (session.user.id) {
      const byId = await prisma.user.findUnique({
        where: { id: session.user.id },
        select,
      });
      if (byId) return byId;
    }

    if (session.user.email) {
      const byEmail = await prisma.user.findUnique({
        where: { email: session.user.email },
        select,
      });
      if (byEmail) return byEmail;
    }

    return null;
  } catch (error) {
    // Avoid taking down every page if auth/DB is misconfigured in production.
    console.error("[resolveSessionDbUser]", error);
    return null;
  }
}

/** Whether the current user may edit/delete this listing (DB-backed role + id). */
export async function userCanModifyListing(authorId: string): Promise<boolean> {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) return false;
  return canModifyListing(dbUser.role, dbUser.id, authorId);
}

/**
 * Load listing and verify the current user may modify it.
 * Admins: any listing. Authorized: only own (authorId).
 */
export async function requireListingModifier(listingId: string) {
  const dbUser = await resolveSessionDbUser();
  if (!dbUser) {
    return { ok: false as const, status: 401 as const, error: "로그인이 필요합니다." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { images: { orderBy: { sortOrder: "asc" as const } } },
  });
  if (!listing) {
    return { ok: false as const, status: 404 as const, error: "매물을 찾을 수 없습니다." };
  }

  if (!canModifyListing(dbUser.role, dbUser.id, listing.authorId)) {
    return { ok: false as const, status: 403 as const, error: "권한이 없습니다." };
  }

  return { ok: true as const, dbUser, listing };
}
