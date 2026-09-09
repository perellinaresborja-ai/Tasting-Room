import {useTranslations} from "next-intl";
import {Link} from "@/i18n/routing";
import Image from "next/image";

export default function Navbar({locale}: {locale: string}) {
  const t = useTranslations("Nav");
  const tNav = useTranslations("Navigation");
  
  return (
    <header className="relative z-50 border-b border-[var(--color-charcoal)] py-3 px-4 md:px-8 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center">
            <Image src="/logo-header-full.png" alt="The Church Tasting Room" width={180} height={45} className="object-contain" />
          </Link>
        </div>
        
        <nav className="flex justify-center items-center gap-6 text-sm uppercase tracking-wider text-[var(--color-warm-white)]">
          <Link href="/tastings" className="hover:text-[var(--color-gold)] transition-colors">{t("tastings")}</Link>
          <Link href="/past-tastings" className="hover:text-[var(--color-gold)] transition-colors">{t("past")}</Link>
          <Link href="/contact" className="hover:text-[var(--color-gold)] transition-colors">{t("contact")}</Link>
          <Link href="/member" className="hover:text-[var(--color-gold)] transition-colors text-gray-400">{tNav("member_access")}</Link>
        </nav>
        
        <div className="flex justify-center md:justify-end items-center gap-4 text-sm font-semibold">
          <a href={`/${locale}/admin`} className="text-gray-500 hover:text-[var(--color-gold)] uppercase tracking-widest text-xs border border-gray-800 px-2 py-1 mr-2">Admin</a>
          <Link href="/" locale="es" className={`${locale === "es" ? "text-[var(--color-gold)]" : "text-gray-500"} hover:text-[var(--color-gold)]`}>ES</Link>
          <span className="text-gray-700">|</span>
          <Link href="/" locale="en" className={`${locale === "en" ? "text-[var(--color-gold)]" : "text-gray-500"} hover:text-[var(--color-gold)]`}>EN</Link>
        </div>
      </div>
    </header>
  );
}
