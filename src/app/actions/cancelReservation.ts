"use server";

import { requireAdmin } from '@/lib/supabase/adminAuth';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function cancelReservationAction(reservationId: string) {
  try {
    const { profile } = await requireAdmin('es');
    if (!profile) return { success: false, error: 'No autorizado' };

    // Mark as cancelled bypassing RLS since admin already checked
    const { error } = await supabaseAdmin
      .from('reservations')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/reservations', 'page');
    revalidatePath('/admin/tastings', 'page');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido' };
  }
}
