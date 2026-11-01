import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import SuccessPoller, { GiftData } from './SuccessPoller';
import Stripe from 'stripe';

export default async function SuccessPage({ searchParams, params }: { searchParams: Promise<{ session_id?: string }>, params: Promise<{ locale: string }> }) {
  const { session_id } = await searchParams;
  const { locale } = await params;
  const supabase = await createClient();
  
  let isConfirmed = false;
  let giftData: GiftData = { isGift: false };

  if (session_id) {
    const { data: resData } = await supabase
      .from('reservations')
      .select('status, payment_status, tickets, tasting:tastings(title_es, title_en, date, start_time)')
      .eq('stripe_session_id', session_id)
      .single();
      
    if (resData && resData.status === 'CONFIRMED') {
      isConfirmed = true;
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
        apiVersion: '2026-08-26.dahlia',
      });
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.metadata?.is_gift === 'true') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasting = Array.isArray(resData?.tasting) ? resData.tasting[0] : (resData?.tasting as any);
        giftData = {
          isGift: true,
          recipientName: session.metadata.recipient_name,
          recipientEmail: session.metadata.recipient_email,
          recipientPhone: session.metadata.recipient_phone,
          giftDelivery: session.metadata.gift_delivery,
          giftMessage: session.metadata.gift_message,
          buyerName: session.metadata.buyer_name,
          tastingTitle: locale === 'es' ? tasting?.title_es : tasting?.title_en,
          date: tasting?.date,
          time: tasting?.start_time ? String(tasting.start_time).slice(0, 5) : '',
          tickets: resData?.tickets || 1,
        };
      }
    } catch (e) {
      console.error('Error fetching session for giftData:', e);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="max-w-xl w-full text-center p-8 sm:p-12 border border-[var(--color-charcoal)] bg-[#0a0a0a]">
        
        <SuccessPoller 
          sessionId={session_id || ''} 
          initialConfirmed={isConfirmed} 
          locale={locale} 
          giftData={giftData}
        />

        {session_id && (
          <p className="text-xs text-gray-600 font-mono mb-8 break-all mt-4 print:hidden">
            ID: {session_id}
          </p>
        )}

        <Link 
          href="/tastings"
          className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 uppercase tracking-widest text-sm hover:bg-[var(--color-gold)] hover:text-black transition-colors print:hidden"
        >
          {locale === 'es' ? 'Volver a Catas' : 'Back to Tastings'}
        </Link>
      </div>
    </main>
  );
}
