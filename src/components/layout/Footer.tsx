import {useTranslations, useLocale} from "next-intl";
import {Link} from "@/i18n/routing";
import Image from "next/image";

export default function Footer() {
  const t = useTranslations("Footer");
  const locale = useLocale();
  
  return (
    <footer className="border-t border-[var(--color-charcoal)] bg-black py-16 px-4 md:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Image src="/logo-header-full.png" alt="The Church Tasting Room" width={180} height={50} className="object-contain opacity-70" />
          <p className="text-sm text-gray-500 uppercase tracking-widest">© {new Date().getFullYear()} Tasting Room</p>
        </div>
        
        <nav className="flex flex-wrap justify-center gap-6 text-sm uppercase tracking-wider text-gray-500">
          <a href={locale === 'es' ? '/es/condiciones' : '/en/terms'} className="hover:text-[var(--color-gold)] transition-colors">{t("terms")}</a>
          <a href={locale === 'es' ? '/es/privacidad' : '/en/privacy'} className="hover:text-[var(--color-gold)] transition-colors">{t("privacy")}</a>
          <a href={locale === 'es' ? '/es/cookies' : '/en/cookies'} className="hover:text-[var(--color-gold)] transition-colors">{t("cookies")}</a>
          <a href={locale === 'es' ? '/es/aviso-legal' : '/en/legal'} className="hover:text-[var(--color-gold)] transition-colors">{t("legal")}</a>
        </nav>
        
        <div className="flex flex-col items-center md:items-end gap-2">
          <a href="https://tastingroom.es" className="text-sm text-[var(--color-warm-white)] hover:text-[var(--color-gold)] transition-colors">tastingroom.es</a>
          <a href="https://www.thechurch.es" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-gold)] uppercase tracking-widest hover:underline mt-2">
            {t("visit_the_church")}
          </a>
        </div>
      </div>
    </footer>
  );
}
