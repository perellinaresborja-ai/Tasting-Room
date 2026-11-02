import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/api/*",
        "/auth/",
        "/auth/*",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
