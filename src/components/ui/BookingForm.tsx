"use client";

import { useState } from 'react';
import { createCheckoutSession } from '@/app/actions/checkout';
import { useTranslations, useLocale } from 'next-intl';

type Props = {
  tastingId: string;
  price: number;
  availableSpots: number;
  includesAlcohol: boolean;
};

export default function BookingForm({ tastingId, price, availableSpots, includesAlcohol }: Props) {
  const t = useTranslations('Tastings');
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tickets, setTickets] = useState(1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('tasting_id', tastingId);
    formData.append('locale', locale);

    const res = await createCheckoutSession(formData);
    
    if (!res.success) {
      setError(res.error || 'Error al procesar la reserva');
      setLoading(false);
    } else if (res.url) {
      window.location.href = res.url;
    }
  }

  if (availableSpots <= 0) {
    return (
      <div className="bg-[#141414] p-8 border border-[var(--color-charcoal)] text-center">
        <p className="text-[var(--color-gold)] font-serif text-2xl uppercase tracking-widest">
          {locale === 'es' ? 'Agotado' : 'Sold Out'}
        </p>
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
      
      <h3 className="text-xl font-serif text-[var(--color-gold)] mb-6 uppercase tracking-widest">{t('book')}</h3>
      
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Nombre</label>
            <input type="text" name="first_name" required className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Apellidos</label>
            <input type="text" name="last_name" required className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Email</label>
            <input type="email" name="email" required className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Teléfono</label>
            <input type="tel" name="phone" required className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-widest">Plazas</label>
          <select 
            name="tickets" 
            value={tickets}
            onChange={(e) => setTickets(Number(e.target.value))}
            className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
          >
            {Array.from({ length: Math.min(10, availableSpots) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {includesAlcohol && (
          <div className="flex items-start gap-3 mt-4">
            <input type="checkbox" required id="age_verify" className="mt-1" />
            <label htmlFor="age_verify" className="text-sm text-gray-400 leading-tight">
              {locale === 'es' ? 'Confirmo que tengo 18 años o más.' : 'I confirm I am 18 years or older.'}
            </label>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-[var(--color-charcoal)]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl text-[var(--color-gold)]">€{(price * tickets).toFixed(2)}</span>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--color-gold)] text-black px-10 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : (locale === 'es' ? 'Pagar con Tarjeta' : 'Pay via Card')}
          </button>
        </div>
      </form>
    </div>
  );
}
