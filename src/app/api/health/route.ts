import { existsSync, statfsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { ensurePrismaReady, prisma } from "@/lib/prisma";

/** Lightweight readiness probe — no internal paths exposed. */
export async function GET() {
  const dataDir =
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    "/app/data";
  const uploadDir =
    process.env.UPLOAD_DIR?.trim() || path.join(dataDir, "uploads");
  const dbFile =
    process.env.DATABASE_URL?.replace(/^file:/, "").split("?")[0] ||
    path.join(dataDir, "prod.db");

  const volumeMounted = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);
  const markerOk = existsSync(path.join(dataDir, ".kat-persist"));
  const dbOk = existsSync(dbFile);
  const uploadsOk = existsSync(uploadDir);

  let diskFreeMb: number | null = null;
  let diskTotalMb: number | null = null;
  try {
    const fsStat = statfsSync(dataDir);
    const bsize = Number(fsStat.bsize) || 0;
    diskTotalMb = Math.round((bsize * Number(fsStat.blocks)) / (1024 * 1024));
    diskFreeMb = Math.round((bsize * Number(fsStat.bavail)) / (1024 * 1024));
  } catch {
    // unsupported fs
  }

  let dbPingMs: number | null = null;
  let dbPingOk = false;
  const pingStarted = Date.now();
  try {
    await ensurePrismaReady();
    await prisma.$queryRaw`SELECT 1`;
    dbPingOk = true;
    dbPingMs = Date.now() - pingStarted;
  } catch {
    dbPingMs = Date.now() - pingStarted;
    dbPingOk = false;
  }

  const diskOk = diskFreeMb == null || diskFreeMb > 200;
  const ready = volumeMounted
    ? markerOk && dbOk && uploadsOk && dbPingOk && diskOk
    : dbOk && uploadsOk && dbPingOk && diskOk;

  return NextResponse.json({
    ok: ready,
    service: "korea-auto-trade",
    time: new Date().toISOString(),
    ready,
    volumeMounted,
    dbPingOk,
    dbPingMs,
    diskFreeMb,
    diskTotalMb,
  });
}
