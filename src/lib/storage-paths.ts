import path from "node:path";

/**
 * Persistent data root.
 * Production (Railway Volume): /app/data
 * Local/dev: ./data
 */
export function getDataDir() {
  return (
    process.env.DATA_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "/app/data"
      : path.join(process.cwd(), "data"))
  );
}

/**
 * Persistent upload directory.
 * Production (Railway Volume): UPLOAD_DIR=/app/data/uploads
 * Local/dev fallback: public/uploads
 */
export function getUploadsDir() {
  const fromEnv = process.env.UPLOAD_DIR?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return path.join(getDataDir(), "uploads");
  }
  return path.join(process.cwd(), "public", "uploads");
}

/** Scratch dir for multipart / sharp / libvips — keep on the volume, not tiny /tmp. */
export function getAppTempDir() {
  const fromEnv = process.env.KAT_TMP_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(getDataDir(), "tmp");
}
