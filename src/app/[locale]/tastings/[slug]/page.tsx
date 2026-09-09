import {getTranslations, setRequestLocale} from "next-intl/server";
import {Link} from "@/i18n/routing";
import { notFound } from "next/navigation";
import Image from "next/image";
import { formatDate, formatDayOfWeek, formatTime } from "@/lib/utils/formatDate";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/ui/BookingForm";

export default async function TastingDetailPage({
  params,
}: {
  params: Promise<{locale: string; slug: string}>;
}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tastings");

  const supabase = await createClient();
  const { data: tasting } = await supabase.from('tastings').select('*').eq('slug', slug).single();
  
  if (!tasting) return notFound();

  const { data: capacityData } = await supabase
    .from('public_tasting_capacity')
    .select('available_spots')
    .eq('tasting_id', tasting.id)
    .single();

  const availableSpots = capacityData ? capacityData.available_spots : tasting.capacity;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="relative h-[50vh] lg:h-[70vh] border border-[var(--color-charcoal)]">
          <Image 
            src={tasting.cover_image || "/logo-header-full.png"} 
            alt={locale === "es" ? tasting.title_es : tasting.title_en} 
            fill 
            className="object-cover" 
            priority
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-sm text-[var(--color-gold)] uppercase tracking-[0.3em] mb-4">
            {tasting.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-warm-white)] mb-8 leading-tight">
            {locale === "es" ? tasting.title_es : tasting.title_en}
          </h1>
          <p className="text-lg text-gray-400 font-light mb-10 leading-relaxed whitespace-pre-wrap">
            {locale === "es" ? tasting.description_es : tasting.description_en}
          </p>
          
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-10 py-8 border-y border-[var(--color-charcoal)]">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">{t("date")}</p>
              <p className="text-lg text-white capitalize">{formatDayOfWeek(tasting.date, locale)}</p>
              <p className="text-lg text-white">{formatDate(tasting.date, locale)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">{t("time")}</p>
              <p className="text-lg text-white">{formatTime(tasting.start_time)} {tasting.end_time ? `- ${formatTime(tasting.end_time)}` : ''}</p>
            </div>
            {tasting.host && (
              <div>
                <p className="text-sm text-[var(--color-gold)] uppercase tracking-widest mb-1">{t("host")}</p>
                <p className="text-lg text-white">{tasting.host}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">{t("location_title")}</p>
              <p className="text-lg text-white">{tasting.location || 'The Church'}</p>
            </div>
          </div>

          {/* GUESTS / EXPERTS SECTION */}
          {tasting.guests && tasting.guests.length > 0 && (
            <div className="mb-10">
              <p className="text-xs text-[var(--color-gold)] uppercase tracking-[0.2em] mb-4">Invitados Especiales / Expertos</p>
              <div className="space-y-4">
                {tasting.guests.map((guest: { id: string; name: string; role: string; company?: string; bio?: string; avatar_url?: string; photo?: string }, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 bg-[#0a0a0a] p-4 border border-[var(--color-charcoal)]">
                    {guest.photo ? (
                      <div className="w-12 h-12 relative flex-shrink-0 rounded-full overflow-hidden border border-[var(--color-gold)]">
                        <Image src={guest.photo} alt={guest.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex-shrink-0 rounded-full bg-[#141414] border border-[var(--color-charcoal)] flex items-center justify-center">
                        <span className="text-[var(--color-gold)] font-serif text-lg">{guest.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-serif text-lg leading-none">{guest.name}</h4>
                      <p className="text-[var(--color-gold)] text-xs uppercase tracking-widest mt-1">
                        {guest.role} {guest.company && <span className="text-gray-500 lowercase"> • {guest.company}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-10 border-t border-[var(--color-charcoal)] pt-8">
            <div>
              <p className="text-3xl text-white">€{tasting.price.toFixed(2)}</p>
              <p className="text-sm text-gray-500 uppercase">{t("per_person")}</p>
            </div>
          </div>

          <BookingForm 
            tastingId={tasting.id} 
            price={tasting.price} 
            availableSpots={availableSpots} 
            includesAlcohol={tasting.includes_alcohol} 
          />
        </div>
      </div>
    </main>
  );
}
