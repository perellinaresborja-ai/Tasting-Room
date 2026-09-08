"use server";

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function ensureProfile(userId: string, email: string) {
  try {
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!profile) {
      const publicToken = 'user-' + Math.random().toString(36).substring(2, 10);
      
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          public_token: publicToken,
          role: 'CUSTOMER'
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      profile = newProfile;
    }
    
    return { success: true, profile };
  } catch (error: any) {
    console.error('Error ensuring profile:', error);
    return { success: false, error: error.message };
  }
}
