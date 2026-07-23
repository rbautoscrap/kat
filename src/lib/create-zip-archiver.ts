import "server-only";

import { createRequire } from "node:module";
import path from "node:path";

export type ArchiverInstance = {
  pipe: (dest: NodeJS.WritableStream) => unknown;
  file: (filepath: string, data: { name: string }) => unknown;
  directory?: (dirpath: string, destpath: string | false) => unknown;
  append: (source: string | Buffer, data: { name: string }) => unknown;
  finalize: () => Promise<void> | void;
  on: (event: string, cb: (err: Error & { code?: string }) => void) => unknown;
};

type ZipOptions = { zlib?: { level?: number } };

type ArchiverModule = {
  default?: unknown;
  ZipArchive?: new (options?: ZipOptions) => ArchiverInstance;
  Archiver?: unknown;
};

function asFactory(
  value: unknown,
): ((format: string, options?: ZipOptions) => ArchiverInstance) | null {
  return typeof value === "function"
    ? (value as (format: string, options?: ZipOptions) => ArchiverInstance)
    : null;
}

function fromModule(mod: ArchiverModule): ArchiverInstance | null {
  // archiver@8 — named ZipArchive class
  if (typeof mod.ZipArchive === "function") {
    return new mod.ZipArchive({ zlib: { level: 1 } });
  }

  // archiver@7 and earlier — callable factory (CJS / default export)
  const factory =
    asFactory(mod.default) ||
    asFactory(mod) ||
    asFactory((mod as { default?: { default?: unknown } }).default?.default);
  if (factory) return factory("zip", { zlib: { level: 1 } });

  return null;
}

/**
 * Resolve archiver across Next.js bundling + archiver v7/v8 APIs.
 */
export async function createZipArchiver(
  options: ZipOptions = { zlib: { level: 1 } },
): Promise<ArchiverInstance> {
  const errors: string[] = [];

  try {
    // @ts-expect-error archiver has no bundled TypeScript declarations
    const mod = (await import("archiver")) as ArchiverModule;
    if (typeof mod.ZipArchive === "function") {
      return new mod.ZipArchive(options);
    }
    const viaImport = fromModule(mod);
    if (viaImport) {
      // Recreate with caller options when factory path was used
      const factory =
        asFactory(mod.default) ||
        asFactory(mod) ||
        asFactory((mod as { default?: { default?: unknown } }).default?.default);
      if (factory) return factory("zip", options);
      return viaImport;
    }
    errors.push("import('archiver') returned an unsupported shape");
  } catch (error) {
    errors.push(
      `import: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    const mod = require("archiver") as ArchiverModule;
    if (typeof mod.ZipArchive === "function") {
      return new mod.ZipArchive(options);
    }
    const factory =
      asFactory(mod) ||
      asFactory(mod.default) ||
      asFactory((mod as { default?: { default?: unknown } }).default?.default);
    if (factory) return factory("zip", options);
    errors.push("require('archiver') returned an unsupported shape");
  } catch (error) {
    errors.push(
      `require: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  throw new Error(
    `archiver 모듈을 불러오지 못했습니다. (${errors.join(" | ")})`,
  );
}
