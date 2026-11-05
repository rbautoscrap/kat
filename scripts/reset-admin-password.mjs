import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** One-shot. Marker on the volume stops this from running again. */
const LOGIN = (process.env.ADMIN_LOGIN || "admin").trim().toLowerCase();
const PASSWORD = "a594959!";
const dataRoot =
  process.env.DATA_DIR?.trim() ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "/app/data"
    : path.join(process.cwd(), "data"));
const marker = path.join(dataRoot, ".admin-pw-20261105");

if (existsSync(marker)) {
  console.log("[reset-admin-password] already applied");
  process.exit(0);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: LOGIN } });
  if (!user) {
    console.error(`[reset-admin-password] no user for login ${LOGIN}`);
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  mkdirSync(dataRoot, { recursive: true });
  writeFileSync(marker, new Date().toISOString());
  console.log(`[reset-admin-password] updated login=${LOGIN}`);
}

main()
  .catch((err) => {
    console.error("[reset-admin-password] failed", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
