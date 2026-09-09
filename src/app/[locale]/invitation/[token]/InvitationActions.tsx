"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToInvitation } from "@/app/actions/respondInvitation";

export default function InvitationActions({ reservationId, locale }: { reservationId: string, locale: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(action: 'ACCEPT' | 'REJECT') {
    setLoading(true);
    await respondToInvitation(reservationId, action);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <button 
        onClick={() => handleAction('ACCEPT')}
        disabled={loading}
        className="w-full bg-[var(--color-gold)] text-black px-6 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50"
      >
        {locale === 'en' ? 'ACCEPT INVITATION' : 'ACEPTAR INVITACIÓN'}
      </button>
      <button 
        onClick={() => handleAction('REJECT')}
        disabled={loading}
        className="w-full border border-gray-600 text-gray-400 px-6 py-4 uppercase tracking-widest font-bold hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        {locale === 'en' ? 'I CANNOT ATTEND' : 'NO PODRÉ ASISTIR'}
      </button>
    </div>
  );
}
