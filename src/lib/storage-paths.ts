import path from "node:path";

/**
 * Persistent upload directory.
 * Production (Railway Volume): UPLOAD_DIR=/app/data/uploads
 * Local/dev fallback: public/uploads
 */
export function getUploadsDir() {
  const fromEnv = process.env.UPLOAD_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "public", "uploads");
}
