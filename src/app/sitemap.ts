import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es";

export default function sitemap(): MetadataRoute.Sitemap {
  // We can fetch public tastings here and add them to the sitemap dynamically
  
  const routes = [
    "",
    "/tastings",
    "/past-tastings",
    "/contact"
  ];
  
  const sitemapEntries = [];
  
  for (const locale of routing.locales) {
    for (const route of routes) {
      // Very basic static generation
      const path = locale === routing.defaultLocale ? route : `/${locale}${route}`;
      sitemapEntries.push({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: route === "" ? 1 : 0.8,
      });
    }
  }

  return sitemapEntries;
}
