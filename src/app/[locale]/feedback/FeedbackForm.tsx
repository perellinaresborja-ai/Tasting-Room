"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState(5);
  const [bestPart, setBestPart] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('token', token);
    formData.append('rating', rating.toString());
    formData.append('best_part', bestPart);

    const res = await fetch('/api/feedback', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      router.refresh();
    } else {
      setLoading(false);
      alert('Error al enviar. Inténtalo de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-gray-400 text-sm uppercase tracking-widest mb-4 text-center">Puntuación</label>
        <div className="flex justify-center space-x-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={"w-12 h-12 flex items-center justify-center border transition-colors " + (rating >= n ? 'bg-[var(--color-gold)] border-[var(--color-gold)] text-black' : 'border-[var(--color-charcoal)] text-gray-400')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-gray-400 text-sm uppercase tracking-widest mb-2">¿Qué te ha gustado más?</label>
        <textarea
          value={bestPart}
          onChange={e => setBestPart(e.target.value)}
          className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:border-[var(--color-gold)] outline-none min-h-[120px]"
          placeholder="Tus comentarios..."
        />
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[var(--color-gold)] text-black font-bold uppercase tracking-widest py-4 hover:bg-white transition-colors disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar Valoración'}
      </button>
    </form>
  );
}