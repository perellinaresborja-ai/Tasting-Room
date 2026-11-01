"use server";

import { requireAdmin } from '@/lib/supabase/adminAuth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function processScan(token: string, tastingId: string) {
  // Only admins/staff can process scans
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return { status: 'NO AUTORIZADO' };

  // 1. Get profile by public_token (permanent QR of the client)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name, phone')
    .eq('public_token', token)
    .single();

  if (profileError || !profile) {
    return { status: 'QR NO VÁLIDO', message: 'No se ha encontrado a ningún usuario con este código QR.' };
  }

  // 2. Fetch all reservations for this client and tasting
  const { data: reservations, error: resError } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('tasting_id', tastingId)
    .order('created_at', { ascending: true });

  if (resError || !reservations || reservations.length === 0) {
    return { status: 'SIN RESERVA', message: 'No hay reserva para esta cata.', profile };
  }

  // 3. Fetch checkin logs if table exists
  let checkinLogs: any[] = [];
  try {
    const resIds = reservations.map(r => r.id);
    const { data: logs } = await supabaseAdmin
      .from('reservation_checkins')
      .select('id, reservation_id, tickets, created_at, staff:profiles(first_name, last_name)')
      .in('reservation_id', resIds)
      .order('created_at', { ascending: false });
    if (logs) checkinLogs = logs;
  } catch (e) {
    // Graceful fallback if table is not yet migrated
  }

  // 4. Enrich reservations with calculated partial check-in data
  const enrichedReservations = reservations.map(r => {
    const totalTickets = Number(r.tickets) || 0;
    const usedTickets = typeof r.checked_in_tickets === 'number'
      ? r.checked_in_tickets
      : (r.check_in_time ? totalTickets : 0);
    const availableTickets = Math.max(0, totalTickets - usedTickets);
    const logs = checkinLogs.filter(l => l.reservation_id === r.id);

    return {
      ...r,
      totalTickets,
      usedTickets,
      availableTickets,
      isFullyCheckedIn: availableTickets === 0,
      checkinLogs: logs
    };
  });

  // Filter out cancelled or rejected
  const validReservations = enrichedReservations.filter(
    r => r.status !== 'CANCELLED' && r.status !== 'REJECTED' && r.payment_status !== 'FAILED' && r.payment_status !== 'REFUNDED'
  );

  if (validReservations.length === 0) {
    return { 
      status: 'RESERVA CANCELADA', 
      profile, 
      reservations: enrichedReservations,
      reservation: enrichedReservations[0] 
    };
  }

  // Check pending payment
  const unpaid = validReservations.find(r => r.reservation_type !== 'INVITATION' && r.payment_status !== 'PAID' && r.payment_status !== 'NOT_REQUIRED');
  if (unpaid) {
    return { 
      status: 'PAGO PENDIENTE', 
      profile, 
      reservations: enrichedReservations,
      reservation: unpaid 
    };
  }

  // Check pending invitation
  const pendingInv = validReservations.find(r => r.reservation_type === 'INVITATION' && r.status === 'PENDING');
  if (pendingInv) {
    return { 
      status: 'INVITACIÓN PENDIENTE', 
      profile, 
      reservations: enrichedReservations,
      reservation: pendingInv 
    };
  }

  // Find first reservation with available spots
  const pendingReservation = validReservations.find(r => r.availableTickets > 0);

  if (!pendingReservation) {
    // All tickets across all reservations have been used
    const lastCheckin = checkinLogs[0]?.created_at || validReservations[0]?.check_in_time;
    return {
      status: 'YA VALIDADO',
      profile,
      reservations: enrichedReservations,
      reservation: validReservations[0],
      checkInTime: lastCheckin,
      message: 'Todas las plazas de este cliente ya han sido validadas.'
    };
  }

  return {
    status: 'VÁLIDO',
    profile,
    reservations: enrichedReservations,
    reservation: pendingReservation,
    availableTickets: pendingReservation.availableTickets,
    totalTickets: pendingReservation.totalTickets,
    usedTickets: pendingReservation.usedTickets
  };
}

export async function validateAccess(reservationId: string, ticketsToValidate: number = 1) {
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return { success: false, error: 'NO AUTORIZADO' };

  const qty = Math.max(1, Math.floor(Number(ticketsToValidate) || 1));

  // Single exclusive validation path: atomic transactional RPC with FOR UPDATE locking
  const { data: rpcRes, error: rpcError } = await supabaseAdmin.rpc('record_partial_checkin', {
    p_reservation_id: reservationId,
    p_tickets: qty,
    p_staff_profile_id: staffProfile.id
  });

  if (rpcError) {
    console.error('RPC record_partial_checkin error:', rpcError);
    return { success: false, error: rpcError.message || 'Error en la validación atómica' };
  }

  if (!rpcRes || !rpcRes.success) {
    return { success: false, error: rpcRes?.error || 'Error al validar acceso' };
  }

  // Track analytics
  await import('./analytics').then(m => m.trackAnalyticsEvent({
    event_name: 'check_in',
    tasting_id: rpcRes.tasting_id,
    profile_id: staffProfile.id
  })).catch(() => {});

  return {
    success: true,
    ticketsValidated: qty,
    remaining: rpcRes.restantes,
    totalUsed: rpcRes.total_usados,
    totalTickets: rpcRes.tickets_comprados,
    checkInTime: new Date().toISOString()
  };
}

export async function searchReservations(query: string, tastingId: string) {
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return [];

  // Search profiles matching query
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name, phone')
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p: any) => p.id);

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('*, customer:profiles(first_name, last_name, email, phone)')
    .eq('tasting_id', tastingId)
    .in('profile_id', profileIds)
    .order('created_at', { ascending: true });

  if (!reservations) return [];

  return reservations.map((r: any) => {
    const totalTickets = Number(r.tickets) || 0;
    const usedTickets = typeof r.checked_in_tickets === 'number'
      ? r.checked_in_tickets
      : (r.check_in_time ? totalTickets : 0);
    const availableTickets = Math.max(0, totalTickets - usedTickets);

    return {
      ...r,
      totalTickets,
      usedTickets,
      availableTickets
    };
  });
}
