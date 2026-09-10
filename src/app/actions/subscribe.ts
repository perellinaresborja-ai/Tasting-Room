"use server";

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
// Used strictly server-side to bypass RLS safely
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function subscribeAction(formData: FormData) {
  if (supabaseUrl === "https://dummy.supabase.co") {
    return { success: false, error: "not_configured" };
  }

  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;
  const language = formData.get("locale") as string || "es";
  const consent_email = formData.get("consent_email") === "on";
  const consent_wa = formData.get("consent_wa") === "on";

  if (!email || (!consent_email && !consent_wa) || (consent_wa && !phone)) {
    return { success: false, error: "invalid" };
  }

  let isNewSubscriber = false;

  try {
    // 1. Check if subscriber exists
    const { data: existing } = await supabaseAdmin
      .from("subscribers")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      // 2. Update existing subscriber
      const { error: updateError } = await supabaseAdmin
        .from("subscribers")
        .update({
          ...(phone ? { phone } : {}), // Update phone only if provided
          language,
          consent_email,
          consent_wa,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating subscriber:", updateError);
        return { success: false, error: "db_error" };
      }
    } else {
      // 3. Insert new subscriber
      const { error: insertError } = await supabaseAdmin
        .from("subscribers")
        .insert({
          email,
          name: null, // explicitly null per new schema rules
          phone,
          language,
          consent_email,
          consent_wa,
        });

      if (insertError) {
        console.error("Error inserting subscriber:", insertError);
        return { success: false, error: "db_error" };
      }
      
      isNewSubscriber = true;
    }

    // 4. Send Welcome Email if it's a new subscriber and they gave email consent
    if (isNewSubscriber && consent_email) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es";
        const subject = language === "en" ? "Welcome to The Church Tasting Room" : "Bienvenido a The Church Tasting Room";
        const title = language === "en" ? "Welcome to The Church Tasting Room" : "Bienvenido a The Church Tasting Room";
        const body1 = language === "en" 
          ? "Thank you for subscribing."
          : "Gracias por suscribirte.";
        const body2 = language === "en"
          ? "From now on, you can receive information about our upcoming tastings and experiences."
          : "A partir de ahora podrás recibir información sobre nuestras próximas catas y experiencias.";
        const signoff = language === "en" ? "See you at The Church." : "Nos vemos en The Church.";
        const buttonText = language === "en" ? "VIEW UPCOMING EXPERIENCES" : "VER PRÓXIMAS EXPERIENCIAS";
        
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #111111; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto; text-align: center;">
            <h1 style="color: #c9a96e; text-transform: uppercase; font-size: 20px; letter-spacing: 2px; margin-bottom: 40px; font-weight: normal;">The Church Tasting Room</h1>
            
            <h2 style="font-size: 24px; margin-bottom: 30px; font-weight: 300;">${title}</h2>
            
            <div style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 40px;">
              <p style="margin-bottom: 20px;">${body1}</p>
              <p style="margin-bottom: 20px;">${body2}</p>
              
              <div style="margin: 40px 0;">
                <a href="${appUrl}/${language}/tastings" style="background-color: #c9a96e; color: #111111; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; border-radius: 2px;">
                  ${buttonText}
                </a>
              </div>
              
              <p>${signoff}</p>
            </div>
            
            <div style="border-top: 1px solid #333333; padding-top: 30px; margin-top: 40px;">
              <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0;">The Church Tasting Room</p>
              <p style="color: #666666; font-size: 12px; margin-top: 5px;">L'Albir · Alicante</p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: "The Church Tasting Room <info@tastingroom.es>",
          to: email,
          subject: subject,
          html: html
        });
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // We log the error but don't fail the subscription action
      }
    }

    return { success: true };
  } catch (e) {
    console.error("Exception subscribing:", e);
    return { success: false, error: "server_error" };
  }
}
