import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const token = formData.get('token');
    const rating = formData.get('rating');
    const best_part = formData.get('best_part');

    if (!token || !rating) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Resolve token
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, tasting_id, profile_id')
      .eq('feedback_token', token)
      .single();

    if (!reservation) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const { error } = await supabase.from('feedback').insert([{
      tasting_id: reservation.tasting_id,
      reservation_id: reservation.id,
      profile_id: reservation.profile_id,
      rating: parseInt(rating as string, 10),
      best_part
    }]);

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate token so it can't be reused
    await supabase.from('reservations').update({ feedback_token: null }).eq('id', reservation.id);

    // Track feedback
    await import('@/app/actions/analytics').then(m => m.trackAnalyticsEvent({
      event_name: 'feedback_completed',
      tasting_id: reservation.tasting_id,
      profile_id: reservation.profile_id
    })).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}