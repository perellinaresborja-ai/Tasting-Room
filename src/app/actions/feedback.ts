"use server";

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/supabase/adminAuth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

export async function sendFeedbackEmailsAction(tastingId: string) {
  try {
    const { profile: adminProfile } = await requireAdmin('es');
    if (!adminProfile) return { success: false, error: 'No autorizado' };

    const supabase = await createClient();
    
    // Get all REAL attendees (checked in) for this tasting
    const { data: attendees, error } = await supabase
      .from('reservations')
      .select('id, feedback_token, profile:profiles(email, first_name), tasting:tastings(title_es)')
      .eq('tasting_id', tastingId)
      .eq('status', 'CONFIRMED')
      .not('check_in_time', 'is', null);

    if (error || !attendees) return { success: false, error: 'Error al obtener asistentes con check-in' };

    let sent = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastingroom.es';

    for (const res of attendees) {
      const profile = res.profile as any;
      const tasting = res.tasting as any;
      if (profile?.email) {
        
        let token = res.feedback_token;
        if (!token) {
          token = crypto.randomUUID();
          await supabase.from('reservations').update({ feedback_token: token }).eq('id', res.id);
        }

        const title = tasting?.title_es || 'nuestra cata';
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #c9a96e;">The Church Tasting Room</h1>
            <h2>¡Gracias por asistir!</h2>
            <p>Hola ${profile.first_name || ''},</p>
            <p>Esperamos que hayas disfrutado de <strong>${title}</strong>.</p>
            <p>Nos encantaría conocer tu opinión para seguir mejorando. Por favor, dedica un minuto a valorar tu experiencia:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${siteUrl}/es/feedback?token=${token}" style="background-color: #c9a96e; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Valorar Cata</a>
            </div>
            <p>¡Gracias y hasta pronto!</p>
          </div>
        `;

        try {
          await resend.emails.send({
            from: 'The Church Tasting Room <feedback@tastingroom.es>',
            to: profile.email,
            subject: `Tu opinión sobre ${title}`,
            html: html
          });
          sent++;
        } catch (e) {
          console.error('Error sending feedback email:', e);
        }
      }
    }

    return { success: true, sent };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error desconocido' };
  }
}
