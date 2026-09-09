/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import InvitationActions from "./InvitationActions";
import { formatDate, formatTime, formatDayOfWeek } from "@/lib/utils/formatDate";

export default async function InvitationPage({ params }: { params: Promise<{ token: string; locale: string }> }) {
  const { token, locale } = (await params);
  const supabase = await createClient();

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, tickets, status, profile:profiles(first_name), tasting:tastings(title_es, title_en, date, start_time)')
    .eq('invitation_token', token)
    .eq('reservation_type', 'INVITATION')
    .single();

  if (!reservation) {
    notFound();
  }

  const tastingTitle = locale === 'en' ? reservation.tasting?.title_en : reservation.tasting?.title_es;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-12 bg-[#0a0a0a] border border-[var(--color-charcoal)] p-8 md:p-16">
        <div>
          <h1 className="text-xl tracking-[0.3em] uppercase text-gray-500 mb-8">The Church Tasting Room</h1>
          <p className="text-2xl font-serif text-[var(--color-gold)] mb-2">
            {reservation.profile?.first_name}, {locale === 'en' ? 'you have been invited' : 'has sido invitado'}
          </p>
        </div>

        <div>
          <h2 className="text-4xl font-serif text-white uppercase tracking-widest mb-6">{tastingTitle}</h2>
          <div className="text-gray-400 space-y-2 text-lg">
            <p className="capitalize">{formatDayOfWeek(reservation.tasting?.date, locale)} {formatDate(reservation.tasting?.date, locale)}</p>
            <p>{formatTime(reservation.tasting?.start_time)}</p>
          </div>
        </div>

        <div className="border-y border-[var(--color-charcoal)] py-6">
          <p className="text-[var(--color-gold)] uppercase tracking-widest">
            {locale === 'en' ? 'Invitation for' : 'Invitación para'} {reservation.tickets} {locale === 'en' ? 'people' : 'personas'}
          </p>
        </div>

        <p className="text-sm text-gray-500">
          {locale === 'en' ? 'This invitation is personal and non-transferable.' : 'Esta invitación es personal e intransferible.'}
        </p>

        {reservation.status === 'PENDING' ? (
          <InvitationActions reservationId={reservation.id} locale={locale} />
        ) : (
          <div className="pt-8">
            <p className={`text-xl uppercase tracking-widest font-bold ${reservation.status === 'CONFIRMED' ? 'text-green-500' : 'text-red-500'}`}>
              {reservation.status === 'CONFIRMED' ? (locale === 'en' ? 'ACCEPTED' : 'ACEPTADA') : (locale === 'en' ? 'DECLINED' : 'RECHAZADA')}
            </p>
            {reservation.status === 'CONFIRMED' && (
              <p className="text-gray-400 mt-4 text-sm leading-relaxed">
                {locale === 'en' 
                  ? 'Your reservation is confirmed. You can view your QR code in the Client Area.' 
                  : 'Tu reserva está confirmada. Puedes ver tu código QR en el Área de Cliente.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
