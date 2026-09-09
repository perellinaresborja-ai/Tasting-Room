/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { joinWaitlist } from '@/app/actions/waitlist';

type Props = {
  tastingId: string;
  price: number;
  availableSpots: number;
  includesAlcohol: boolean;
};

export default function BookingForm({ tastingId, price, availableSpots, includesAlcohol }: Props) {
  const t = useTranslations('Tastings');
  const locale = useLocale();
  const router = useRouter();

  const [tickets, setTickets] = useState(1);
  const [loading, setLoading] = useState(false);
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    // Track click
    await import('@/app/actions/analytics').then(m => 
      m.trackAnalyticsEvent({ event_name: 'booking_click', tasting_id: tastingId })
    ).catch(() => {});

    router.push(`/${locale}/checkout?tasting=${tastingId}&tickets=${tickets}`);
  };

  const handleWaitlist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setWaitlistError('');
    const formData = new FormData(e.currentTarget);
    formData.append('tasting_id', tastingId);
    
    const res = await joinWaitlist(formData);
    setLoading(false);
    if (res.success) {
      setWaitlistDone(true);
    } else {
      setWaitlistError(res.error || 'Error al apuntarse');
    }
  };

  if (availableSpots <= 0) {
    if (waitlistDone) {
      return (
        <div className="bg-[#141414] p-8 border border-[var(--color-charcoal)] text-center">
          <p className="text-[var(--color-gold)] font-serif text-2xl uppercase tracking-widest mb-2">Apuntado</p>
          <p className="text-gray-400">Te avisaremos si quedan plazas libres.</p>
        </div>
      );
    }

    if (waitlistMode) {
      return (
        <div className="bg-[#141414] p-6 border border-[var(--color-charcoal)] relative">
          <h3 className="text-xl font-serif text-[var(--color-gold)] mb-4 uppercase tracking-widest text-center">
            Lista de Espera
          </h3>
          {waitlistError && <p className="text-red-500 text-sm mb-4">{waitlistError}</p>}
          <form onSubmit={handleWaitlist} className="space-y-4">
            <div>
              <input type="text" name="name" required placeholder="Tu Nombre" className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
            </div>
            <div>
              <input type="email" name="email" required placeholder="Tu Email" className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
            </div>
            <div>
              <input type="tel" name="phone" placeholder="Tu Teléfono (opcional)" className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-[var(--color-gold)] text-black font-bold uppercase tracking-widest py-4 hover:bg-white transition-colors disabled:opacity-50">
              {loading ? 'Apuntando...' : 'Apuntarse'}
            </button>
            <button type="button" onClick={() => setWaitlistMode(false)} className="w-full text-gray-400 text-sm hover:text-white uppercase tracking-wider">
              Volver
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="bg-[#141414] p-8 border border-[var(--color-charcoal)] text-center">
        <p className="text-[var(--color-gold)] font-serif text-2xl uppercase tracking-widest mb-4">
          {locale === 'es' ? 'Agotado' : 'Sold Out'}
        </p>
        <button onClick={() => setWaitlistMode(true)} className="w-full border border-[var(--color-gold)] text-[var(--color-gold)] font-bold uppercase tracking-widest py-4 hover:bg-[var(--color-gold)] hover:text-black transition-colors">
          {locale === 'es' ? 'Apuntarse a la lista de espera' : 'Join waitlist'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] p-6 border border-[var(--color-charcoal)] relative">
      {availableSpots <= 5 && (
        <div className="absolute top-0 right-0 bg-[var(--color-gold)] text-black text-xs font-bold px-3 py-1 uppercase tracking-widest">
          {locale === 'es' ? 'Últimas Plazas' : 'Last Spots'}
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <span className="text-gray-400 uppercase tracking-widest text-sm">{locale === 'es' ? 'Precio' : 'Price'}</span>
        <span className="text-3xl font-serif text-[var(--color-warm-white)]">{price}€</span>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 uppercase tracking-widest mb-2">
            {locale === 'es' ? 'Nº de Plazas' : 'Number of Tickets'}
          </label>
          <select 
            value={tickets}
            onChange={(e) => setTickets(Number(e.target.value))}
            className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
          >
            {Array.from({ length: Math.min(10, availableSpots) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-[var(--color-gold)] text-black font-bold uppercase tracking-widest py-4 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? t('loading') : (locale === 'es' ? 'Comprar' : 'Book')}
        </button>
        {includesAlcohol && (
          <p className="text-xs text-gray-500 text-center uppercase tracking-wider">
            Solo para mayores de 18 años.
          </p>
        )}
      </div>
    </div>
  );
}
