import {Tasting} from "@/lib/types";

export default function TastingJsonLd({ tasting, locale }: { tasting: Tasting, locale: string }) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es";
  const title = locale === "es" ? tasting.title_es : tasting.title_en;
  const description = locale === "es" ? tasting.description_es : tasting.description_en;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": title,
    "description": description,
    "image": tasting.cover_image ? [tasting.cover_image] : undefined,
    "startDate": `${tasting.date}T${tasting.start_time}`,
    "endDate": tasting.end_time ? `${tasting.date}T${tasting.end_time}` : undefined,
    "eventStatus": tasting.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": tasting.location,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Madrid",
        "addressCountry": "ES"
      }
    },
    "offers": {
      "@type": "Offer",
      "url": `${SITE_URL}/${locale === "en" ? "en/tastings" : "es/catas"}/${tasting.slug}`,
      "price": tasting.price,
      "priceCurrency": "EUR",
      "availability": tasting.status === "SOLD_OUT" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      "validFrom": tasting.created_at
    },
    "organizer": {
      "@type": "Organization",
      "name": "The Church Tasting Room",
      "url": SITE_URL
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
