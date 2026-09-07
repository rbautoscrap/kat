import "server-only";

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getUploadsDir } from "@/lib/storage-paths";

/** Noticeably smaller than stored listing photos (1920px / q78). */
const DOWNLOAD_MAX_EDGE = 800;
const DOWNLOAD_JPEG_QUALITY = 50;

function localUploadPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const name = path.basename(url);
  if (
    !name ||
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.startsWith(".")
  ) {
    return null;
  }
  const root = path.resolve(getUploadsDir());
  const full = path.resolve(path.join(root, name));
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return existsSync(full) ? full : null;
}

export async function loadListingImageBuffer(
  url: string,
): Promise<Buffer | null> {
  const local = localUploadPath(url);
  if (local) return readFile(local);
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 0 ? buf : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function compressImageForPublicDownload(
  input: Buffer,
): Promise<Buffer> {
  return sharp(input, {
    failOn: "none",
    animated: false,
    sequentialRead: true,
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .resize({
      width: DOWNLOAD_MAX_EDGE,
      height: DOWNLOAD_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: DOWNLOAD_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export function publicDownloadFilename(
  serialNumber: string,
  sortOrder: number,
  imageId: string,
) {
  const safe =
    serialNumber.replace(/[^\w.-]+/g, "_").slice(0, 40) || imageId;
  return `${safe}-${String(sortOrder + 1).padStart(2, "0")}.jpg`;
}
