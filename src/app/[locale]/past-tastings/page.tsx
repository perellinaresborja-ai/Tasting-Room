import { getTranslations, setRequestLocale } from "next-intl/server";
import { mockPastTastings } from "@/lib/mock-data";
import Image from "next/image";
import { formatDate } from "@/lib/utils/formatDate";
import { createClient } from "@/lib/supabase/server";
import { classifyTasting } from "@/lib/utils/tastingClassification";
import { getSiteUrl } from "@/lib/constants/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PastTastings" });
  const siteUrl = getSiteUrl();
  const path = locale === "es" ? "/es/catas-realizadas" : "/en/past-tastings";
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `${siteUrl}${path}`,
      languages: {
        es: `${siteUrl}/es/catas-realizadas`,
        en: `${siteUrl}/en/past-tastings`,
      },
    },
    openGraph: {
      title: `${t("title")} | The Church Tasting Room`,
      description: t("subtitle"),
      url: `${siteUrl}${path}`,
      siteName: "The Church Tasting Room",
    },
  };
}

export default async function PastTastingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PastTastings");

  // Fetch all candidate tastings from database
  const supabase = await createClient();
  const { data: rawDbTastings } = await supabase
    .from("tastings")
    .select("*")
    .order("date", { ascending: false });

  // Filter exclusively finished tastings using Europe/Madrid classification
  const finishedDbTastings = (rawDbTastings || [])
    .filter((tasting) => classifyTasting(tasting) === "PAST")
    .map((tasting) => ({
      id: tasting.id,
      slug: tasting.slug,
      title_es: tasting.title_es,
      title_en: tasting.title_en,
      date: tasting.date,
      category_es: tasting.category_es || tasting.category || "Cata",
      category_en: tasting.category_en || tasting.category || "Tasting",
      image_url: tasting.cover_image || "/logo-header-full.png",
    }));

  interface PastItem {
    id: string;
    slug?: string;
    title_es: string;
    title_en: string;
    date: string;
    category_es: string;
    category_en: string;
    image_url: string;
  }

  const allCandidates: PastItem[] = [...finishedDbTastings, ...mockPastTastings];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const allPastTastings: PastItem[] = [];

  for (const item of allCandidates) {
    if (seenIds.has(item.id) || (item.slug && seenSlugs.has(item.slug))) {
      continue;
    }
    seenIds.add(item.id);
    if (item.slug) seenSlugs.add(item.slug);
    allPastTastings.push(item);
  }

  // Sort from most recent to oldest
  allPastTastings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-gold)] mb-6">{t("title")}</h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allPastTastings.map((past) => (
          <div key={past.id} className="relative h-80 overflow-hidden border border-[var(--color-charcoal)] group">
            <Image 
              src={past.image_url} 
              alt={locale === "es" ? past.title_es : past.title_en} 
              fill 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
              className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 flex flex-col justify-end">
              <span className="text-sm text-[var(--color-gold)] uppercase tracking-[0.2em] mb-2">
                {locale === "es" ? past.category_es : past.category_en}
              </span>
              <h2 className="text-2xl font-serif text-white mb-2 leading-snug whitespace-pre-line">
                {locale === "es" ? past.title_es : past.title_en}
              </h2>
              <p className="text-gray-400 text-sm tracking-widest">{formatDate(past.date, locale)}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
