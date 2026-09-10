"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function requestMagicLink(email: string, locale: string) {
  try {
    const emailNormalized = email.toLowerCase().trim();
    
    // 1. Validar que el email corresponde a un profile existente con al menos una reserva CONFIRMED
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', emailNormalized)
      .single();

    if (!profile) {
      // Retornar error limpio para no revelar informaciÃ³n o simplemente ocultarlo
      // Pero como debe ser transparente al frontal segun requerimiento:
      return { success: false, code: 'NOT_FOUND' };
    }

    const { data: reservations } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('status', 'CONFIRMED')
      .limit(1);

    if (!reservations || reservations.length === 0) {
      return { success: false, code: 'NOT_CLIENT' };
    }

    // 2. Solicitar OTP/Magic Link
    // 3. Usar NEXT_PUBLIC_SITE_URL estrictamente
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastingroom.es';
    
    // Para evitar que en local estalle si no existe
    const redirectUrl = `${siteUrl}/auth/callback?next=/${locale}/member`;

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email: emailNormalized,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true // Mantenemos true para que Auth lo genere, ya comprobamos la existencia del profile
      }
    });

    if (error) {
      // 4. Loguear server-side: status, code, message
      console.error('Magic Link Auth Error:', {
        status: error.status,
        code: error.code,
        message: error.message
      });
      return { success: false, code: 'AUTH_ERROR', rateLimit: error.status === 429 };
    }

    // 5. Devolver Ãºnicamente Ã©xito
    return { success: true };
  } catch (err: unknown) {
    console.error('requestMagicLink unexpected error:', err);
    return { success: false, code: 'SERVER_ERROR' };
  }
}

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
