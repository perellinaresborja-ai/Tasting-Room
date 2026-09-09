"use server";

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/adminAuth';

const supabaseAdmin = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function processScan(token: string, tastingId: string) {
  // Only admins/staff can process scans
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return { status: 'NO AUTORIZADO' };

  // 1. Get profile by public_token (use admin to read any profile)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name, phone')
    .eq('public_token', token)
    .single();

  if (profileError || !profile) {
    return { status: 'QR NO VÁLIDO', message: 'No se ha encontrado a ningún usuario con este código QR.' };
  }

  // 3. Check reservation for this tasting
  const { data: reservation, error: resError } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('tasting_id', tastingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (resError || !reservation) {
    return { status: 'SIN RESERVA', message: `No hay reserva para esta cata.`, profile: profile };
  }

  // 4. Check Status
  if (reservation.status === 'CANCELLED' || reservation.status === 'REJECTED' || reservation.payment_status === 'FAILED' || reservation.payment_status === 'REFUNDED') {
    return { status: 'RESERVA CANCELADA', reservation, profile: profile };
  }

  if (reservation.reservation_type === 'INVITATION') {
    if (reservation.status === 'PENDING') {
      return { status: 'INVITACIÓN PENDIENTE', reservation, profile: profile };
    }
  } else if (reservation.payment_status !== 'PAID') {
    return { status: 'PAGO PENDIENTE', reservation, profile: profile };
  }

  if (reservation.check_in_time) {
    return { status: 'YA VALIDADO', reservation, profile: profile, checkInTime: reservation.check_in_time };
  }

  return { status: 'VÁLIDO', reservation, profile: profile };
}

export async function validateAccess(reservationId: string) {
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return { success: false, error: 'NO AUTORIZADO' };

  // Validate the reservation by setting check_in_time
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ check_in_time: new Date().toISOString() })
    .eq('id', reservationId)
    .is('check_in_time', null) // Idempotent check
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: 'No se ha podido validar o ya estaba validado.' };
  }

  return { success: true, checkInTime: data.check_in_time };
}

export async function searchReservations(query: string, tastingId: string) {
  const { profile: staffProfile } = await requireAdmin('es');
  if (!staffProfile) return [];
  
  // Search profiles matching query
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);
    
  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p: any) => p.id);

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('*, profile:profiles(first_name, last_name, email, phone)')
    .eq('tasting_id', tastingId)
    .in('profile_id', profileIds);

  return reservations || [];
}
