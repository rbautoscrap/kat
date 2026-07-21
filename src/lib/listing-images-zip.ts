import "server-only";

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { PassThrough, Readable } from "node:stream";
import path from "node:path";
import { getUploadsDir } from "@/lib/storage-paths";

const require = createRequire(path.join(process.cwd(), "package.json"));

type ArchiverInstance = {
  pipe: (dest: NodeJS.WritableStream) => unknown;
  file: (filepath: string, data: { name: string }) => unknown;
  append: (source: string | Buffer, data: { name: string }) => unknown;
  finalize: () => Promise<void> | void;
  on: (event: string, cb: (err: Error) => void) => unknown;
};

type ArchiverFactory = (
  format: string,
  options?: { zlib?: { level?: number } },
) => ArchiverInstance;

type ZipEntry =
  | { kind: "file"; path: string; name: string }
  | { kind: "buffer"; data: Buffer; name: string };

function loadArchiver(): ArchiverFactory {
  const mod = require("archiver") as
    | ArchiverFactory
    | { default: ArchiverFactory };
  if (typeof mod === "function") return mod;
  if (mod && typeof mod.default === "function") return mod.default;
  throw new Error("archiver 모듈을 불러오지 못했습니다.");
}

function safeEntryName(url: string, index: number): string {
  const base = path.basename(url.split("?")[0] ?? "");
  const ext = path.extname(base) || ".jpg";
  const stem = path.basename(base, ext).replace(/[^\w.-]+/g, "_") || "photo";
  return `${String(index + 1).padStart(2, "0")}-${stem}${ext}`;
}

function localUploadPath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  const name = path.basename(url);
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  const full = path.join(getUploadsDir(), name);
  return existsSync(full) ? full : null;
}

async function resolveEntries(imageUrls: string[]): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]!;
    const name = safeEntryName(url, i);
    const local = localUploadPath(url);
    if (local) {
      entries.push({ kind: "file", path: local, name });
      continue;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        entries.push({
          kind: "buffer",
          data: Buffer.from(await res.arrayBuffer()),
          name,
        });
      } catch {
        // skip unreachable remotes
      }
    }
  }
  return entries;
}

/** Build a ZIP stream of listing images (local uploads + remote URLs). */
export async function createListingImagesZipStream(
  imageUrls: string[],
): Promise<{ stream: ReadableStream; count: number }> {
  if (imageUrls.length === 0) {
    throw new Error("다운로드할 이미지가 없습니다.");
  }

  const entries = await resolveEntries(imageUrls);
  if (entries.length === 0) {
    throw new Error("다운로드할 이미지 파일을 찾을 수 없습니다.");
  }

  const archiver = loadArchiver();
  const archive = archiver("zip", { zlib: { level: 1 } });
  const passthrough = new PassThrough();
  archive.on("error", (err) => passthrough.destroy(err));
  archive.pipe(passthrough);

  for (const entry of entries) {
    if (entry.kind === "file") {
      archive.file(entry.path, { name: entry.name });
    } else {
      archive.append(entry.data, { name: entry.name });
    }
  }

  void Promise.resolve(archive.finalize());

  return {
    stream: Readable.toWeb(passthrough) as ReadableStream,
    count: entries.length,
  };
}

export function zipDownloadFilename(serialNumber: string, listingId: string) {
  const safe = serialNumber.replace(/[^\w.-]+/g, "_").slice(0, 40) || listingId;
  return `${safe}-photos.zip`;
}
