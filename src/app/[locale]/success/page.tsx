import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import SuccessPoller from './SuccessPoller';

export default async function SuccessPage({ searchParams, params }: { searchParams: Promise<{ session_id?: string }>, params: Promise<{ locale: string }> }) {
  const { session_id } = await searchParams;
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  
  let isConfirmed = false;

  if (session_id) {
    const { data: resData } = await supabase
      .from('reservations')
      .select('status, payment_status')
      .eq('stripe_session_id', session_id)
      .single();
      
    if (resData && resData.status === 'CONFIRMED') {
      isConfirmed = true;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-xl w-full text-center p-12 border border-[var(--color-charcoal)] bg-[#0a0a0a]">
        
        <SuccessPoller 
          sessionId={session_id || ''} 
          initialConfirmed={isConfirmed} 
          locale={locale} 
        />

        {session_id && (
          <p className="text-xs text-gray-600 font-mono mb-8 break-all mt-4">
            ID: {session_id}
          </p>
        )}

        <Link 
          href="/tastings"
          className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 uppercase tracking-widest text-sm hover:bg-[var(--color-gold)] hover:text-black transition-colors"
        >
          {locale === 'es' ? 'Volver a Catas' : 'Back to Tastings'}
        </Link>
      </div>
    </main>
  );
}
