import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function evaluateAlerts(locale: string = 'es') {
  // 1. Get all published tastings with capacity info
  const { data: tastings } = await supabaseAdmin
    .from('tastings')
    .select('id, title_es, title_en, date, time, capacity, created_at, status')
    .eq('status', 'PUBLISHED');

  if (!tastings || tastings.length === 0) return;

  const tastingIds = tastings.map(t => t.id);

  // Get available spots safely
  const { data: capacities } = await supabaseAdmin
    .from('public_tasting_capacity')
    .select('tasting_id, available_spots')
    .in('tasting_id', tastingIds);
    
  const capMap = new Map();
  capacities?.forEach(c => capMap.set(c.tasting_id, c.available_spots));

  // Get Waitlist
  const { data: waitlist } = await supabaseAdmin
    .from('waitlist')
    .select('tasting_id')
    .in('tasting_id', tastingIds);
  const waitlistMap = new Map();
  if (waitlist) {
    waitlist.forEach(w => {
      waitlistMap.set(w.tasting_id, (waitlistMap.get(w.tasting_id) || 0) + 1);
    });
  }

  // 2. Get reservations for these tastings
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id, tasting_id, status, tickets, total_amount, created_at')
    .in('tasting_id', tastingIds);

  const safeReservations = reservations || [];

  // 3. Get currently active alerts
  const { data: activeAlerts } = await supabaseAdmin
    .from('commercial_alerts')
    .select('id, tasting_id, alert_type, status')
    .eq('status', 'PENDING');

  const alertsMap = new Map();
  if (activeAlerts) {
    activeAlerts.forEach(a => {
      alertsMap.set(`${a.tasting_id}_${a.alert_type}`, a);
    });
  }

  const now = Date.now();
  const ops = [];

  for (const tasting of tastings) {
    const tRes = safeReservations.filter(r => r.tasting_id === tasting.id);
    const confirmed = tRes.filter(r => r.status === 'CONFIRMED');
    const abandonments = tRes.filter(r => r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && new Date(r.created_at).getTime() < now - 15 * 60 * 1000));
    
    const capacity = tasting.capacity;
    const availableSpots = capMap.has(tasting.id) ? capMap.get(tasting.id) : capacity;
    const soldTickets = confirmed.reduce((sum, r) => sum + (r.tickets || 0), 0);
    const abandonedTickets = abandonments.reduce((sum, r) => sum + (r.tickets || 0), 0);
    const abandonedValue = abandonments.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    const occupancyPct = capacity > 0 ? (soldTickets / capacity) * 100 : 0;
    
    const tastingDate = new Date(`${tasting.date}T${tasting.time}`);
    const daysToTasting = (tastingDate.getTime() - now) / (1000 * 60 * 60 * 24);
    const daysSinceCreated = (now - new Date(tasting.created_at).getTime()) / (1000 * 60 * 60 * 24);

    const titleStr = locale === 'en' ? tasting.title_en : tasting.title_es;

    // RULE A: FEW_SPOTS
    const ruleFewSpots = availableSpots <= 5 && availableSpots > 0;
    ops.push(buildAlertOp(tasting.id, 'FEW_SPOTS', ruleFewSpots, alertsMap, {
      title: 'Últimas plazas',
      description: `Quedan ${availableSpots} plazas para ${titleStr} (${tasting.date}).`,
      action_text: 'PREPARAR COMUNICACIÓN',
      action_url: `/admin/communications?tastingId=${tasting.id}&segment=all`
    }));

    // RULE B: SLOW_SALES
    const ruleSlowSales = daysToTasting <= 7 && daysToTasting >= 0 && occupancyPct < 30;
    ops.push(buildAlertOp(tasting.id, 'SLOW_SALES', ruleSlowSales, alertsMap, {
      title: 'Venta lenta',
      description: `A ${Math.floor(daysToTasting)} días, ocupación del ${Math.round(occupancyPct)}% (${soldTickets}/${capacity} plazas).`,
      action_text: 'PREPARAR COMUNICACIÓN',
      action_url: `/admin/communications?tastingId=${tasting.id}&segment=all`
    }));

    // RULE C: FAST_SALES
    const ruleFastSales = daysSinceCreated <= 3 && occupancyPct >= 60;
    ops.push(buildAlertOp(tasting.id, 'FAST_SALES', ruleFastSales, alertsMap, {
      title: 'Alta demanda',
      description: `Ocupación del ${Math.round(occupancyPct)}% en menos de 3 días desde su publicación.`,
      action_text: 'VER EXPERIENCIA',
      action_url: `/admin/tastings/${tasting.id}`
    }));

    // RULE D: HIGH_ABANDONMENT
    const ruleHighAbandonment = abandonments.length >= 3;
    ops.push(buildAlertOp(tasting.id, 'HIGH_ABANDONMENT', ruleHighAbandonment, alertsMap, {
      title: 'Abandono alto en Checkout',
      description: `${abandonments.length} intentos abandonados (${abandonedTickets} plazas potenciales, ~€${abandonedValue.toFixed(2)}).`,
      action_text: 'VER INTERESADOS',
      action_url: `/admin/tastings/${tasting.id}/attendees`
    }));

    // RULE E: OVER_DEMAND
    const wCount = waitlistMap.get(tasting.id) || 0;
    const totalDemanded = soldTickets + abandonedTickets + wCount;
    const ruleOverDemand = totalDemanded > capacity && capacity > 0;
    ops.push(buildAlertOp(tasting.id, 'OVER_DEMAND', ruleOverDemand, alertsMap, {
      title: 'Demanda superior al aforo',
      description: `La demanda observada (${totalDemanded} plazas) supera la capacidad de la cata.`,
      action_text: 'VALORAR REPETIR',
      action_url: `/admin/tastings/${tasting.id}`
    }));
  }

  // Execute ops
  for (const op of ops) {
    if (!op) continue;
    if (op.action === 'INSERT' && op.data) {
      await supabaseAdmin.from('commercial_alerts').insert(op.data as any);
    } else if (op.action === 'RESOLVE') {
      await supabaseAdmin.from('commercial_alerts').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', op.id);
    }
  }
}

function buildAlertOp(tastingId: string, alertType: string, isTriggered: boolean, alertsMap: Map<string, any>, payload: any) {
  const key = `${tastingId}_${alertType}`;
  const existing = alertsMap.get(key);

  if (isTriggered && !existing) {
    return {
      action: 'INSERT',
      data: {
        tasting_id: tastingId,
        alert_type: alertType,
        title: payload.title,
        description: payload.description,
        action_text: payload.action_text,
        action_url: payload.action_url,
        status: 'PENDING'
      }
    };
  } else if (!isTriggered && existing) {
    return {
      action: 'RESOLVE',
      id: existing.id
    };
  }
  return null;
}
