import "server-only";

import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createRequire } from "node:module";

type UnzipperFile = {
  path: string;
  type: string;
  stream: () => NodeJS.ReadableStream;
};

type UnzipperDirectory = {
  files: UnzipperFile[];
};

type UnzipperOpen = {
  file: (zipPath: string) => Promise<UnzipperDirectory>;
};

function loadUnzipperOpen(): UnzipperOpen {
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const mod = require("unzipper") as { Open?: UnzipperOpen; default?: { Open?: UnzipperOpen } };
  const open = mod.Open ?? mod.default?.Open;
  if (!open?.file) {
    throw new Error("unzipper 모듈을 불러오지 못했습니다.");
  }
  return open;
}

function assertSafeZipEntry(extractRoot: string, entryPath: string) {
  const normalized = entryPath.replace(/\\/g, "/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`안전하지 않은 ZIP 경로입니다: ${entryPath}`);
  }
  const dest = path.resolve(extractRoot, normalized);
  const root = path.resolve(extractRoot);
  if (dest !== root && !dest.startsWith(root + path.sep)) {
    throw new Error(`안전하지 않은 ZIP 경로입니다: ${entryPath}`);
  }
  return dest;
}

/** Extract a ZIP to `extractRoot` with zip-slip protection. */
export async function extractZipSafe(zipPath: string, extractRoot: string) {
  mkdirSync(extractRoot, { recursive: true });
  const open = loadUnzipperOpen();
  const directory = await open.file(zipPath);

  for (const entry of directory.files) {
    if (entry.type === "Directory") {
      mkdirSync(assertSafeZipEntry(extractRoot, entry.path), { recursive: true });
      continue;
    }
    const dest = assertSafeZipEntry(extractRoot, entry.path);
    mkdirSync(path.dirname(dest), { recursive: true });
    await pipeline(entry.stream(), createWriteStream(dest));
  }
}
