import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getUploadsDir } from "@/lib/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Serve listing photos from the persistent Volume (UPLOAD_DIR / /app/data/uploads). */
export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  if (!parts?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Only allow a single safe filename segment (uuid.jpg)
  if (parts.length !== 1) {
    return new NextResponse("Not found", { status: 404 });
  }
  const name = parts[0]!;
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.startsWith(".")
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(getUploadsDir(), name);
  const root = path.resolve(getUploadsDir());
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!existsSync(resolved)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size = 0;
  try {
    size = statSync(resolved).size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const stream = createReadStream(resolved);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
