"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function checkExistingProfile(email: string, phone: string) {
  const supabase = await createClient();
  let query = supabase.from('profiles').select('*');
  
  if (email && phone) {
    query = query.or(`email.eq.${email},phone.eq.${phone}`);
  } else if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    query = query.eq('phone', phone);
  } else {
    return { profile: null };
  }

  const { data } = await query.limit(1).single();
  return { profile: data || null };
}

export async function createInvitationAction(formData: FormData) {
  const tastingId = formData.get('tasting_id') as string;
  const firstName = formData.get('first_name') as string;
  const lastName = formData.get('last_name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const tickets = parseInt(formData.get('tickets') as string, 10);
  const profileId = formData.get('profile_id') as string;

  if (!tastingId || !firstName || !lastName || !tickets) {
    return { success: false, error: 'Faltan campos obligatorios' };
  }

  const supabase = await createClient();
  let targetProfileId = profileId;

  // Verify capacity
  const { data: tasting } = await supabase.from('tastings').select('capacity').eq('id', tastingId).single();
  const { data: reservations } = await supabase.from('reservations').select('tickets').eq('tasting_id', tastingId).neq('status', 'CANCELLED');
  const reserved = reservations?.reduce((acc, r) => acc + (r.tickets || 0), 0) || 0;
  
  if (tasting && tasting.capacity < reserved + tickets) {
    return { success: false, error: 'No hay suficientes plazas disponibles.' };
  }

  // If no existing profile, create one
  if (!targetProfileId) {
    const { data: newProfile, error: profileErr } = await supabase
      .from('profiles')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email || `${crypto.randomUUID()}@placeholder.tastingroom.es`,
        phone: phone || null,
        role: 'CUSTOMER',
        public_token: crypto.randomUUID()
      })
      .select('id')
      .single();

    if (profileErr || !newProfile) {
      return { success: false, error: 'Error creando el perfil del invitado.' };
    }
    targetProfileId = newProfile.id;
  }

  // Create the invitation reservation
  const invitationToken = crypto.randomUUID();
  
  const { error: resErr } = await supabase
    .from('reservations')
    .insert({
      tasting_id: tastingId,
      profile_id: targetProfileId,
      tickets: tickets,
      total_amount: 0,
      status: 'PENDING',
      payment_status: 'NOT_REQUIRED',
      reservation_type: 'INVITATION',
      invitation_token: invitationToken
    });

  if (resErr) {
    return { success: false, error: resErr.message };
  }

  revalidatePath('/admin/tastings/[id]/invitations', 'page');
  return { success: true };
}
