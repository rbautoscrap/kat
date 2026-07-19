import { PrismaClient, ListingCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PER_CATEGORY = 25;

const IMAGES = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=640&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=640&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=640&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=640&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c667fa?w=640&q=80",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=640&q=80",
];

const CARS: Array<{ year: number; make: string; model: string }> = [
  { year: 2018, make: "Hyundai", model: "Sonata 2.0" },
  { year: 2020, make: "Kia", model: "K5 GT-Line" },
  { year: 2012, make: "Audi", model: "A6 3.0 TDI" },
  { year: 2014, make: "Volkswagen", model: "Golf GTI" },
  { year: 2013, make: "Honda", model: "Accord 2.4" },
  { year: 2022, make: "Kia", model: "Carnival" },
  { year: 2016, make: "Hyundai", model: "Tucson 2.0" },
  { year: 2019, make: "Chevrolet", model: "Malibu 1.5T" },
  { year: 2017, make: "Renault Samsung", model: "SM6 2.0" },
  { year: 2021, make: "Hyundai", model: "Avante CN7" },
  { year: 2015, make: "Hyundai", model: "Grandeur HG" },
  { year: 2019, make: "Kia", model: "Stinger 2.0T" },
  { year: 2016, make: "Chevrolet", model: "Traverse" },
  { year: 2020, make: "Hyundai", model: "Venue" },
  { year: 2017, make: "SsangYong", model: "Tivoli" },
  { year: 2019, make: "Mercedes-Benz", model: "A-Class A220" },
  { year: 2016, make: "BMW", model: "520d" },
  { year: 2017, make: "Lexus", model: "ES300h" },
  { year: 2018, make: "Porsche", model: "Macan S" },
  { year: 2015, make: "Audi", model: "Q5 2.0T" },
  { year: 2020, make: "Genesis", model: "G80 3.5T" },
  { year: 2014, make: "BMW", model: "320d" },
  { year: 2021, make: "Tesla", model: "Model 3 RWD" },
  { year: 2019, make: "Volvo", model: "XC60 T5" },
  { year: 2013, make: "Infiniti", model: "Q50 2.0t" },
  { year: 2018, make: "BMW", model: "X3 xDrive20d" },
  { year: 2020, make: "Mercedes-Benz", model: "C200 W205" },
  { year: 2016, make: "Audi", model: "A4 2.0 TFSI" },
  { year: 2019, make: "Lexus", model: "NX300h" },
  { year: 2021, make: "Genesis", model: "GV70 2.5T" },
];

const TRANSMISSIONS = [
  "Automatic",
  "Manual",
  "CVT",
  "DCT",
  "Semi-automatic",
  "Other",
] as const;

const FUELS = [
  "Gasoline",
  "Diesel",
  "LPG",
  "Electric",
  "Hydrogen",
  "Other",
] as const;

const CATEGORIES: Array<{ category: ListingCategory; prefix: string }> = [
  { category: "HOT_DEALS", prefix: "HD" },
  { category: "CAR_LISTINGS", prefix: "CL" },
  { category: "STAND_BY", prefix: "SB" },
];

function formatOdometer(km: number) {
  return km.toLocaleString("en-US");
}

async function main() {
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash("594959", 10);
  const demoPasswordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin",
      name: "Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  await prisma.user.create({
    data: {
      email: "dealer@koreaauto.trade",
      name: "Authorized Dealer",
      passwordHash: demoPasswordHash,
      role: "AUTHORIZED",
      status: "APPROVED",
    },
  });

  await prisma.user.create({
    data: {
      email: "member@koreaauto.trade",
      name: "Regular Member",
      passwordHash: demoPasswordHash,
      role: "MEMBER",
      status: "APPROVED",
    },
  });

  let globalIndex = 0;

  for (const { category, prefix } of CATEGORIES) {
    for (let i = 0; i < PER_CATEGORY; i++) {
      const car = CARS[i % CARS.length]!;
      const year = car.year - (i % 3);
      const make = car.make;
      const model = `${car.model}`;
      const title = `${year} ${make} ${model}`;
      const transmission = TRANSMISSIONS[i % TRANSMISSIONS.length]!;
      const fuelType = FUELS[i % FUELS.length]!;
      const odometer = formatOdometer(18_000 + i * 3_700 + (globalIndex % 5) * 1_100);
      const imageOffset = globalIndex % IMAGES.length;

      await prisma.listing.create({
        data: {
          serialNumber: `${prefix}${String(i + 1).padStart(3, "0")}`,
          title,
          category,
          year,
          make,
          model,
          vin: `KN${prefix}${String(100000 + i).slice(-6)}${String(globalIndex).padStart(5, "0")}`.slice(
            0,
            17,
          ),
          transmission,
          fuelType,
          odometer,
          engineMark: i % 4 === 0 ? "G4NA" : undefined,
          damages:
            i % 5 === 0
              ? "Minor exterior wear"
              : i % 7 === 0
                ? "Front bumper touch-up"
                : undefined,
          whatsappNumber:
            process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT ?? "821012345678",
          authorId: admin.id,
          storageLocation: i % 2 === 0 ? "진천사업소" : "충주사업소",
          inboundDate: `2026${String((i % 9) + 1).padStart(2, "0")}${String((i % 20) + 10).padStart(2, "0")}`,
          auctionPrice: String(1_200_000 + i * 85_000),
          incidentalCost: String(120_000 + (i % 5) * 15_000),
          costPrice: String(1_200_000 + i * 85_000 + 120_000 + (i % 5) * 15_000),
          accumulatedDays: String((i % 40) + 1),
          vehicleNumber: `${10 + (i % 80)}${["가", "나", "다", "라"][i % 4]}${1000 + i}`,
          images: {
            create: [0, 1, 2, 3].map((offset) => ({
              url: IMAGES[(imageOffset + offset) % IMAGES.length]!,
              sortOrder: offset,
            })),
          },
        },
      });

      globalIndex += 1;
    }
  }

  const counts = await prisma.listing.groupBy({
    by: ["category"],
    _count: true,
  });

  console.log("Seed complete.");
  console.log("Listing counts:", counts);
  console.log("Accounts:");
  console.log("  admin / 594959 (ADMIN)");
  console.log("  dealer@koreaauto.trade / password123 (AUTHORIZED)");
  console.log("  member@koreaauto.trade / password123 (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
