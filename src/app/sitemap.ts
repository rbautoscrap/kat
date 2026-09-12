import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/listings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin() || "https://www.rbautotrade.com";
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: origin, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${origin}/listings`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${origin}/how-to-buy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${origin}/about-us`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${origin}/listings?category=CAR_LISTINGS`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${origin}/listings?category=STAND_BY`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${origin}/listings?category=USED_PARTS`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  try {
    const listings = await prisma.listing.findMany({
      where: {
        saleStatus: { not: "SOLD" },
        category: { not: "LIVE_AUCTION" },
      },
      select: { id: true, updatedAt: true },
      take: 1500,
      orderBy: { updatedAt: "desc" },
    });
    return [
      ...staticPages,
      ...listings.map((row) => ({
        url: `${origin}/listings/${row.id}`,
        lastModified: row.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticPages;
  }
}
