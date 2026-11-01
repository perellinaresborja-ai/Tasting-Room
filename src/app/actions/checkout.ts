"use server";

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-08-26.dahlia', // fallback or force type
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createCheckoutSession(formData: FormData) {
  try {
    const tastingId = formData.get('tasting_id') as string;
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const tickets = parseInt(formData.get('tickets') as string, 10);
    const locale = formData.get('locale') as string || 'es';
    const isGift = formData.get('is_gift') === 'true';
    const giftDelivery = (formData.get('gift_delivery') as string) || 'whatsapp';
    const recipientName = (formData.get('recipient_name') as string)?.trim() || '';
    const recipientEmail = (formData.get('recipient_email') as string)?.trim() || '';
    const recipientPhone = (formData.get('recipient_phone') as string)?.trim() || '';
    const giftMessage = (formData.get('gift_message') as string)?.trim() || '';

    if (!tastingId || !firstName || !lastName || !email || !tickets) {
      return { success: false, error: 'Faltan campos obligatorios' };
    }

    if (isGift && !recipientName) {
      return { success: false, error: 'Falta el nombre de la persona que recibe el regalo.' };
    }

    // 1. Fetch tasting details to get the REAL price
    const { data: tasting, error: tastingError } = await supabaseAdmin
      .from('tastings')
      .select('*')
      .eq('id', tastingId)
      .single();

    if (tastingError || !tasting) {
      return { success: false, error: 'Cata no encontrada' };
    }

    const totalAmount = tasting.price * tickets;

    // Call the RPC to atomically check capacity and create reservation
    const { data: reservationId, error: rpcError } = await supabaseAdmin
      .rpc('create_reservation', {
        p_tasting_id: tastingId,
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone || null,
        p_tickets: tickets,
        p_total_amount: totalAmount,
        p_reservation_type: isGift ? 'GIFT' : 'SALE'
      });

    if (rpcError || !reservationId) {
      console.error('RPC Error:', rpcError);
      if (rpcError?.message?.includes('Not enough capacity')) {
        return { success: false, error: 'Lo sentimos, no quedan suficientes plazas.' };
      }
      return { success: false, error: 'Error al procesar la reserva.' };
    }

    // 2b. Persist Marketing Consents directly to the created profile before going to Stripe
    const marketingEmail = formData.get('marketing_email') === 'true';
    const marketingWhatsapp = formData.get('marketing_whatsapp') === 'true';

    const { data: resData } = await supabaseAdmin
      .from('reservations')
      .select('profile_id')
      .eq('id', reservationId)
      .single();

    if (resData?.profile_id) {
      await supabaseAdmin.from('profiles').update({
        marketing_email_consent: marketingEmail,
        marketing_whatsapp_consent: marketingWhatsapp
      }).eq('id', resData.profile_id);
    }

    // 3. Create Stripe Checkout Session
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es';
    if (siteUrl.includes('://tastingroom.es')) {
      siteUrl = siteUrl.replace('://tastingroom.es', '://www.tastingroom.es');
    }
    
    const tastingDesc = locale === 'es' ? (tasting.subtitle_es || tasting.description_es) : (tasting.subtitle_en || tasting.description_en);
    const plainDesc = tastingDesc ? tastingDesc.replace(/<[^>]*>?/gm, '') : '';
    const stripeDescription = isGift
      ? `${tickets}x Plaza(s) de Regalo para ${recipientName} - ${plainDesc}`.substring(0, 500)
      : `${tickets}x Ticket(s) - ${plainDesc}`.substring(0, 500);

    const productName = isGift
      ? (locale === 'es' 
          ? `🎁 Tarjeta Regalo: ${tasting.title_es} (Para: ${recipientName})` 
          : `🎁 Gift Card: ${tasting.title_en} (For: ${recipientName})`)
      : (locale === 'es' ? `Reserva: ${tasting.title_es}` : `Booking: ${tasting.title_en}`);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      metadata: {
        locale: locale,
        reservation_id: reservationId,
        tasting_id: tastingId,
        is_gift: isGift ? 'true' : 'false',
        gift_delivery: giftDelivery,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        gift_message: giftMessage,
        buyer_name: `${firstName} ${lastName}`.trim(),
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: stripeDescription,
              images: tasting.cover_image ? [tasting.cover_image] : [],
            },
            unit_amount: Math.round(tasting.price * 100),
          },
          quantity: tickets,
        },
      ],
      success_url: `${siteUrl}/${locale}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/${locale}/tastings/${tasting.slug}`,
    });

    // 4. Update the reservation with the Stripe Session ID
    await supabaseAdmin
      .from('reservations')
      .update({ stripe_session_id: session.id })
      .eq('id', reservationId);

    // Track checkout started
    await import('@/app/actions/analytics').then(m => 
      m.trackAnalyticsEvent({ 
        event_name: 'checkout_started', 
        tasting_id: tastingId,
        session_id: session.id
      })
    ).catch(() => {});

    return { success: true, url: session.url };
  } catch (error: unknown) {
    console.error('Checkout error:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || 'Error inesperado' };
  }
}
