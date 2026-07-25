/**
 * Reset ADMIN password.
 * Usage: ADMIN_PASSWORD='your-new-password' node scripts/reset-admin-password.mjs
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const LOGIN = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "";
const NAME = process.env.ADMIN_NAME || "Admin";

if (!PASSWORD || PASSWORD.length < 8) {
  console.error(
    "[reset-admin-password] Set ADMIN_PASSWORD (min 8 chars). Example:\n  ADMIN_PASSWORD='your-new-password' node scripts/reset-admin-password.mjs",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: LOGIN },
    update: {
      name: NAME,
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
    create: {
      email: LOGIN,
      name: NAME,
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });
  console.log(`[reset-admin-password] Updated ADMIN login=${LOGIN}`);
}

main()
  .catch((err) => {
    console.error("[reset-admin-password] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
