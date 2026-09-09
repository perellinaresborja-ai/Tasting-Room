import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy", {
  apiVersion: '2026-08-26.dahlia',
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy"
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }  
  catch (err: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
    console.error("Webhook signature verification failed.", (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) : String(err)) : String(err)));
    return NextResponse.json({ error: (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) : String(err)) : String(err)) }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Fulfill the reservation
    const reservationId = session.metadata?.reservationId;
    if (reservationId) {
      await supabase
        .from("reservations")
        .update({ status: "CONFIRMED", stripe_payment_intent: session.payment_intent as string })
        .eq("id", reservationId);
    }
  }

  return NextResponse.json({ received: true });
}
