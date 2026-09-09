import {NextIntlClientProvider} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {Inter, Playfair_Display} from "next/font/google";
import {routing} from "@/i18n/routing";
import {notFound} from "next/navigation";
import "../globals.css";
import {Metadata} from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AgeVerificationModal from "@/components/ui/AgeVerificationModal";
import WhatsAppButton from "@/components/WhatsAppButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const isEn = locale === 'en';
  
  const title = isEn 
    ? "The Church Tasting Room | Gastronomy Experiences" 
    : "The Church Tasting Room | Experiencias Gastronómicas";
    
  const description = isEn
    ? "Premium wine, spirits, and gastronomy tasting experiences in Costa Blanca. Located in El Albir (L'Alfàs del Pi), near Altea. Exclusive events for wine lovers."
    : "Experiencias de cata de vinos, destilados y gastronomía premium en la Costa Blanca. Ubicado en El Albir (L'Alfàs del Pi), muy cerca de Altea.";
    
  return {
    title: {
      template: "%s | The Church Tasting Room",
      default: title,
    },
    description,
    keywords: [
      "Wine Tasting Albir", "Wine Experience Altea", "Wine Lover Albir", "Costa Blanca wine tasting",
      "Catas de vino Albir", "Catas de vino Altea", "L'Alfàs del Pi", 
      "Albir Garden", "Restaurante Enrique", "Can Tapetes", "Sprint Bar", "Casa Teo", "Yamato Albir",
      "Zawa", "Fanneli's Albir", "Essens",
      "Sun Palace Albir", "Kaktus Hotel", "Hotel Noguera", "Rober Palas",
      "Things to do in Albir", "Altea tourist activities", "Bodegas Costa Blanca"
    ],
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es"),
    openGraph: {
      title,
      description,
      url: '/',
      siteName: 'The Church Tasting Room',
      locale: locale === 'en' ? 'en_US' : 'es_ES',
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 800,
          height: 850,
          alt: 'The Church Tasting Room Logo',
        }
      ],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as "en" | "es")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased font-sans bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <AgeVerificationModal />
          <Navbar locale={locale} />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
