import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-08-26.dahlia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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
    console.error(`Webhook signature verification failed: ${(err instanceof Error ? (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) : String(err)) : String(err))}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      if (reservationId) {
        // Mark reservation as CONFIRMED and PAID
        const { error } = await supabaseAdmin
          .from('reservations')
          .update({
            status: 'CONFIRMED',
            payment_status: 'PAID',
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString()
          })
          .eq('id', reservationId)
          // idempotency check: only update if not already CONFIRMED
          .neq('status', 'CONFIRMED'); 

        if (error) {
          console.error('Error updating reservation after successful checkout:', error);
          return NextResponse.json({ error: 'Failed to update reservation' }, { status: 500 });
        }
        
        console.log(`Reservation ${reservationId} confirmed successfully via webhook.`);
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
            status: 'CANCELLED',
            payment_status: 'FAILED',
            updated_at: new Date().toISOString()
          })
          .eq('id', failedReservationId)
          .eq('status', 'PENDING'); // only cancel if it's still pending
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
