import {useTranslations, useLocale} from "next-intl";
import {Link} from "@/i18n/routing";
import Image from "next/image";

export default function Footer() {
  const t = useTranslations("Footer");
  const locale = useLocale();
  
  return (
    <footer className="border-t border-[var(--color-charcoal)] bg-black py-12 px-4 md:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-8">
          <div className="flex-shrink-0">
            <Image src="/logo-header-full.png" alt="The Church Tasting Room" width={180} height={50} className="object-contain opacity-70" />
          </div>
          
          <nav className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 text-sm uppercase tracking-wider text-gray-500">
            <a href={locale === 'es' ? '/es/condiciones' : '/en/terms'} className="hover:text-[var(--color-gold)] transition-colors">{t("terms")}</a>
            <a href={locale === 'es' ? '/es/cookies' : '/en/cookies'} className="hover:text-[var(--color-gold)] transition-colors">{t("cookies")}</a>
            <a href={locale === 'es' ? '/es/privacidad' : '/en/privacy'} className="hover:text-[var(--color-gold)] transition-colors">{t("privacy")}</a>
            <a href={locale === 'es' ? '/es/aviso-legal' : '/en/legal'} className="hover:text-[var(--color-gold)] transition-colors">{t("legal")}</a>
          </nav>
          
          <div className="flex-shrink-0 text-center md:text-right">
            <a href="https://www.thechurch.es" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-gold)] uppercase tracking-widest hover:underline">
              {t("visit_the_church")}
            </a>
          </div>
        </div>
        
        <div className="w-full text-center border-t border-[var(--color-charcoal)] pt-8">
          <p className="text-xs text-gray-500 uppercase tracking-widest">© {new Date().getFullYear()} Tasting Room</p>
        </div>
      </div>
    </footer>
  );
}
