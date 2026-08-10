import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Bust the cached PrismaClient when the generated schema gains/loses fields.
 * Without this, a long-lived `npm run dev` process keeps an old client in
 * memory after `prisma generate`, causing "Unknown argument …" on create/update.
 */
const clientRevision = `${Object.keys(Prisma.ListingScalarFieldEnum)
  .sort()
  .join(",")}|sale-status-v1|sqlite-busy-v1`;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRevision?: string;
  prismaPragmaReady?: Promise<void>;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * SQLite on a Railway volume can stall under concurrent writes (auth analytics,
 * view counting, admin edits). Wait instead of failing immediately, and prefer WAL.
 */
async function applySqlitePragmas(client: PrismaClient) {
  try {
    await client.$executeRawUnsafe(`PRAGMA busy_timeout = 15000`);
    await client.$executeRawUnsafe(`PRAGMA journal_mode = WAL`);
    await client.$executeRawUnsafe(`PRAGMA synchronous = NORMAL`);
    await client.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
  } catch (error) {
    console.error("[prisma] sqlite pragma setup failed", error);
  }
}

if (
  !globalForPrisma.prisma ||
  globalForPrisma.prismaRevision !== clientRevision
) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaRevision = clientRevision;
  globalForPrisma.prismaPragmaReady = applySqlitePragmas(globalForPrisma.prisma);
}

export const prisma = globalForPrisma.prisma!;

/** Awaited by health checks / boot — safe to call repeatedly. */
export async function ensurePrismaReady() {
  await globalForPrisma.prismaPragmaReady;
}

/** Close DB handles before swapping the SQLite file on disk. */
export async function disconnectPrisma() {
  await globalForPrisma.prisma?.$disconnect();
}
