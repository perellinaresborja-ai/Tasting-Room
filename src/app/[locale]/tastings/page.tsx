import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/routing";
import Image from "next/image";
import { formatDate, formatDayOfWeek, formatTime } from "@/lib/utils/formatDate";
import { createClient } from "@/lib/supabase/server";

export default async function TastingsPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tastings");

  const supabase = await createClient();
  const { data: upcoming } = await supabase
    .from('tastings')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('date', { ascending: true });

  const tastingsList = upcoming || [];

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-gold)] mb-6">{t("title")}</h1>
        <p className="text-xl text-gray-400 font-light">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tastingsList.map((tasting, idx) => (
          <Link href={{ pathname: "/tastings/[slug]", params: { slug: tasting.slug } }} key={tasting.id} className="group block border border-[var(--color-charcoal)] bg-[#0a0a0a] hover:border-[var(--color-gold)] transition-all duration-500 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="relative h-64 overflow-hidden">
              <Image 
                src={tasting.cover_image || "/logo-header-full.png"} 
                alt={locale === "es" ? tasting.title_es : tasting.title_en} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-serif text-[var(--color-warm-white)] mb-4 group-hover:text-[var(--color-gold)] transition-colors whitespace-pre-line">
                {locale === "es" ? tasting.title_es : tasting.title_en}
              </h2>
              <div className="flex items-center gap-3 text-sm text-[var(--color-warm-white)] mb-4">
                <span className="text-[var(--color-gold)] mt-1">📅</span> 
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 capitalize">{formatDayOfWeek(tasting.date, locale)}</span>
                  <span>{formatDate(tasting.date, locale)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-warm-white)] mb-3">
                <span className="text-[var(--color-gold)]">⏱</span> 
                {formatTime(tasting.start_time)}
              </div>
              {tasting.capacity && (
                <div className="flex items-center gap-3 text-xs text-gray-400 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-gold)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-gold)]"></span>
                  </span>
                  <span>{locale === 'es' ? `Aforo íntimo: ${tasting.capacity} plazas` : `Capacity: ${tasting.capacity} seats`}</span>
                </div>
              )}
            </div>
            <div className="p-8 border-t border-[var(--color-charcoal)] flex justify-between items-center bg-[#111] group-hover:bg-[#151515] transition-colors">
              <span className="text-lg text-[var(--color-gold)] font-medium">€{tasting.price.toFixed(2)}</span>
              <span className="text-xs uppercase tracking-widest text-gray-400 group-hover:text-[var(--color-gold)] transition-colors font-bold flex items-center gap-1 group-hover:translate-x-1 duration-300">
                {t("book")} <span>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
