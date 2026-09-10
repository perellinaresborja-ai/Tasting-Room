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
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (reservationId) {
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
            const locale = session.metadata?.locale || "es"; // just fallback
            const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastingroom.es';
            const title = resData.tasting?.title_es || 'The Church Tasting Room';
            const date = resData.tasting?.date;
            const time = resData.tasting?.start_time;

            const html = locale === 'en' ? `
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
                    <a href="${appUrl}/en/member" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 10px;">Access My Chapel</a>
                  </div>
                  <p style="font-size: 12px; color: #666; text-align: center;">You don't need a password. Enter the same email used for the booking to receive your access link.</p>
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
                    <a href="${appUrl}/es/member" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 10px;">Acceder a Mi Capilla</a>
                  </div>
                  <p style="font-size: 12px; color: #666; text-align: center;">No necesitas contraseña. Introduce el mismo email utilizado en la reserva y recibirás tu enlace de acceso.</p>
                </div>
              `;

            await resend.emails.send({
              from: 'The Church Tasting Room <reservas@tastingroom.es>',
              to: resData.profile.email,
              subject: locale === 'en' ? `Booking Confirmed: ${title}` : `Tu reserva está confirmada — The Church Tasting Room`,
              html: html
            });

            // Mark email as sent
            await supabaseAdmin
              .from('reservations')
              .update({ confirmation_email_sent_at: new Date().toISOString() })
              .eq('id', reservationId);
              
            console.log(`Confirmation email sent for reservation ${reservationId}`);
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the webhook if just the email fails, Stripe shouldn't retry just for email
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
