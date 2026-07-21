declare module "archiver" {
  import type { Writable } from "node:stream";

  interface Archiver extends Writable {
    file(filepath: string, data: { name: string }): this;
    directory(dirpath: string, destpath: string | false): this;
    append(
      source: string | Buffer | NodeJS.ReadableStream,
      data: { name: string },
    ): this;
    finalize(): Promise<void>;
  }

  interface ArchiverOptions {
    zlib?: { level?: number };
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;
  export default archiver;
}
