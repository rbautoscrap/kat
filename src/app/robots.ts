import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/listings";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin() || "https://www.rbautotrade.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/login", "/join", "/profile", "/offers"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
