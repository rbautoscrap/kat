import { prisma } from "@/lib/prisma";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getVisitStats() {
  const stats = await prisma.siteStats.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      totalVisits: 0,
      todayVisits: 0,
      todayDate: todayKey(),
    },
  });

  const today = todayKey();
  if (stats.todayDate !== today) {
    return {
      todayVisits: 0,
      totalVisits: stats.totalVisits,
    };
  }

  return {
    todayVisits: stats.todayVisits,
    totalVisits: stats.totalVisits,
  };
}

export async function recordVisit() {
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

  if (current.todayDate !== today) {
    return prisma.siteStats.update({
      where: { id: "main" },
      data: {
        todayDate: today,
        todayVisits: 1,
        totalVisits: { increment: 1 },
      },
    });
  }

  return prisma.siteStats.update({
    where: { id: "main" },
    data: {
      todayVisits: { increment: 1 },
      totalVisits: { increment: 1 },
    },
  });
}
