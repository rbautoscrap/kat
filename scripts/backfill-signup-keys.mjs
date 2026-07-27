/**
 * After schema push: fill User.phoneKey from phone, resolving duplicates so
 * the unique index stays valid. Keeps the oldest APPROVED (else oldest) row.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function phoneKeyFromPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function statusRank(status) {
  if (status === "APPROVED") return 0;
  if (status === "PENDING") return 1;
  return 2;
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        phoneKey: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    /** @type {Map<string, typeof users>} */
    const groups = new Map();
    for (const u of users) {
      const key = u.phoneKey || phoneKeyFromPhone(u.phone);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(u);
      groups.set(key, list);
    }

    let kept = 0;
    let cleared = 0;

    for (const [key, list] of groups) {
      list.sort((a, b) => {
        const sr = statusRank(a.status) - statusRank(b.status);
        if (sr !== 0) return sr;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      const winner = list[0];
      for (let i = 0; i < list.length; i++) {
        const row = list[i];
        if (i === 0) {
          if (row.phoneKey !== key) {
            await prisma.user.update({
              where: { id: row.id },
              data: { phoneKey: key },
            });
            kept += 1;
          }
          continue;
        }
        if (row.phoneKey !== null) {
          await prisma.user.update({
            where: { id: row.id },
            data: {
              phoneKey: null,
              adminNote: [
                row.adminNote?.trim() || "",
                `[auto] Duplicate contact ${key} cleared for signup uniqueness (kept ${winner.id}).`,
              ]
                .filter(Boolean)
                .join("\n")
                .slice(0, 2000),
            },
          });
          cleared += 1;
        }
      }
    }

    console.log(
      `[backfill-signup] phoneKey kept/updated=${kept} duplicates cleared=${cleared}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-signup] failed:", err);
  // Do not fail boot — signup still has app-level checks.
  process.exit(0);
});
