"use server";

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

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
      .select('id, first_name')
      .eq('email', emailNormalized)
      .single();

    if (!profile) {
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

    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es';
    if (siteUrl.includes('://tastingroom.es')) {
      siteUrl = siteUrl.replace('://tastingroom.es', '://www.tastingroom.es');
    }
    
    // 2. Generate magic link using admin API (skips PKCE)
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailNormalized,
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/${locale}/member`
      }
    });

    if (error) {
      console.error('Magic Link Generate Error:', {
        status: error.status,
        message: error.message
      });
      return { success: false, code: 'AUTH_ERROR', rateLimit: error.status === 429 };
    }

    if (linkData?.properties?.hashed_token) {
      const actionUrl = `${siteUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/${locale}/member`;
      
      const html = locale === 'en' ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
            <h2>Access My Chapel</h2>
            <p>Hi ${profile.first_name || ''},</p>
            <p>Click the button below to securely access My Chapel.</p>
            <div style="margin: 30px 0;">
              <a href="${actionUrl}" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">ACCESS MY CHAPEL</a>
            </div>
            <p style="font-size: 12px; color: #666;">This link is personal and will expire.</p>
          </div>
        ` : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
            <h2>Accede a Mi Capilla</h2>
            <p>Hola ${profile.first_name || ''},</p>
            <p>Pulsa el botón para acceder de forma segura a Mi Capilla.</p>
            <div style="margin: 30px 0;">
              <a href="${actionUrl}" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">ACCEDER A MI CAPILLA</a>
            </div>
            <p style="font-size: 12px; color: #666;">Este enlace es personal y caducará.</p>
          </div>
        `;

      await resend.emails.send({
        from: 'The Church Tasting Room <info@tastingroom.es>',
        to: emailNormalized,
        subject: locale === 'en' ? 'Access My Chapel' : 'Accede a Mi Capilla',
        html: html
      });
    }

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
