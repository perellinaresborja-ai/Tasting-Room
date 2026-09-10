"use server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteReservation(id: string) {
  try {
    const { error } = await supabaseAdmin.from("reservations").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateReservation(id: string, data: any) {
  try {
    const { error } = await supabaseAdmin.from("reservations").update(data).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/reservations");
    revalidatePath(`/admin/reservations/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resendConfirmationEmail(id: string) {
  try {
    const { data: res, error } = await supabaseAdmin
      .from('reservations')
      .select('*, profile:profiles(email, first_name), tasting:tastings(title_es, date)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!res || !res.profile || !res.profile.email) throw new Error("No hay email valido");

    let appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es';
    if (appUrl.includes('://tastingroom.es')) {
      appUrl = appUrl.replace('://tastingroom.es', '://www.tastingroom.es');
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: res.profile.email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/es/member`
      }
    });

    if (linkError) throw linkError;

    const actionUrl = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/es/member`;
    const title = res.tasting?.title_es || 'The Church Tasting Room';
    
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
    
    await resend.emails.send({
      from: 'The Church Tasting Room <reservas@tastingroom.es>',
      to: res.profile.email,
      subject: `Confirmación de Reserva: ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
          <h2>Reserva Confirmada</h2>
          <p>Hola ${res.profile.first_name || ''},</p>
          <p>Adjuntamos el enlace para acceder a tu reserva.</p>
          <div style="margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">ACCEDER A MI CAPILLA</a>
          </div>
          <p style="font-size: 12px; color: #666;">Al acceder podrás ver tu código QR necesario para entrar.</p>
        </div>
      `
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
