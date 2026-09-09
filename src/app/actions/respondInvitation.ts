"use server";

import { createClient } from "@/lib/supabase/server";

export async function respondToInvitation(reservationId: string, action: 'ACCEPT' | 'REJECT') {
  const supabase = await createClient();
  
  const status = action === 'ACCEPT' ? 'CONFIRMED' : 'REJECTED';
  
  await supabase
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)
    .eq('reservation_type', 'INVITATION');
    
  return { success: true };
}
