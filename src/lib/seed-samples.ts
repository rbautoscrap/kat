import "server-only";
import type { ListingCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PER_CATEGORY = 25;
const IMAGES_PER_LISTING = 5;

const IMAGES = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  "https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c667fa?w=800&q=80",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80",
  "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80",
  "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80",
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
  { category: "LIVE_AUCTION", prefix: "LA" },
  { category: "STAND_BY", prefix: "SB" },
];

const SALE_STATUSES = ["AVAILABLE", "AVAILABLE", "AVAILABLE", "RESERVED", "SOLD"] as const;

function formatOdometer(km: number) {
  return km.toLocaleString("en-US");
}

/** Append sample listings (does not wipe existing data). */
export async function seedSampleListings(authorId: string) {
  const batch = Date.now().toString(36).slice(-6).toUpperCase();
  let created = 0;
  let globalIndex = 0;

  for (const { category, prefix } of CATEGORIES) {
    for (let i = 0; i < PER_CATEGORY; i++) {
      const car = CARS[i % CARS.length]!;
      const year = car.year - (i % 3);
      const make = car.make;
      const model = car.model;
      const title = `${year} ${make} ${model}`;
      const transmission = TRANSMISSIONS[i % TRANSMISSIONS.length]!;
      const fuelType = FUELS[i % FUELS.length]!;
      const odometer = formatOdometer(
        18_000 + i * 3_700 + (globalIndex % 5) * 1_100,
      );
      const imageOffset = globalIndex % IMAGES.length;
      const saleStatus = SALE_STATUSES[i % SALE_STATUSES.length]!;

      await prisma.listing.create({
        data: {
          serialNumber: `${prefix}${batch}${String(i + 1).padStart(2, "0")}`,
          title,
          category,
          saleStatus,
          year,
          make,
          model,
          vin: `KN${prefix}${batch}${String(i).padStart(4, "0")}`.slice(0, 17),
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
          damagesEn:
            i % 5 === 0
              ? "Minor exterior wear"
              : i % 7 === 0
                ? "Front bumper touch-up"
                : undefined,
          whatsappNumber:
            process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT ?? "821058172207",
          authorId,
          storageLocation: i % 2 === 0 ? "진천사업소" : "충주사업소",
          inboundDate: `2026${String((i % 9) + 1).padStart(2, "0")}${String((i % 20) + 10).padStart(2, "0")}`,
          auctionPrice: String(1_200_000 + i * 85_000),
          incidentalCost: String(120_000 + (i % 5) * 15_000),
          costPrice: String(
            1_200_000 + i * 85_000 + 120_000 + (i % 5) * 15_000,
          ),
          accumulatedDays: String((i % 45) + 1),
          vehicleNumber: `${10 + (i % 80)}${["가", "나", "다", "라"][i % 4]}${1000 + i}`,
          youtubeUrl:
            i % 6 === 0
              ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              : undefined,
          images: {
            create: Array.from({ length: IMAGES_PER_LISTING }, (_, offset) => ({
              url: IMAGES[(imageOffset + offset) % IMAGES.length]!,
              sortOrder: offset,
            })),
          },
        },
      });

      created += 1;
      globalIndex += 1;
    }
  }

  const counts = await prisma.listing.groupBy({
    by: ["category"],
    _count: true,
  });

  return {
    created,
    perCategory: PER_CATEGORY,
    imagesPerListing: IMAGES_PER_LISTING,
    counts: Object.fromEntries(
      counts.map((row) => [row.category, row._count]),
    ),
  };
}
