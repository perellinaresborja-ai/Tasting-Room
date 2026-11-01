import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { Compass, CalendarCheck, QrCode, Sparkles } from "lucide-react";
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
  const tPrivate = await getTranslations("PrivateEvents");
  const tHow = await getTranslations("HowItWorks");

  // Fetch real next tastings from database
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data: upcomingTastings } = await supabase
    .from('tastings')
    .select('*')
    .in('status', ['PUBLISHED', 'SOLD_OUT'])
    .gte('date', today)
    .order('date', { ascending: true });

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
    <main className="flex flex-col">
      {/* HERO */}
      <section className="relative h-[85vh] min-h-[700px] flex items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image 
            src="/sala.jpg" 
            alt="The Church Tasting Room" 
            fill 
            className="object-cover opacity-25 animate-ken-burns will-change-transform" 
            priority 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141414]/50 to-[var(--background)] z-0"></div>
        <div className="relative z-10 max-w-4xl flex flex-col items-center pt-8 md:pt-0">
          <Image 
            src="/logo.png" 
            alt="The Church Tasting Room" 
            width={370} 
            height={400} 
            priority
            className="object-contain mb-8 w-[240px] md:w-[370px] h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
          />
          <h2 className="text-2xl md:text-3xl text-[var(--color-gold)] font-serif mb-6 uppercase tracking-wider leading-relaxed">
            {t("what_is_1")}<br />{t("what_is_2")}
          </h2>
          <p className="text-lg md:text-xl text-[var(--color-warm-white)]/80 mb-8 font-light max-w-2xl leading-relaxed whitespace-pre-line">
            {t("what_is_desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link 
              href={{ pathname: "/tastings" }} 
              className="btn-shimmer bg-[var(--color-gold)] text-black px-8 py-3.5 uppercase tracking-widest text-xs font-bold hover:bg-white transition-all shadow-[0_4px_20px_rgba(197,160,89,0.25)] hover:shadow-[0_6px_28px_rgba(197,160,89,0.45)] hover:-translate-y-0.5 active:translate-y-0 duration-300"
            >
              {locale === "es" ? "Descubrir Catas" : "Discover Tastings"}
            </Link>
            {upcomingTastings && upcomingTastings.length > 0 && (
              <Link 
                href={{ pathname: "/checkout", query: { tasting: upcomingTastings[0].id, tickets: "2", gift: "true" } }} 
                className="btn-shimmer border border-[var(--color-gold)] text-[var(--color-gold)] px-6 py-3.5 uppercase tracking-widest text-xs font-bold hover:bg-[var(--color-gold)] hover:text-black transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 duration-300 backdrop-blur-xs"
              >
                <span>🎁</span>
                <span>{locale === "es" ? "Regala una cata" : "Gift a Tasting"}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / ¿CÓMO FUNCIONA? */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-[#0b0b0b] border-t border-b border-[var(--color-charcoal)] relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-serif text-[var(--color-gold)] uppercase tracking-wider">
              {tHow("title")}
            </h2>
            <div className="w-12 h-px bg-[var(--color-gold)]/40 mx-auto mt-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-6">
            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="flex flex-col p-6 rounded-sm bg-[#131313] border border-[var(--color-charcoal)] hover:border-[var(--color-gold)]/40 transition-colors duration-300"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-serif text-2xl md:text-3xl font-bold text-[var(--color-gold)] tracking-widest">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 flex items-center justify-center text-[var(--color-gold)]">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="font-serif text-lg text-[var(--color-warm-white)] font-medium mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 font-light leading-relaxed">
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
      <section className="py-20 px-4 md:px-8 bg-[#0a0a0a] border-t border-[var(--color-charcoal)]">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs text-[var(--color-gold)] uppercase tracking-[0.3em] mb-4 block">
            {tPrivate("badge")}
          </span>
          <h3 className="text-3xl md:text-4xl font-serif text-[var(--color-warm-white)] mb-6 leading-tight">
            {tPrivate("title")}
          </h3>
          <p className="text-gray-400 font-light text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
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
            className="inline-flex items-center gap-3 border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-black px-8 py-3.5 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <span>💬</span>
            <span>{tPrivate("cta")}</span>
          </a>
        </div>
      </section>

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
