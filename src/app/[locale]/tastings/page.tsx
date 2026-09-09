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
        {tastingsList.map((tasting) => (
          <Link href={{ pathname: "/tastings/[slug]", params: { slug: tasting.slug } }} key={tasting.id} className="group block border border-[var(--color-charcoal)] bg-[#0a0a0a] hover:border-[var(--color-gold)] transition-colors">
            <div className="relative h-64 overflow-hidden">
              <Image 
                src={tasting.cover_image || "/logo-header-full.png"} 
                alt={locale === "es" ? tasting.title_es : tasting.title_en} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            </div>
            <div className="p-8">
              <div className="text-xs text-[var(--color-gold)] uppercase tracking-widest mb-3">
                {tasting.category}
              </div>
              <h2 className="text-2xl font-serif text-[var(--color-warm-white)] mb-4 group-hover:text-[var(--color-gold)] transition-colors">
                {locale === "es" ? tasting.title_es : tasting.title_en}
              </h2>
              <div className="flex items-center gap-3 text-sm text-[var(--color-warm-white)] mb-4">
                <span className="text-[var(--color-gold)] mt-1">📅</span> 
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 capitalize">{formatDayOfWeek(tasting.date, locale)}</span>
                  <span>{formatDate(tasting.date, locale)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--color-warm-white)]">
                <span className="text-[var(--color-gold)]">⏱</span> 
                {formatTime(tasting.start_time)}
              </div>
            </div>
            <div className="p-8 border-t border-[var(--color-charcoal)] flex justify-between items-center bg-[#111]">
              <span className="text-lg text-[var(--color-gold)]">€{tasting.price.toFixed(2)}</span>
              <span className="text-xs uppercase tracking-widest text-gray-500 group-hover:text-[var(--color-gold)] transition-colors">{t("book")} →</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
