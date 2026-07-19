-- CreateTable
CREATE TABLE "SiteStats" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "todayVisits" INTEGER NOT NULL DEFAULT 0,
    "todayDate" TEXT NOT NULL DEFAULT ''
);
