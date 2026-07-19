import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Default production admin — override with ADMIN_LOGIN / ADMIN_PASSWORD env vars */
const LOGIN = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || "KatAdmin#2026";
const NAME = process.env.ADMIN_NAME || "Admin";

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.log("[ensure-admin] ADMIN already exists — skip");
    return;
  }

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

  console.log(`[ensure-admin] Created ADMIN login=${LOGIN}`);
}

main()
  .catch((err) => {
    console.error("[ensure-admin] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
