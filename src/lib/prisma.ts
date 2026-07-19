import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Bust the cached PrismaClient when the generated schema gains/loses fields.
 * Without this, a long-lived `npm run dev` process keeps an old client in
 * memory after `prisma generate`, causing "Unknown argument …" on create/update.
 */
const clientRevision = `${Object.keys(Prisma.ListingScalarFieldEnum)
  .sort()
  .join(",")}|sale-status-v1`;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRevision?: string;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

if (
  !globalForPrisma.prisma ||
  globalForPrisma.prismaRevision !== clientRevision
) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaRevision = clientRevision;
}

export const prisma = globalForPrisma.prisma;
