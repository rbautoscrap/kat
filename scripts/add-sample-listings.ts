import { PrismaClient, ListingCategory } from "@prisma/client";

const prisma = new PrismaClient();

const IMAGES = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=640&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=640&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=640&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=640&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c667fa?w=640&q=80",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=640&q=80",
];

type Sample = {
  serialNumber: string;
  year: number;
  make: string;
  model: string;
  category: ListingCategory;
  highlights?: string;
  engineMark?: string;
  transmission?: string;
  engineStatus?: string;
  odometer?: string;
  damages?: string;
  fuelType?: string;
};

const extras: Sample[] = [
  // Car Listings +5
  { serialNumber: "CL011", category: "CAR_LISTINGS", year: 2015, make: "Hyundai", model: "Grandeur HG", transmission: "Automatic", fuelType: "Petrol", odometer: "119,400 km" },
  { serialNumber: "CL012", category: "CAR_LISTINGS", year: 2019, make: "Kia", model: "Stinger 2.0T", transmission: "Automatic", fuelType: "Petrol", odometer: "58,200 km", engineStatus: "Good" },
  { serialNumber: "CL013", category: "CAR_LISTINGS", year: 2016, make: "Chevrolet", model: "Traverse", transmission: "Automatic", fuelType: "Petrol", odometer: "97,800 km", damages: "Side mirror" },
  { serialNumber: "CL014", category: "CAR_LISTINGS", year: 2020, make: "Hyundai", model: "Venue", transmission: "IVT", fuelType: "Petrol", odometer: "39,100 km" },
  { serialNumber: "CL015", category: "CAR_LISTINGS", year: 2017, make: "SsangYong", model: "Tivoli", transmission: "Automatic", fuelType: "Diesel", odometer: "84,600 km" },
  // HOT DEALS +5
  { serialNumber: "HD011", category: "HOT_DEALS", year: 2018, make: "BMW", model: "X3 xDrive20d", transmission: "Automatic", fuelType: "Diesel", odometer: "71,500 km", highlights: "AWD" },
  { serialNumber: "HD012", category: "HOT_DEALS", year: 2020, make: "Mercedes-Benz", model: "C200 W205", transmission: "Automatic", fuelType: "Petrol", odometer: "42,300 km", engineStatus: "Excellent" },
  { serialNumber: "HD013", category: "HOT_DEALS", year: 2016, make: "Audi", model: "A4 2.0 TFSI", transmission: "S tronic", fuelType: "Petrol", odometer: "108,700 km", damages: "Front lip" },
  { serialNumber: "HD014", category: "HOT_DEALS", year: 2019, make: "Lexus", model: "NX300h", transmission: "CVT", fuelType: "Hybrid", odometer: "53,900 km" },
  { serialNumber: "HD015", category: "HOT_DEALS", year: 2021, make: "Genesis", model: "GV70 2.5T", transmission: "Automatic", fuelType: "Petrol", odometer: "31,200 km", engineStatus: "Good" },
  // Stand by +5
  { serialNumber: "SB011", category: "STAND_BY", year: 2014, make: "Toyota", model: "RAV4", transmission: "Automatic", fuelType: "Petrol", odometer: "145,200 km" },
  { serialNumber: "SB012", category: "STAND_BY", year: 2018, make: "Honda", model: "CR-V 1.5T", transmission: "CVT", fuelType: "Petrol", odometer: "76,400 km" },
  { serialNumber: "SB013", category: "STAND_BY", year: 2016, make: "Hyundai", model: "Ioniq Hybrid", transmission: "DCT", fuelType: "Hybrid", odometer: "92,100 km" },
  { serialNumber: "SB014", category: "STAND_BY", year: 2019, make: "Kia", model: "Niro", transmission: "DCT", fuelType: "Hybrid", odometer: "61,800 km", engineStatus: "Good" },
  { serialNumber: "SB015", category: "STAND_BY", year: 2017, make: "Volkswagen", model: "Tiguan 2.0", transmission: "DSG", fuelType: "Diesel", odometer: "101,500 km", damages: "Rear scratch" },
];

async function main() {
  const author =
    (await prisma.user.findUnique({ where: { email: "admin" } })) ??
    (await prisma.user.findFirst({ where: { role: "ADMIN" } }));

  if (!author) {
    throw new Error("Admin user not found");
  }

  let created = 0;
  for (const [index, sample] of extras.entries()) {
    const exists = await prisma.listing.findUnique({
      where: { serialNumber: sample.serialNumber },
    });
    if (exists) {
      console.log(`Skip existing ${sample.serialNumber}`);
      continue;
    }

    const title = `${sample.year} ${sample.make} ${sample.model}`;
    const imageOffset = index % IMAGES.length;

    await prisma.listing.create({
      data: {
        serialNumber: sample.serialNumber,
        title,
        category: sample.category,
        year: sample.year,
        make: sample.make,
        model: sample.model,
        highlights: sample.highlights,
        engineMark: sample.engineMark,
        transmission: sample.transmission,
        engineStatus: sample.engineStatus,
        odometer: sample.odometer,
        damages: sample.damages,
        fuelType: sample.fuelType,
        whatsappNumber:
          process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT ?? "821012345678",
        authorId: author.id,
        images: {
          create: [0, 1, 2, 3].map((offset) => ({
            url: IMAGES[(imageOffset + offset) % IMAGES.length],
            sortOrder: offset,
          })),
        },
      },
    });
    created += 1;
  }

  const counts = await prisma.listing.groupBy({
    by: ["category"],
    _count: true,
  });

  console.log(`Created ${created} listings`);
  console.log("Listing counts:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
