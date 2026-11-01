// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
    <main className="min-h-screen py-24 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full bg-[#141414] border border-[var(--color-charcoal)] p-8 md:p-12 text-center shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-gold)]" />
        
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] mb-4">Invitación VIP</p>
        <h1 className="text-2xl md:text-3xl font-serif text-[var(--color-warm-white)] mb-2">
          {tastingTitle}
        </h1>
        
        <p className="text-gray-400 text-sm mb-6">
          Invitación personal para <span className="text-[var(--color-gold)] font-medium">{reservation.profile?.first_name}</span>
        </p>

        <div className="bg-black/60 border border-[var(--color-charcoal)] p-4 rounded-sm mb-8 space-y-2 text-sm text-gray-300">
          <div>
            <span className="text-gray-500">Fecha:</span>{" "}
            <span className="font-medium text-white">{reservation.tasting?.date ? `${formatDayOfWeek(reservation.tasting.date, locale)} ${formatDate(reservation.tasting.date, locale)}` : ''}</span>
          </div>
          <div>
            <span className="text-gray-500">Hora:</span>{" "}
            <span className="font-medium text-white">{reservation.tasting?.start_time ? formatTime(reservation.tasting.start_time) : ''}</span>
          </div>
          <div>
            <span className="text-gray-500">Pases incluidos:</span>{" "}
            <span className="font-medium text-[var(--color-gold)]">{reservation.tickets}</span>
          </div>
        </div>

        <InvitationActions 
          reservationId={reservation.id} 
          currentStatus={reservation.status} 
        />
      </div>
    </main>
  );
}
