import { Metadata } from "next";
import { getSiteUrl } from "@/lib/constants/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const isEn = locale === "en";
  const title = isEn
    ? "Experiencias Gastronómicas y Catas en El Albir"
    : "Experiencias Gastronómicas y Catas en El Albir";
  const description = isEn
    ? "Exclusive wine tastings, pairing dinners, and culinary experiences in El Albir (L'Alfàs del Pi), Costa Blanca. Book your seat at The Church Tasting Room."
    : "Catas exclusivas de vino, cenas maridaje y experiencias enogastronómicas en El Albir (L'Alfàs del Pi), Costa Blanca. Reserva tu plaza en The Church Tasting Room.";

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        es: `${siteUrl}/es`,
        en: `${siteUrl}/en`,
      },
    },
    openGraph: {
      title: `${title} | The Church Tasting Room`,
      description,
      url: `${siteUrl}/${locale}`,
      siteName: "The Church Tasting Room",
      locale: isEn ? "en_US" : "es_ES",
      type: "website",
    },
  };
}

import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Compass, CalendarCheck, QrCode, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SubscribeForm from "@/components/ui/SubscribeForm";
import UpcomingTastingsCarousel from "@/components/home/UpcomingTastingsCarousel";
import { classifyTasting } from "@/lib/utils/tastingClassification";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Index");
  const tPrivate = await getTranslations("PrivateEvents");
  const tHow = await getTranslations("HowItWorks");

  // Fetch real next tastings from database
  const supabase = await createClient();
  const { data: rawTastings } = await supabase
    .from('tastings')
    .select('*')
    .in('status', ['PUBLISHED', 'SOLD_OUT'])
    .order('date', { ascending: true });

  const upcomingTastings = (rawTastings || []).filter(
    (tasting) => classifyTasting(tasting) === 'UPCOMING'
  );

  const howItWorksSteps = [
    {
      number: tHow("step1_number"),
      title: tHow("step1_title"),
      desc: tHow("step1_desc"),
      icon: Compass,
    },
    {
      number: tHow("step2_number"),
      title: tHow("step2_title"),
      desc: tHow("step2_desc"),
      icon: CalendarCheck,
    },
    {
      number: tHow("step3_number"),
      title: tHow("step3_title"),
      desc: tHow("step3_desc"),
      icon: QrCode,
    },
    {
      number: tHow("step4_number"),
      title: tHow("step4_title"),
      desc: tHow("step4_desc"),
      icon: Sparkles,
    },
  ];

  return (
    <main className="flex flex-col overflow-x-hidden">
      {/* HERO */}
      <section className="relative w-full min-h-[calc(100svh-58px)] md:min-h-[660px] lg:h-[86vh] flex items-center justify-center text-center px-4 py-10 sm:py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image 
            src="/sala.jpg" 
            alt="The Church Tasting Room" 
            fill 
            sizes="100vw" 
            className="object-cover opacity-25 animate-ken-burns will-change-transform" 
            priority 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[var(--background)] z-0"></div>
        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center mx-auto pt-2 sm:pt-4 md:pt-0">
          <Image 
            src="/logo.png" 
            alt="The Church Tasting Room" 
            width={370} 
            height={400} 
            priority
            sizes="(max-width: 640px) 196px, (max-width: 768px) 240px, (max-width: 1024px) 320px, 360px"
            className="block object-contain w-[196px] sm:w-[240px] md:w-[320px] lg:w-[360px] max-w-[78vw] h-auto mb-5 sm:mb-6 md:mb-8 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] mx-auto"
          />
          <h1 className="w-full max-w-2xl mx-auto text-xl sm:text-2xl md:text-3xl text-[var(--color-gold)] font-serif mb-3 sm:mb-4 md:mb-6 uppercase tracking-wider leading-relaxed [text-wrap:balance] text-center">
            {t("what_is_1")} {t("what_is_2")}
          </h1>
          <p className="w-full max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[var(--color-warm-white)]/80 mb-6 md:mb-8 font-light leading-relaxed [text-wrap:balance] text-center">
            {t("what_is_desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full max-w-xs sm:max-w-none mx-auto mb-2">
            <Link 
              href={{ pathname: "/tastings" }} 
              className="btn-shimmer inline-flex items-center justify-center bg-[var(--color-gold)] text-black px-7 sm:px-8 py-3.5 uppercase tracking-widest text-xs font-bold hover:bg-white transition-all shadow-[0_4px_20px_rgba(197,160,89,0.25)] hover:shadow-[0_6px_28px_rgba(197,160,89,0.45)] hover:-translate-y-0.5 active:translate-y-0 duration-300 w-full sm:w-auto text-center whitespace-nowrap"
            >
              {locale === "es" ? "Descubrir Catas" : "Discover Tastings"}
            </Link>
            {upcomingTastings && upcomingTastings.length > 0 && (
              <Link 
                href={{ pathname: "/checkout", query: { tasting: upcomingTastings[0].id, tickets: "2", gift: "true" } }} 
                className="btn-shimmer inline-flex items-center justify-center gap-2 border border-[var(--color-gold)] text-[var(--color-gold)] px-7 sm:px-8 py-3.5 uppercase tracking-widest text-xs font-bold hover:bg-[var(--color-gold)] hover:text-black transition-all hover:-translate-y-0.5 active:translate-y-0 duration-300 backdrop-blur-xs w-full sm:w-auto text-center whitespace-nowrap"
              >
                <span>🎁</span>
                <span>{locale === "es" ? "Regala una cata" : "Gift a Tasting"}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / ¿CÓMO FUNCIONA? */}
      <section className="py-14 md:py-20 px-4 md:px-8 bg-[#0b0b0b] border-t border-b border-[var(--color-charcoal)] relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-[var(--color-gold)] uppercase tracking-wider">
              {tHow("title")}
            </h2>
            <div className="w-12 h-px bg-[var(--color-gold)]/40 mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="flex flex-col p-3.5 sm:p-4 rounded-sm bg-[#131313] border border-[var(--color-charcoal)] hover:border-[var(--color-gold)]/40 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[var(--color-charcoal)]/60">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="font-serif text-base sm:text-lg font-bold text-[var(--color-gold)] tracking-wider shrink-0">
                        {step.number}
                      </span>
                      <span className="text-[var(--color-gold)]/60 text-xs shrink-0 select-none">
                        —
                      </span>
                      <h3 className="font-serif text-xs sm:text-[13px] md:text-sm lg:text-[13px] xl:text-sm text-[var(--color-warm-white)] font-medium leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 flex items-center justify-center text-[var(--color-gold)] shrink-0">
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-400 font-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
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

      {/* PRIVATE EVENTS / CATAS PRIVADAS */}
      <section className="py-14 md:py-20 px-4 md:px-8 bg-[#0a0a0a] border-t border-[var(--color-charcoal)]">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[11px] md:text-xs text-[var(--color-gold)] uppercase tracking-[0.25em] mb-3 block font-medium">
            {tPrivate("badge")}
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-[var(--color-gold)] uppercase tracking-wider leading-snug">
            {tPrivate("title")}
          </h2>
          <div className="w-12 h-px bg-[var(--color-gold)]/40 mx-auto mt-4" />
          <p className="text-sm md:text-base text-gray-400 font-light mt-5 mb-8 max-w-2xl mx-auto leading-relaxed">
            {tPrivate("desc")}
          </p>
          <a
            href={`https://wa.me/34626218295?text=${encodeURIComponent(
              locale === "es"
                ? "Hola, me gustaría solicitar información sobre reservar el Tasting Room para un evento o cata privada."
                : "Hello, I would like to inquire about booking the Tasting Room for a private tasting or event."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shimmer inline-flex items-center justify-center gap-2.5 border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-black px-7 sm:px-8 py-3.5 text-xs font-bold uppercase tracking-widest transition-all w-full sm:w-auto"
          >
            <span>💬</span>
            <span>{tPrivate("cta")}</span>
          </a>
        </div>
      </section>

      {/* SUBSCRIBE */}
      <section className="py-14 md:py-20 px-4 md:px-8 bg-[#141414] border-t border-[var(--color-charcoal)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif text-[var(--color-gold)] uppercase tracking-wider">
            {t("subscribe_title")}
          </h2>
          <div className="w-12 h-px bg-[var(--color-gold)]/40 mx-auto mt-4" />
          <p className="text-sm md:text-base text-[var(--color-warm-white)]/70 font-light mt-5 mb-8 leading-relaxed">
            {t("subscribe_desc_1")}<br />{t("subscribe_desc_2")}
          </p>
          <SubscribeForm 
            locale={locale}
            t={{
              email: t("email"),
              consent_email: t("consent_email"),
              subscribe_btn: t("subscribe_btn"),
              subscribe_success: t("subscribe_success"),
              subscribe_error: t("subscribe_error")
            }} 
          />
        </div>
      </section>

    </main>
  );
}
