/**
 * Reset / ensure ADMIN login on the production SQLite volume.
 *
 * Usage (Railway Console / one-off):
 *   ADMIN_LOGIN=admin ADMIN_PASSWORD='YourPass1' node scripts/reset-admin-password.mjs
 *
 * Defaults: admin / KatAdmin#2026
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const LOGIN = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || "KatAdmin#2026";
const NAME = process.env.ADMIN_NAME || "Admin";

const prisma = new PrismaClient();

async function main() {
  if (PASSWORD.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: LOGIN },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
      name: NAME,
    },
    create: {
      email: LOGIN,
      name: NAME,
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  console.log(
    `[reset-admin] OK id=${user.id} login=${LOGIN} (password updated)`,
  );
}

main()
  .catch((err) => {
    console.error("[reset-admin] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
