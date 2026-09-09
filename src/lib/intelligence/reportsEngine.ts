import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateTastingReport(tastingId: string) {
  // 1. Get the tasting
  const { data: tasting } = await supabaseAdmin
    .from('tastings')
    .select('*')
    .eq('id', tastingId)
    .single();

  if (!tasting || tasting.status !== 'COMPLETED') return;

  // 2. Check if a report already exists
  const { data: existingReport } = await supabaseAdmin
    .from('tasting_reports')
    .select('id')
    .eq('tasting_id', tastingId)
    .single();

  // 3. Get all reservations for this tasting
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('tasting_id', tastingId);

  const safeReservations = reservations || [];
  const confirmed = safeReservations.filter(r => r.status === 'CONFIRMED');
  const abandonments = safeReservations.filter(r => r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000));
  
  const ticketsSold = confirmed.reduce((sum, r) => sum + (r.tickets || 0), 0);
  const revenue = confirmed.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const capacity = tasting.capacity || 0;
  const occupancyPct = capacity > 0 ? (ticketsSold / capacity) * 100 : 0;
  const checkIns = confirmed.filter(r => r.check_in_time !== null).reduce((sum, r) => sum + (r.tickets || 0), 0);
  const noShows = ticketsSold - checkIns;

  // Get waitlist
  const { data: waitlist } = await supabaseAdmin
    .from('waitlist')
    .select('*')
    .eq('tasting_id', tastingId);
  const waitlistCount = waitlist ? waitlist.length : 0;

  const abandonedTickets = abandonments.reduce((sum, r) => sum + (r.tickets || 0), 0);
  const totalObservedDemand = ticketsSold + abandonedTickets + waitlistCount;
  const unmetDemand = Math.max(0, totalObservedDemand - capacity);

  // 4. Get Feedback
  const { data: feedbackData } = await supabaseAdmin
    .from('feedback')
    .select('rating')
    .eq('tasting_id', tastingId);

  let avgRating = null;
  let ratingCount = 0;
  if (feedbackData && feedbackData.length > 0) {
    ratingCount = feedbackData.length;
    avgRating = feedbackData.reduce((sum, f) => sum + f.rating, 0) / ratingCount;
  }

  // 5. Get Analytics (channels) crossing checkout_started and payment_completed
  const { data: analyticsData } = await supabaseAdmin
    .from('analytics_events')
    .select('event_name, session_id, utm_source')
    .eq('tasting_id', tastingId)
    .not('session_id', 'is', null);

  let topChannel = 'Sin datos';
  let topChannelConversions = 0;
  if (analyticsData && analyticsData.length > 0) {
    const paymentSessions = new Set(
      analyticsData.filter(a => a.event_name === 'payment_completed').map(a => a.session_id)
    );
    
    // Only count checkouts that actually converted
    const conversions = analyticsData.filter(a => 
      a.event_name === 'checkout_started' && 
      paymentSessions.has(a.session_id) && 
      a.utm_source
    );

    const channelCounts = new Map<string, number>();
    conversions.forEach(a => {
      channelCounts.set(a.utm_source!, (channelCounts.get(a.utm_source!) || 0) + 1);
    });

    if (channelCounts.size > 0) {
       const top = [...channelCounts.entries()].reduce((a, e) => e[1] > a[1] ? e : a);
       topChannel = top[0];
       topChannelConversions = top[1];
    }
  }

  // Build metrics payload
  const metrics = {
    title: tasting.title_es,
    date: tasting.date,
    category: tasting.category || 'Sin categoría',
    price: tasting.price,
    capacity: capacity,
    tickets_sold: ticketsSold,
    occupancy_pct: occupancyPct,
    revenue: revenue,
    check_ins: checkIns,
    no_shows: noShows,
    abandoned_tickets: abandonedTickets,
    unmet_demand: unmetDemand,
    avg_rating: avgRating,
    rating_count: ratingCount,
    top_channel: topChannel,
    top_channel_conversions: topChannelConversions,
    computed_at: new Date().toISOString()
  };

  if (existingReport) {
    // Update existing report
    await supabaseAdmin
      .from('tasting_reports')
      .update({ metrics })
      .eq('id', existingReport.id);
  } else {
    // Insert new report
    await supabaseAdmin
      .from('tasting_reports')
      .insert({
        tasting_id: tastingId,
        metrics: metrics
      });
  }
}
