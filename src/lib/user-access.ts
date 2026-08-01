import "server-only";

import { prisma } from "@/lib/prisma";

/** Minimum gap between visit-based access increments (not password logins). */
const ACCESS_THROTTLE_MS = 30 * 60 * 1000;

/**
 * Record member access for admin analytics.
 * - `force`: always count (successful password login)
 * - otherwise: count at most once per 30 minutes while the session is active
 */
export async function recordUserAccess(
  userId: string,
  options?: { force?: boolean },
) {
  if (!userId) return;

  try {
    if (!options?.force) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastLoginAt: true },
      });
      if (
        existing?.lastLoginAt &&
        Date.now() - existing.lastLoginAt.getTime() < ACCESS_THROTTLE_MS
      ) {
        return;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginCount: { increment: 1 },
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[recordUserAccess] failed", error);
  }
}
