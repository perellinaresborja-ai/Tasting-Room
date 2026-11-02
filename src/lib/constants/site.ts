/**
 * Canonical Site URL Configuration
 * Enforces https://www.tastingroom.es as the single authoritative canonical domain
 * for all SEO, metadata, sitemaps, robots, and schema tags.
 */

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!envUrl) {
    return "https://www.tastingroom.es";
  }

  // Preserve localhost in development
  if (envUrl.includes("localhost") || envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // Enforce canonical www prefix on production domain
  if (envUrl.includes("://tastingroom.es")) {
    return envUrl.replace("://tastingroom.es", "://www.tastingroom.es");
  }

  return envUrl;
}

export const CANONICAL_SITE_URL = "https://www.tastingroom.es";
