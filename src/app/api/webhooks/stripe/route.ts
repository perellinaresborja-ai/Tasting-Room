import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-08-26.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    console.error(`Webhook signature verification failed: ${(err instanceof Error ? err.message : String(err))}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (reservationId) {
        if (session.payment_status !== 'paid') {
          console.log(`Payment not confirmed yet for session ${session.id}, status: ${session.payment_status}`);
          return NextResponse.json({ received: true });
        }

        // 1. Fetch reservation to ensure idempotency for email specifically
        const { data: resData, error: resError } = await supabaseAdmin
          .from('reservations')
          .select('*, profile:profiles(email, first_name, last_name, public_token), tasting:tastings(title_es, title_en, date, start_time)')
          .eq('id', reservationId)
          .single();

        if (resError || !resData) {
          console.error('Reservation not found:', reservationId);
          return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        // 2. Mark reservation as CONFIRMED and PAID (idempotent for status)
        if (resData.status !== 'CONFIRMED') {
          const { error: updateError } = await supabaseAdmin
            .from('reservations')
            .update({
              status: 'CONFIRMED',
              payment_status: 'PAID',
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', reservationId);

          if (updateError) {
            console.error('Error updating reservation:', updateError);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
          }
          console.log(`Reservation ${reservationId} marked CONFIRMED.`);

          // TRACK payment_completed
          await import('@/app/actions/analytics').then(m => 
            m.trackAnalyticsEvent({ 
              event_name: 'payment_completed', 
              tasting_id: resData.tasting_id,
              profile_id: resData.profile_id,
              session_id: session.id
            })
          ).catch(() => {});
        }

        // 3. Send email idempotently
        if (!resData.confirmation_email_sent_at && resData.profile?.email) {
          try {
            const locale = session.metadata?.locale || "es";
            let appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es';
            if (appUrl.includes('://tastingroom.es')) {
              appUrl = appUrl.replace('://tastingroom.es', '://www.tastingroom.es');
            }
            const title = resData.tasting?.title_es || 'The Church Tasting Room';
            const date = resData.tasting?.date;
            
            // Format time HH:mm
            let time = resData.tasting?.start_time || '';
            if (time && time.length >= 5) {
              time = time.slice(0, 5);
            }

            const isGift = session.metadata?.is_gift === 'true';
            const recipientName = session.metadata?.recipient_name || '';
            const giftMessage = session.metadata?.gift_message || '';
            const buyerName = session.metadata?.buyer_name || (resData.profile?.first_name ? `${resData.profile.first_name} ${resData.profile.last_name || ''}`.trim() : '');

            // Generate secure access link
            let actionUrl = `${appUrl}/${locale}/member`;
            try {
              const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: resData.profile.email,
                options: {
                  redirectTo: `${appUrl}/auth/callback?next=/${locale}/member`
                }
              });
              
              if (!linkError && linkData?.properties?.hashed_token) {
                actionUrl = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/${locale}/member`;
              } else if (linkError) {
                console.error("Error generating link for email:", linkError);
              }
            } catch (err) {
              console.error("Error generating link for email:", err);
            }

            let emailSubject = '';
            let html = '';

            if (isGift) {
              emailSubject = locale === 'en'
                ? `🎁 Gift Voucher: ${title} for ${recipientName} — The Church Tasting Room`
                : `🎁 Tu Tarjeta Regalo para ${title} está lista — The Church Tasting Room`;

              html = locale === 'en' ? `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" style="height: 44px; width: auto; margin: 0 auto 12px; display: block;" />
                    <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">EXPERIENCE GIFT VOUCHER</h1>
                  </div>

                  <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
                    <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">To</p>
                    <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${recipientName}</p>

                    ${buyerName ? `
                      <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">From</p>
                      <p style="color: #ffffff; font-size: 15px; margin: 0 0 16px;">${buyerName}</p>
                    ` : ''}

                    ${giftMessage ? `
                      <div style="padding: 12px; background-color: #050505; border-left: 3px solid #c9a96e; font-style: italic; color: #cccccc; font-size: 13px; margin-bottom: 16px;">
                        &ldquo;${giftMessage}&rdquo;
                      </div>
                    ` : ''}

                    <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 16px;">
                      <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 8px;">${title}</p>
                      <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 4px;">📅 Date: ${date} • ⏱ Time: ${time}</p>
                      <p style="color: #aaaaaa; font-size: 14px; margin: 0;">Seats: ${resData.tickets} · The Church Tasting Room</p>
                    </div>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 14px; color: #cccccc;">You can forward this email to <strong>${recipientName}</strong>, or access My Chapel to view your booking details and access QR.</p>
                    <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 12px;">Access My Chapel</a>
                  </div>

                  <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 30px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
                </div>
              ` : `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" style="height: 44px; width: auto; margin: 0 auto 12px; display: block;" />
                    <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">TARJETA REGALO DE EXPERIENCIA</h1>
                  </div>

                  <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
                    <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Para</p>
                    <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${recipientName}</p>

                    ${buyerName ? `
                      <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">De parte de</p>
                      <p style="color: #ffffff; font-size: 15px; margin: 0 0 16px;">${buyerName}</p>
                    ` : ''}

                    ${giftMessage ? `
                      <div style="padding: 12px; background-color: #050505; border-left: 3px solid #c9a96e; font-style: italic; color: #cccccc; font-size: 13px; margin-bottom: 16px;">
                        &ldquo;${giftMessage}&rdquo;
                      </div>
                    ` : ''}

                    <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 16px;">
                      <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 8px;">${title}</p>
                      <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 4px;">📅 Fecha: ${date} • ⏱ Hora: ${time}</p>
                      <p style="color: #aaaaaa; font-size: 14px; margin: 0;">Plazas: ${resData.tickets} · The Church Tasting Room</p>
                    </div>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 14px; color: #cccccc;">Puedes reenviarle este comprobante a <strong>${recipientName}</strong>, o acceder a Mi Capilla para ver los detalles y el QR de acceso.</p>
                    <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 12px;">Acceder a Mi Capilla</a>
                  </div>

                  <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 30px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
                </div>
              `;
            } else {
              emailSubject = locale === 'en' ? `Booking Confirmed: ${title}` : `Tu reserva está confirmada — The Church Tasting Room`;

              html = locale === 'en' ? `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
                  <h2>Booking Confirmed</h2>
                  <p>Hi ${resData.profile.first_name || ''},</p>
                  <p>Your booking for <strong>${title}</strong> is confirmed.</p>
                  <ul>
                    <li><strong>Date:</strong> ${date}</li>
                    <li><strong>Time:</strong> ${time}</li>
                    <li><strong>Spots:</strong> ${resData.tickets}</li>
                    <li><strong>Amount paid:</strong> €${resData.total_amount}</li>
                  </ul>
                  <div style="margin: 30px 0; text-align: center;">
                    <p>Your access is in My Chapel.</p>
                    <p>My Chapel is your personal space at The Church Tasting Room. There you will find your personal QR code, upcoming experiences, and past tastings.</p>
                    <p>Your QR is personal and permanent: you will always use the same one for your experiences with us.</p>
                    <a href="${actionUrl}" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 10px;">Access My Chapel</a>
                  </div>
                  <p style="font-size: 12px; color: #666; text-align: center;">This access link is personal and will expire. You can always request a new one from the website.</p>
                </div>
              ` : `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
                  <h2>Tu reserva está confirmada</h2>
                  <p>Hola ${resData.profile.first_name || ''},</p>
                  <p>Tu reserva para <strong>${title}</strong> está confirmada.</p>
                  <ul>
                    <li><strong>Fecha:</strong> ${date}</li>
                    <li><strong>Hora:</strong> ${time}</li>
                    <li><strong>Plazas:</strong> ${resData.tickets}</li>
                    <li><strong>Importe pagado:</strong> €${resData.total_amount}</li>
                  </ul>
                  <div style="margin: 30px 0; text-align: center;">
                    <p style="font-size: 18px; font-weight: bold;">Tu acceso está en Mi Capilla</p>
                    <p>Mi Capilla es tu espacio personal en The Church Tasting Room. Allí encontrarás tu QR personal, tus próximas experiencias y el historial de las catas a las que hayas asistido.</p>
                    <p>Tu QR es personal y permanente: utilizarás siempre el mismo en tus experiencias con nosotros.</p>
                    <a href="${actionUrl}" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 10px;">Acceder a Mi Capilla</a>
                  </div>
                  <p style="font-size: 12px; color: #666; text-align: center;">Este enlace de acceso es personal y caducará. Siempre puedes solicitar uno nuevo desde la web.</p>
                </div>
              `;
            }

            await resend.emails.send({
              from: 'The Church Tasting Room <info@tastingroom.es>',
              to: resData.profile.email,
              subject: emailSubject,
              html: html
            });

            // If it's a gift and recipient email is provided, send directly to recipient too!
            const recipientEmail = session.metadata?.recipient_email;
            if (isGift && recipientEmail && recipientEmail.includes('@')) {
              try {
                await resend.emails.send({
                  from: 'The Church Tasting Room <info@tastingroom.es>',
                  to: recipientEmail,
                  subject: locale === 'en' 
                    ? `🎁 You received a Tasting Gift Voucher: ${title}!` 
                    : `🎁 ¡Tienes un regalo! Tarjeta de Experiencia: ${title}`,
                  html: html
                });
                console.log(`Direct gift voucher email sent to recipient ${recipientEmail}`);
              } catch (recipErr) {
                console.error('Error sending direct email to gift recipient:', recipErr);
              }
            }

            // Mark email as sent
            await supabaseAdmin
              .from('reservations')
              .update({ confirmation_email_sent_at: new Date().toISOString() })
              .eq('id', reservationId);
              
            console.log(`Confirmation email sent for reservation ${reservationId}`);
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the webhook if just the email fails
          }
        } else {
          console.log(`Email already sent or missing email for reservation ${reservationId}`);
        }
      }
      break;
      
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      const failedSession = event.data.object as Stripe.Checkout.Session;
      const failedReservationId = failedSession.metadata?.reservation_id;
      
      if (failedReservationId) {
        await supabaseAdmin
          .from('reservations')
          .update({
            status: 'EXPIRED',
            payment_status: 'ABANDONED',
            updated_at: new Date().toISOString()
          })
          .eq('id', failedReservationId)
          .eq('status', 'PENDING');
      }
      break;
  }

  return NextResponse.json({ received: true });
}
