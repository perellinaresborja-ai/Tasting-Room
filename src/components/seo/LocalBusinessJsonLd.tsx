import { getSiteUrl } from "@/lib/constants/site";

export default function LocalBusinessJsonLd() {
  const SITE_URL = getSiteUrl();

  const schema = {
    "@context": "https://schema.org",
    "@type": ["EventVenue", "FoodEstablishment"],
    "name": "The Church Tasting Room",
    "alternateName": "The Tasting Room Albir",
    "description": "Espacio exclusivo de catas privadas de vinos, espumosos y experiencias gastronómicas en El Albir (L'Alfàs del Pi), Alicante.",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo-tasting-room-gold.png`,
    "image": [
      `${SITE_URL}/sala.jpg`,
      `${SITE_URL}/logo-header-full.png`
    ],
    "telephone": "+34626218295",
    "email": "info@tastingroom.es",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Camí Vell d'Altea, 26",
      "addressLocality": "L'Albir, L'Alfàs del Pi",
      "addressRegion": "Alicante",
      "postalCode": "03581",
      "addressCountry": "ES"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 38.5714,
      "longitude": -0.0718
    },
    "priceRange": "€€",
    "currenciesAccepted": "EUR",
    "paymentAccepted": "Credit Card, Stripe",
    "hasMap": "https://maps.google.com/?q=The+Church+Albir",
    "areaServed": [
      "El Albir",
      "L'Alfàs del Pi",
      "Altea",
      "Benidorm",
      "La Nucia",
      "Alicante",
      "Costa Blanca"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
