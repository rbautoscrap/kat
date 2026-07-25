import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Create the first ADMIN only when ADMIN_PASSWORD is explicitly set. */
const LOGIN = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD?.trim() || "";
const NAME = process.env.ADMIN_NAME || "Admin";
const isProd = process.env.NODE_ENV === "production";

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) {
    console.log("[ensure-admin] ADMIN already exists — skip");
    return;
  }

  if (!PASSWORD) {
    const msg =
      "[ensure-admin] No ADMIN user and ADMIN_PASSWORD is unset — refusing to create a default password.";
    if (isProd) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(`${msg} (dev: set ADMIN_PASSWORD to bootstrap)`);
    return;
  }

  if (PASSWORD.length < 8) {
    console.error("[ensure-admin] ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
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
