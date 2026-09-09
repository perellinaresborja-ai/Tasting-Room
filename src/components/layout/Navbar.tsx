"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations("Nav");
  const tNav = useTranslations("Navigation");
  const [isOpen, setIsOpen] = useState(false);
  
  const navLinks = [
    { href: "/tastings", label: t("tastings") },
    { href: "/member", label: tNav("member_access"), special: true },
    { href: "/past-tastings", label: t("past") },
    { href: "/contact", label: t("contact") },
  ];

  return (
    <header className="relative z-50 border-b border-[var(--color-charcoal)] py-3 px-4 md:px-8 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center">
            <Image src="/logo-header-full.png" alt="The Church Tasting Room" width={180} height={45} className="object-contain" />
          </Link>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden lg:flex flex-1 justify-center items-center gap-6 xl:gap-10 text-sm uppercase tracking-wider text-[var(--color-warm-white)]">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href as any} 
              className={`whitespace-nowrap hover:text-[var(--color-gold)] transition-colors ${link.special ? 'text-gray-400' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        {/* Right side (Desktop & Mobile) */}
        <div className="flex items-center gap-4 text-sm font-semibold">
          <a href={`/${locale}/admin`} className="hidden md:inline-block text-gray-500 hover:text-[var(--color-gold)] uppercase tracking-widest text-xs border border-gray-800 px-2 py-1">
            Admin
          </a>
          <div className="flex items-center gap-2">
            <Link href="/" locale="es" className={`${locale === "es" ? "text-[var(--color-gold)]" : "text-gray-500"} hover:text-[var(--color-gold)]`}>ES</Link>
            <span className="text-gray-700">|</span>
            <Link href="/" locale="en" className={`${locale === "en" ? "text-[var(--color-gold)]" : "text-gray-500"} hover:text-[var(--color-gold)]`}>EN</Link>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-[var(--color-gold)] ml-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[var(--background)] border-b border-[var(--color-charcoal)] py-4 px-4 shadow-xl">
          <nav className="flex flex-col space-y-4 text-center text-sm uppercase tracking-wider text-[var(--color-warm-white)]">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href as any} 
                onClick={() => setIsOpen(false)}
                className={`block py-2 hover:text-[var(--color-gold)] transition-colors ${link.special ? 'text-gray-400' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <a href={`/${locale}/admin`} className="block py-2 text-gray-500 hover:text-[var(--color-gold)] border-t border-[var(--color-charcoal)] mt-4 pt-4">
              Admin
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
