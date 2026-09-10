"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function checkIfEmailExists(email: string) {
  const emailNormalized = email.toLowerCase().trim();
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', emailNormalized)
    .single();

  if (!profile) {
    return { success: true, exists: false };
  }

  // Comprobar que realmente es un CLIENTE (tiene al menos una reserva CONFIRMED)
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('status', 'CONFIRMED')
    .limit(1);

  if (!reservations || reservations.length === 0) {
    return { success: true, exists: false }; // Ocultamos la existencia si no es cliente
  }

  return { success: true, exists: true };
}

export async function getMemberData(authUserId: string, email: string) {
  try {
    const emailNormalized = email.toLowerCase().trim();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', emailNormalized)
      .single();

    if (!profile) {
      return { success: false, error: 'No profile found' };
    }

    if (!profile.auth_user_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ auth_user_id: authUserId })
        .eq('id', profile.id);
      profile.auth_user_id = authUserId;
    } else if (profile.auth_user_id !== authUserId) {
      return { success: false, error: 'Auth user mismatch' };
    }

    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('*, tasting:tastings(*)')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    const isClient = reservations?.some(r => r.status === 'CONFIRMED');

    return { success: true, profile, reservations, isClient };
  } catch (err: unknown) {
    console.error('getMemberData error', err);
    return { success: false, error: (err instanceof Error ? err.message : String(err)) };
  }
}
