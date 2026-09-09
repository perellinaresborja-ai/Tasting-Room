import {getTranslations, setRequestLocale} from "next-intl/server";
import { mockPastTastings } from "@/lib/mock-data";
import Image from "next/image";
import { formatDate } from "@/lib/utils/formatDate";

export default async function PastTastingsPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("PastTastings");

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-gold)] mb-6">{t("title")}</h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockPastTastings.map((past) => (
          <div key={past.id} className="relative h-80 overflow-hidden border border-[var(--color-charcoal)] group">
            <Image 
              src={past.image_url} 
              alt={locale === "es" ? past.title_es : past.title_en} 
              fill 
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
