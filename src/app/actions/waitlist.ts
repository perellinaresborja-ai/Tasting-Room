"use server";
import { createClient } from '@/lib/supabase/server';

export async function joinWaitlist(formData: FormData) {
  try {
    const supabase = await createClient();
    
    const tastingId = formData.get('tasting_id') as string;
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    
    if (!tastingId || !email || !name) {
      return { success: false, error: 'Faltan campos obligatorios' };
    }
    
    // 1. Get or create profile
    let profileId;
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();
      
    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert([{ email, first_name: name, phone }])
        .select()
        .single();
        
      if (profileError) return { success: false, error: 'Error al registrar el perfil' };
      profileId = newProfile.id;
    }
    
    // 2. Check if already in waitlist
    const { data: existingWaitlist } = await supabase
      .from('waitlist')
      .select('id')
      .eq('tasting_id', tastingId)
      .eq('profile_id', profileId)
      .single();
      
    if (existingWaitlist) {
      return { success: false, error: 'Ya estabas en la lista de espera' };
    }
    
    // 3. Add to waitlist
    const { error: waitlistError } = await supabase
      .from('waitlist')
      .insert([{ tasting_id: tastingId, profile_id: profileId }]);
      
    if (waitlistError) {
      return { success: false, error: 'Error al unirse a la lista de espera' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error inesperado' };
  }
}
