import {getTranslations, setRequestLocale} from "next-intl/server";
import Image from "next/image";

export default async function ContactPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-gold)] mb-6">{t("title")}</h1>
        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="relative h-[60vh]">
          <Image 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop" 
            alt="The Church Tasting Room Location" 
            fill 
            className="object-cover" 
          />
        </div>

        <div className="flex flex-col justify-center space-y-12">
          <div>
            <h2 className="text-sm text-[var(--color-gold)] uppercase tracking-[0.3em] mb-4">{t("address_title")}</h2>
            <p className="text-3xl font-serif text-[var(--color-warm-white)]">The Church</p>
            <p className="text-3xl font-serif text-[var(--color-warm-white)] mb-4">Tasting Room</p>
            <p className="text-xl text-gray-400 font-light leading-relaxed">
              {t("address_line1")}<br />
              {t("address_line2")}
            </p>
          </div>

          <div>
            <h2 className="text-sm text-[var(--color-gold)] uppercase tracking-[0.3em] mb-4">{t("phone")}</h2>
            <a href="tel:+34626218295" className="text-2xl font-serif text-[var(--color-warm-white)] hover:text-[var(--color-gold)] transition-colors">
              +34 626 218 295
            </a>
          </div>

          <div>
            <h2 className="text-sm text-[var(--color-gold)] uppercase tracking-[0.3em] mb-4">{t("email")}</h2>
            <a href="mailto:info@tastingroom.es" className="text-2xl font-serif text-[var(--color-warm-white)] hover:text-[var(--color-gold)] transition-colors">
              info@tastingroom.es
            </a>
          </div>

          <div className="pt-8">
            <a href="https://maps.google.com/?q=The+Church+Albir" target="_blank" rel="noopener noreferrer" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-10 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold)] hover:text-black transition-colors">
              {t("get_directions")}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
