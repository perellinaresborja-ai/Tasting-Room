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

export const metadata: Metadata = {
  title: {
    template: "%s | The Church Tasting Room",
    default: "The Church Tasting Room",
  },
  description: "Premium tasting experiences at The Church.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es"),
};

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
