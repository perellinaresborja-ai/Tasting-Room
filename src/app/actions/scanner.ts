"use server";

import { createClient } from '@/lib/supabase/server';

export async function processScan(token: string, tastingId: string) {
  const supabase = await createClient();

  // 1. Get profile by public_token
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('public_token', token)
    .single();

  if (profileError || !profile) {
    return { status: 'QR NO VÁLIDO', message: 'No se ha encontrado a ningún usuario con este código QR.' };
  }

  // 2. Get customer by email
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email')
    .eq('email', profile.email)
    .single();

  if (customerError || !customer) {
    return { status: 'SIN RESERVA', message: `Usuario ${profile.first_name} no tiene reservas.`, customer: profile };
  }

  // 3. Check reservation for this tasting
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .select('*')
    .eq('customer_id', customer.id)
    .eq('tasting_id', tastingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (resError || !reservation) {
    return { status: 'SIN RESERVA', message: `No hay reserva para esta cata.`, customer };
  }

  // 4. Check Status
  if (reservation.status === 'CANCELLED' || reservation.payment_status === 'FAILED' || reservation.payment_status === 'REFUNDED') {
    return { status: 'RESERVA CANCELADA', reservation, customer };
  }

  if (reservation.payment_status !== 'PAID' && reservation.status === 'PENDING') {
    return { status: 'PAGO PENDIENTE', reservation, customer };
  }

  if (reservation.check_in_time) {
    return { status: 'YA VALIDADO', reservation, customer, checkInTime: reservation.check_in_time };
  }

  return { status: 'VÁLIDO', reservation, customer };
}

export async function validateAccess(reservationId: string) {
  const supabase = await createClient();

  // Validate the reservation by setting check_in_time
  const { data, error } = await supabase
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
  const supabase = await createClient();
  
  // Search customers matching query
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`);
    
  if (!customers || customers.length === 0) return [];

  const customerIds = customers.map(c => c.id);

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, customer:customers(first_name, last_name, email, phone)')
    .eq('tasting_id', tastingId)
    .in('customer_id', customerIds);

  return reservations || [];
}
