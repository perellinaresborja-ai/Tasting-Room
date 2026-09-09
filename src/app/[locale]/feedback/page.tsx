import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import FeedbackForm from './FeedbackForm';

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return notFound();
  }

  const supabase = await createClient();

  // Validate token securely on server
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*, profile:profiles(id, first_name), tasting:tastings(title_es)')
    .eq('feedback_token', token)
    .single();

  if (!reservation) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-[#141414] border border-[var(--color-charcoal)]">
        <h2 className="text-[var(--color-gold)] font-serif text-2xl uppercase tracking-widest mb-4">No válido</h2>
        <p className="text-gray-400">El enlace ha expirado o no es correcto.</p>
      </div>
    );
  }

  // Check if feedback already left
  const { data: existingFeedback } = await supabase
    .from('feedback')
    .select('id')
    .eq('reservation_id', reservation.id)
    .single();

  if (existingFeedback) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-[#141414] border border-[var(--color-charcoal)]">
        <h2 className="text-[var(--color-gold)] font-serif text-2xl uppercase tracking-widest mb-4">¡Gracias!</h2>
        <p className="text-gray-400">Ya has valorado esta cata.</p>
      </div>
    );
  }

  const tasting = reservation.tasting as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 md:p-12">
        <h1 className="text-3xl font-serif text-[var(--color-warm-white)] text-center mb-2">{tasting?.title_es}</h1>
        <p className="text-gray-400 text-center uppercase tracking-wider text-sm mb-10">Tu Opinión</p>
        <FeedbackForm token={token} />
      </div>
    </div>
  );
}