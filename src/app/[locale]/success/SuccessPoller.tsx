'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SuccessPoller({ sessionId, initialConfirmed, locale }: { sessionId: string; initialConfirmed: boolean; locale: string }) {
  const [isConfirmed, setIsConfirmed] = useState(initialConfirmed);
  const [timeoutReached, setTimeoutReached] = useState(false);
  
  useEffect(() => {
    if (initialConfirmed || !sessionId) return;
    
    let isMounted = true;
    const supabase = createClient();
    let interval: NodeJS.Timeout;

    const poll = async () => {
      const { data } = await supabase
        .from('reservations')
        .select('status, payment_status')
        .eq('stripe_session_id', sessionId)
        .single();
        
      if (data && data.status === 'CONFIRMED' && isMounted) {
        setIsConfirmed(true);
        clearInterval(interval);
      }
    };

    interval = setInterval(poll, 2000);
    poll(); // Initial check

    const timeout = setTimeout(() => {
      if (isMounted && !isConfirmed) {
        clearInterval(interval);
        setTimeoutReached(true);
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sessionId, initialConfirmed, isConfirmed]);

  if (isConfirmed) {
    return (
      <>
        <div className="w-20 h-20 bg-[var(--color-gold)] rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="text-black text-4xl">✓</span>
        </div>
        <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-4">{locale === 'es' ? '¡Reserva Confirmada!' : 'Booking Confirmed!'}</h1>
        <p className="text-gray-400 mb-2">{locale === 'es' ? 'Tu pago se ha procesado correctamente.' : 'Your payment has been successfully processed.'}</p>
        <p className="text-[var(--color-warm-white)] mb-10 mt-4">
          {locale === 'es' ? 'En breve recibirás un correo electrónico con tu enlace de acceso a Mi Capilla.' : 'You will shortly receive an email with your access link to My Chapel.'}
        </p>
      </>
    );
  }

  if (timeoutReached) {
    return (
      <>
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="text-gray-400 text-4xl">?</span>
        </div>
        <h1 className="text-3xl font-serif text-[var(--color-gold)] mb-4">{locale === 'es' ? 'Pago en verificación' : 'Payment in verification'}</h1>
        <p className="text-gray-400 mb-8 px-4">
          {locale === 'es' 
            ? 'Estamos terminando de confirmar tu pago. Puedes cerrar esta página; te enviaremos la confirmación por email en cuanto esté listo.' 
            : 'We are finishing confirming your payment. You can close this page; we will email you the confirmation as soon as it is ready.'}
        </p>
      </>
    );
  }

  return (
    <>
      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
        <span className="text-gray-400 text-4xl">...</span>
      </div>
      <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-4">{locale === 'es' ? 'Procesando...' : 'Processing...'}</h1>
      <p className="text-gray-400 mb-2">
        {locale === 'es' 
          ? 'Estamos verificando el estado de tu pago...' 
          : 'We are verifying your payment status...'}
      </p>
    </>
  );
}
