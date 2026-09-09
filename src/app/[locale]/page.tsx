import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { formatDate, formatDayOfWeek, formatTime } from "@/lib/utils/formatDate";
import { createClient } from "@/lib/supabase/server";
import SubscribeForm from "@/components/ui/SubscribeForm";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Index");

  // Fetch real next tasting from database
  const supabase = await createClient();
  const { data: upcomingTastings } = await supabase
    .from('tastings')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('date', { ascending: true })
    .limit(1);

  const nextTasting = upcomingTastings && upcomingTastings.length > 0 ? upcomingTastings[0] : null;

  return (
    <main className="flex flex-col">
      {/* HERO */}
      <section className="relative h-[85vh] min-h-[700px] flex items-center justify-center text-center px-4 overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2070&auto=format&fit=crop" 
          alt="The Church Atmosphere" 
          fill 
          className="object-cover opacity-30" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[var(--background)] z-0"></div>
        <div className="relative z-10 max-w-4xl flex flex-col items-center pt-8 md:pt-0">
          <Image 
            src="/logo.png" 
            alt="The Church Tasting Room" 
            width={370} 
            height={400} 
            priority
            className="object-contain mb-8 w-[240px] md:w-[370px] h-auto"
          />
          <h2 className="text-2xl md:text-3xl text-[var(--color-gold)] font-serif mb-6 uppercase tracking-wider leading-relaxed">
            {t("what_is_1")}<br />{t("what_is_2")}
          </h2>
          <p className="text-lg md:text-xl text-[var(--color-warm-white)]/80 mb-12 font-light max-w-2xl leading-relaxed whitespace-pre-line">
            {t("what_is_desc")}
          </p>
        </div>
      </section>

      {/* NEXT TASTING HIGHLIGHT */}
      {nextTasting && (
        <section className="py-20 px-4 md:px-8 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-sm text-[var(--color-gold)] uppercase tracking-[0.3em] mb-12 text-center">{t("next_tasting")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[var(--color-charcoal)] group">
              <div className="relative h-64 md:h-auto overflow-hidden">
                <Image 
                  src={nextTasting.cover_image || "/logo-header-full.png"} 
                  alt={locale === "es" ? nextTasting.title_es : nextTasting.title_en} 
                  fill 
                  className="object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
              <div className="p-10 md:p-16 flex flex-col justify-center bg-[#141414]">
                <div className="text-sm text-gray-500 uppercase tracking-widest mb-4">
                  {nextTasting.category}
                </div>
                <h4 className="text-3xl font-serif text-[var(--color-gold)] mb-6">
                  {locale === "es" ? nextTasting.title_es : nextTasting.title_en}
                </h4>
                <div className="space-y-4 mb-8 text-[var(--color-warm-white)]">
                  <div className="flex items-start gap-3">
                    <span className="text-[var(--color-gold)] mt-1">📅</span>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-400 capitalize">{formatDayOfWeek(nextTasting.date, locale)}</span>
                      <span>{formatDate(nextTasting.date, locale)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-gold)]">⏱</span> {formatTime(nextTasting.start_time)}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-gold)]">€</span> {nextTasting.price.toFixed(2)}
                  </div>
                </div>
                <Link href={{ pathname: "/tastings/[slug]", params: { slug: nextTasting.slug } }} className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 uppercase tracking-widest text-sm text-center hover:bg-[var(--color-gold)] hover:text-black transition-colors w-fit">
                  {t("book_now")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUBSCRIBE */}
      <section className="py-24 px-4 md:px-8 bg-[#141414] border-t border-[var(--color-charcoal)]">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-3xl font-serif text-[var(--color-gold)] mb-6">{t("subscribe_title")}</h3>
          <p className="text-[var(--color-warm-white)]/70 mb-10 leading-relaxed">
            {t("subscribe_desc_1")}<br />{t("subscribe_desc_2")}
          </p>
            <SubscribeForm 
              locale={locale}
              t={{
                email: t("email"),
                phone: t("phone_optional", { default: t("phone") + " (WhatsApp)" }),
                consent_email: t("consent_email"),
                consent_wa: t("consent_wa"),
                subscribe_btn: t("subscribe_btn"),
                subscribe_success: t("subscribe_success"),
                subscribe_error: t("subscribe_error"),
                subscribe_invalid: t("subscribe_invalid")
              }} 
            />
        </div>
      </section>

      </main>
  );
}
