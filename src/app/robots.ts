import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/*",
        "/*/admin",
        "/*/admin/*",
        "/scanner",
        "/scanner/*",
        "/*/scanner",
        "/*/scanner/*",
        "/checkout",
        "/checkout/*",
        "/*/checkout",
        "/*/checkout/*",
        "/reserva",
        "/reserva/*",
        "/*/reserva",
        "/*/reserva/*",
        "/member",
        "/member/*",
        "/*/member",
        "/*/member/*",
        "/cliente",
        "/cliente/*",
        "/*/cliente",
        "/*/cliente/*",
        "/setup-admin",
        "/setup-admin/*",
        "/*/setup-admin",
        "/*/setup-admin/*",
        "/feedback",
        "/feedback/*",
        "/*/feedback",
        "/*/feedback/*",
        "/invitation",
        "/invitation/*",
        "/*/invitation",
        "/*/invitation/*",
        "/api/*",
        "/auth/*",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
