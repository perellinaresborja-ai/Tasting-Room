import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import SubscribeForm from "@/components/ui/SubscribeForm";
import UpcomingTastingsCarousel from "@/components/home/UpcomingTastingsCarousel";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Index");

  // Fetch real next tastings from database
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: upcomingTastings } = await supabase
    .from('tastings')
    .select('*')
    .in('status', ['PUBLISHED', 'SOLD_OUT'])
    .gte('date', today)
    .order('date', { ascending: true });

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

      {/* NEXT TASTING HIGHLIGHT / CAROUSEL */}
      {upcomingTastings && upcomingTastings.length > 0 && (
        <UpcomingTastingsCarousel 
          tastings={upcomingTastings} 
          locale={locale} 
          labelNextTasting={t("next_tasting")} 
        />
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
                phone: t("phone_optional"),
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
