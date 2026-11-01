'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type GiftData = {
  isGift: boolean;
  recipientName?: string;
  giftMessage?: string;
  buyerName?: string;
  tastingTitle?: string;
  date?: string;
  time?: string;
  tickets?: number;
};

export default function SuccessPoller({ 
  sessionId, 
  initialConfirmed, 
  locale,
  giftData 
}: { 
  sessionId: string; 
  initialConfirmed: boolean; 
  locale: string;
  giftData?: GiftData;
}) {
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
    if (giftData?.isGift) {
      return (
        <div className="animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-[var(--color-gold)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-3xl">✓</span>
          </div>
          <h1 className="text-3xl font-serif text-[var(--color-gold)] mb-2">
            {locale === 'es' ? '¡Tarjeta Regalo Lista!' : 'Gift Voucher Ready!'}
          </h1>
          <p className="text-gray-400 mb-6 text-sm">
            {locale === 'es' 
              ? 'Tu pago se ha procesado con éxito. Aquí tienes la tarjeta regalo personalizada:' 
              : 'Your payment was processed successfully. Here is your personalized gift voucher:'}
          </p>

          {/* TARJETA REGALO VISUAL */}
          <div className="my-6 p-6 sm:p-8 bg-[#111] border-2 border-[var(--color-gold)] text-left shadow-2xl relative print:border-black print:bg-white print:text-black">
            <div className="flex justify-between items-start border-b border-[var(--color-charcoal)] pb-4 mb-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)] block">The Church Tasting Room</span>
                <h2 className="text-xl sm:text-2xl font-serif text-white mt-1 print:text-black">
                  {locale === 'es' ? 'TARJETA REGALO' : 'GIFT VOUCHER'}
                </h2>
              </div>
              <span className="text-2xl">🎁</span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block">{locale === 'es' ? 'Para' : 'To'}</span>
                <span className="text-lg font-serif text-[var(--color-gold)] font-bold">{giftData.recipientName}</span>
              </div>

              {giftData.buyerName && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">{locale === 'es' ? 'De parte de' : 'From'}</span>
                  <span className="text-white font-medium print:text-black">{giftData.buyerName}</span>
                </div>
              )}

              {giftData.giftMessage && (
                <div className="p-3 bg-black/60 border border-[var(--color-charcoal)] italic text-gray-300 text-xs my-2 print:bg-gray-100 print:text-black">
                  &ldquo;{giftData.giftMessage}&rdquo;
                </div>
              )}

              <div className="pt-3 border-t border-[var(--color-charcoal)] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 uppercase tracking-wider block">{locale === 'es' ? 'Experiencia' : 'Experience'}</span>
                  <span className="text-white font-medium print:text-black">{giftData.tastingTitle}</span>
                </div>
                <div>
                  <span className="text-gray-500 uppercase tracking-wider block">{locale === 'es' ? 'Fecha y Hora' : 'Date & Time'}</span>
                  <span className="text-white print:text-black">{giftData.date} • {giftData.time}</span>
                </div>
                <div className="col-span-2 pt-1">
                  <span className="text-gray-500 uppercase tracking-wider block">{locale === 'es' ? 'Plazas y Ubicación' : 'Seats & Location'}</span>
                  <span className="text-white print:text-black">{giftData.tickets} {locale === 'es' ? 'plaza(s)' : 'seat(s)'} · The Church Tasting Room</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN PARA LA TARJETA REGALO */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🖨️</span>
              <span>{locale === 'es' ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}</span>
            </button>
            
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                locale === 'es'
                  ? `¡Hola ${giftData.recipientName}! 🎁 Te he regalado una experiencia en The Church Tasting Room para "${giftData.tastingTitle}" (${giftData.date} a las ${giftData.time}). ¡Espero que lo disfrutes muchísimo!`
                  : `Hi ${giftData.recipientName}! 🎁 I got you an experience at The Church Tasting Room for "${giftData.tastingTitle}" (${giftData.date} at ${giftData.time}). Enjoy it!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-6 py-2.5 text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <span>📲</span>
              <span>{locale === 'es' ? 'Reenviar por WhatsApp' : 'Share via WhatsApp'}</span>
            </a>
          </div>

          <p className="text-xs text-gray-500 mb-6 print:hidden">
            {locale === 'es' 
              ? 'También te hemos enviado un correo con todos los detalles y el comprobante.' 
              : 'We have also sent you an email with full details and confirmation.'}
          </p>
        </div>
      );
    }

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
