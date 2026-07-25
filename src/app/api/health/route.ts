import { existsSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

/** Lightweight readiness probe — no internal paths exposed. */
export async function GET() {
  const dataDir =
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    "/app/data";
  const uploadDir =
    process.env.UPLOAD_DIR?.trim() || path.join(dataDir, "uploads");
  const dbFile =
    process.env.DATABASE_URL?.replace(/^file:/, "") ||
    path.join(dataDir, "prod.db");

  const volumeMounted = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH);
  const markerOk = existsSync(path.join(dataDir, ".kat-persist"));
  const dbOk = existsSync(dbFile);
  const uploadsOk = existsSync(uploadDir);
  const ready = volumeMounted
    ? markerOk && dbOk && uploadsOk
    : dbOk && uploadsOk;

  return NextResponse.json({
    ok: ready,
    service: "korea-auto-trade",
    time: new Date().toISOString(),
    ready,
    volumeMounted,
  });
}
