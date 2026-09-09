import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

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
        {isConfirmed ? (
          <>
            <div className="w-20 h-20 bg-[var(--color-gold)] rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-black text-4xl">✓</span>
            </div>
            <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-4">{locale === 'es' ? '¡Reserva Confirmada!' : 'Booking Confirmed!'}</h1>
            <p className="text-gray-400 mb-2">{locale === 'es' ? 'Tu pago se ha procesado correctamente.' : 'Your payment has been successfully processed.'}</p>
            {session_id && (
              <p className="text-xs text-gray-600 font-mono mb-8 break-all">
                ID: {session_id}
              </p>
            )}
            <p className="text-[var(--color-warm-white)] mb-10">
              {locale === 'es' ? 'En breve recibirás un correo electrónico con tu enlace de acceso a Mi Capilla.' : 'You will shortly receive an email with your access link to My Chapel.'}
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="text-gray-400 text-4xl">?</span>
            </div>
            <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-4">{locale === 'es' ? 'Procesando...' : 'Processing...'}</h1>
            <p className="text-gray-400 mb-2">
              {locale === 'es' 
                ? 'Estamos verificando el estado de tu pago. Si abandonaste el proceso, tu reserva no se ha completado.' 
                : 'We are verifying your payment status. If you abandoned the process, your booking is incomplete.'}
            </p>
            {session_id && (
              <p className="text-xs text-gray-600 font-mono mb-8 break-all">
                ID: {session_id}
              </p>
            )}
          </>
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
