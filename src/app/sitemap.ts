import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { es: "", en: "", priority: 1.0, changeFrequency: "daily" as const },
    { es: "/catas", en: "/tastings", priority: 0.9, changeFrequency: "daily" as const },
    { es: "/catas-realizadas", en: "/past-tastings", priority: 0.7, changeFrequency: "weekly" as const },
    { es: "/contacto", en: "/contact", priority: 0.8, changeFrequency: "monthly" as const },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add static routes
  for (const route of staticRoutes) {
    sitemapEntries.push({
      url: `${SITE_URL}/es${route.es}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          es: `${SITE_URL}/es${route.es}`,
          en: `${SITE_URL}/en${route.en}`,
        },
      },
    });
    sitemapEntries.push({
      url: `${SITE_URL}/en${route.en}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          es: `${SITE_URL}/es${route.es}`,
          en: `${SITE_URL}/en${route.en}`,
        },
      },
    });
  }

  // Fetch dynamic tastings
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: tastings } = await supabase
        .from("tastings")
        .select("slug, updated_at, created_at, status")
        .in("status", ["PUBLISHED", "SOLD_OUT"]);

      if (tastings) {
        for (const tasting of tastings) {
          const lastMod = tasting.updated_at ? new Date(tasting.updated_at) : new Date(tasting.created_at || Date.now());
          
          sitemapEntries.push({
            url: `${SITE_URL}/es/catas/${tasting.slug}`,
            lastModified: lastMod,
            changeFrequency: "daily" as const,
            priority: 0.9,
            alternates: {
              languages: {
                es: `${SITE_URL}/es/catas/${tasting.slug}`,
                en: `${SITE_URL}/en/tastings/${tasting.slug}`,
              },
            },
          });

          sitemapEntries.push({
            url: `${SITE_URL}/en/tastings/${tasting.slug}`,
            lastModified: lastMod,
            changeFrequency: "daily" as const,
            priority: 0.9,
            alternates: {
              languages: {
                es: `${SITE_URL}/es/catas/${tasting.slug}`,
                en: `${SITE_URL}/en/tastings/${tasting.slug}`,
              },
            },
          });
        }
      }
    } catch (e) {
      console.error("Failed to generate tastings sitemap:", e);
    }
  }

  return sitemapEntries;
}
