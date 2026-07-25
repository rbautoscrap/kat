import { prisma } from "@/lib/prisma";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const emptyStats = { todayVisits: 0, totalVisits: 0 };

/** Short in-process cache to avoid a DB hit on every footer render. */
let statsCache: {
  at: number;
  today: string;
  todayVisits: number;
  totalVisits: number;
} | null = null;

const STATS_CACHE_MS = 15_000;

function fromRow(stats: {
  todayDate: string;
  todayVisits: number;
  totalVisits: number;
}) {
  const today = todayKey();
  if (stats.todayDate !== today) {
    return { todayVisits: 0, totalVisits: stats.totalVisits };
  }
  return {
    todayVisits: stats.todayVisits,
    totalVisits: stats.totalVisits,
  };
}

export async function getVisitStats() {
  try {
    const today = todayKey();
    const now = Date.now();
    if (
      statsCache &&
      statsCache.today === today &&
      now - statsCache.at < STATS_CACHE_MS
    ) {
      return {
        todayVisits: statsCache.todayVisits,
        totalVisits: statsCache.totalVisits,
      };
    }

    let row = await prisma.siteStats.findUnique({ where: { id: "main" } });
    if (!row) {
      row = await prisma.siteStats.create({
        data: {
          id: "main",
          totalVisits: 0,
          todayVisits: 0,
          todayDate: today,
        },
      });
    }

    const stats = fromRow(row);
    statsCache = { at: now, today, ...stats };
    return stats;
  } catch (error) {
    console.error("[visits] getVisitStats failed", error);
    return emptyStats;
  }
}

export async function recordVisit() {
  try {
    const today = todayKey();
    const current = await prisma.siteStats.upsert({
      where: { id: "main" },
      update: {},
      create: {
        id: "main",
        totalVisits: 0,
        todayVisits: 0,
        todayDate: today,
      },
    });

    const updated =
      current.todayDate !== today
        ? await prisma.siteStats.update({
            where: { id: "main" },
            data: {
              todayDate: today,
              todayVisits: 1,
              totalVisits: { increment: 1 },
            },
          })
        : await prisma.siteStats.update({
            where: { id: "main" },
            data: {
              todayVisits: { increment: 1 },
              totalVisits: { increment: 1 },
            },
          });

    statsCache = {
      at: Date.now(),
      today,
      todayVisits: updated.todayVisits,
      totalVisits: updated.totalVisits,
    };
    return updated;
  } catch (error) {
    console.error("[visits] recordVisit failed", error);
    return null;
  }
}
