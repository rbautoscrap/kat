import "server-only";

import type { AccountStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EngagementSort =
  | "score"
  | "logins"
  | "offers"
  | "purchases"
  | "newest";

export type MemberEngagementRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  loginCount: number;
  lastLoginAt: Date | null;
  listingCount: number;
  offerCount: number;
  purchaseCount: number;
  /** Weighted activity score for ranking. */
  score: number;
};

export function parseEngagementSort(value?: string): EngagementSort {
  if (
    value === "logins" ||
    value === "offers" ||
    value === "purchases" ||
    value === "newest" ||
    value === "score"
  ) {
    return value;
  }
  return "score";
}

/** logins + offers×3 + purchases×10 + listings×2 */
export function engagementScore(row: {
  loginCount: number;
  offerCount: number;
  purchaseCount: number;
  listingCount: number;
}) {
  return (
    row.loginCount +
    row.offerCount * 3 +
    row.purchaseCount * 10 +
    row.listingCount * 2
  );
}

export async function loadMemberEngagement(
  sort: EngagementSort = "score",
): Promise<{
  rows: MemberEngagementRow[];
  totals: {
    members: number;
    activeLogins: number;
    withOffers: number;
    withPurchases: number;
    loginSum: number;
    offerSum: number;
    purchaseSum: number;
  };
}> {
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      loginCount: true,
      lastLoginAt: true,
      _count: {
        select: {
          listings: true,
          purchaseOffers: true,
          purchasedStatements: true,
        },
      },
    },
  });

  const rows: MemberEngagementRow[] = users.map((user) => {
    const listingCount = user._count.listings;
    const offerCount = user._count.purchaseOffers;
    const purchaseCount = user._count.purchasedStatements;
    const loginCount = user.loginCount;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      loginCount,
      lastLoginAt: user.lastLoginAt,
      listingCount,
      offerCount,
      purchaseCount,
      score: engagementScore({
        loginCount,
        offerCount,
        purchaseCount,
        listingCount,
      }),
    };
  });

  rows.sort((a, b) => {
    if (sort === "logins") return b.loginCount - a.loginCount;
    if (sort === "offers") return b.offerCount - a.offerCount;
    if (sort === "purchases") return b.purchaseCount - a.purchaseCount;
    if (sort === "newest") {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return b.loginCount - a.loginCount;
  });

  const totals = {
    members: rows.length,
    activeLogins: rows.filter((r) => r.loginCount > 0).length,
    withOffers: rows.filter((r) => r.offerCount > 0).length,
    withPurchases: rows.filter((r) => r.purchaseCount > 0).length,
    loginSum: rows.reduce((sum, r) => sum + r.loginCount, 0),
    offerSum: rows.reduce((sum, r) => sum + r.offerCount, 0),
    purchaseSum: rows.reduce((sum, r) => sum + r.purchaseCount, 0),
  };

  return { rows, totals };
}
