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
const FLUSH_MS = 15_000;

let pendingIncrements = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

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

async function refreshVisitStats() {
  const today = todayKey();
  const now = Date.now();
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
  statsCache = {
    at: now,
    today,
    todayVisits: stats.todayVisits + pendingIncrements,
    totalVisits: stats.totalVisits + pendingIncrements,
  };
  return {
    todayVisits: statsCache.todayVisits,
    totalVisits: statsCache.totalVisits,
  };
}

export async function getVisitStats() {
  try {
    if (statsCache) {
      if (Date.now() - statsCache.at >= STATS_CACHE_MS && pendingIncrements === 0) {
        void refreshVisitStats().catch((error) => {
          console.error("[visits] background refresh failed", error);
        });
      }
      return {
        todayVisits: statsCache.todayVisits,
        totalVisits: statsCache.totalVisits,
      };
    }
    return await refreshVisitStats();
  } catch (error) {
    console.error("[visits] getVisitStats failed", error);
    return emptyStats;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPendingVisits();
  }, FLUSH_MS);
}

async function flushPendingVisits() {
  if (flushing || pendingIncrements <= 0) return;
  flushing = true;
  const n = pendingIncrements;
  pendingIncrements = 0;
  const today = todayKey();
  try {
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
              todayVisits: n,
              totalVisits: { increment: n },
            },
          })
        : await prisma.siteStats.update({
            where: { id: "main" },
            data: {
              todayVisits: { increment: n },
              totalVisits: { increment: n },
            },
          });

    statsCache = {
      at: Date.now(),
      today,
      todayVisits: updated.todayVisits + pendingIncrements,
      totalVisits: updated.totalVisits + pendingIncrements,
    };
  } catch (error) {
    pendingIncrements += n;
    scheduleFlush();
    console.error("[visits] flush failed", error);
  } finally {
    flushing = false;
  }
}

export async function recordVisit() {
  try {
    const today = todayKey();
    pendingIncrements += 1;

    if (statsCache) {
      if (statsCache.today !== today) {
        statsCache = {
          at: Date.now(),
          today,
          todayVisits: 1,
          totalVisits: statsCache.totalVisits + 1,
        };
      } else {
        statsCache.todayVisits += 1;
        statsCache.totalVisits += 1;
        statsCache.at = Date.now();
      }
    } else {
      await refreshVisitStats();
    }

    scheduleFlush();
    return statsCache
      ? {
          todayVisits: statsCache.todayVisits,
          totalVisits: statsCache.totalVisits,
        }
      : emptyStats;
  } catch (error) {
    console.error("[visits] recordVisit failed", error);
    return null;
  }
}
