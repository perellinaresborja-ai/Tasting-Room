import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/constants/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes = [
    { es: "", en: "", priority: 1.0, changeFrequency: "daily" as const },
    { es: "/catas", en: "/tastings", priority: 0.9, changeFrequency: "daily" as const },
    { es: "/catas-realizadas", en: "/past-tastings", priority: 0.7, changeFrequency: "weekly" as const },
    { es: "/contacto", en: "/contact", priority: 0.8, changeFrequency: "monthly" as const },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add public static routes with bilingual alternates
  for (const route of staticRoutes) {
    sitemapEntries.push({
      url: `${siteUrl}/es${route.es}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          es: `${siteUrl}/es${route.es}`,
          en: `${siteUrl}/en${route.en}`,
        },
      },
    });

    sitemapEntries.push({
      url: `${siteUrl}/en${route.en}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: {
          es: `${siteUrl}/es${route.es}`,
          en: `${siteUrl}/en${route.en}`,
        },
      },
    });
  }

  // Fetch dynamic published tastings
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data: tastings } = await supabase
        .from("tastings")
        .select("slug, updated_at, created_at, status")
        .in("status", ["PUBLISHED", "SOLD_OUT"]);

      if (tastings) {
        for (const tasting of tastings) {
          const lastMod = tasting.updated_at ? new Date(tasting.updated_at) : new Date(tasting.created_at || Date.now());

          sitemapEntries.push({
            url: `${siteUrl}/es/catas/${tasting.slug}`,
            lastModified: lastMod,
            changeFrequency: "daily" as const,
            priority: 0.9,
            alternates: {
              languages: {
                es: `${siteUrl}/es/catas/${tasting.slug}`,
                en: `${siteUrl}/en/tastings/${tasting.slug}`,
              },
            },
          });

          sitemapEntries.push({
            url: `${siteUrl}/en/tastings/${tasting.slug}`,
            lastModified: lastMod,
            changeFrequency: "daily" as const,
            priority: 0.9,
            alternates: {
              languages: {
                es: `${siteUrl}/es/catas/${tasting.slug}`,
                en: `${siteUrl}/en/tastings/${tasting.slug}`,
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
