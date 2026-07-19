import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("594959", 10);
  const legacy = await prisma.user.findUnique({
    where: { email: "admin@koreaauto.trade" },
  });

  if (legacy) {
    await prisma.user.update({
      where: { email: "admin@koreaauto.trade" },
      data: {
        email: "admin",
        passwordHash,
        role: "ADMIN",
        name: "Admin",
      },
    });
    console.log("Updated admin@koreaauto.trade -> admin / 594959");
    return;
  }

  await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      passwordHash,
      role: "ADMIN",
      name: "Admin",
    },
    create: {
      email: "admin",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log("Upserted admin / 594959");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
