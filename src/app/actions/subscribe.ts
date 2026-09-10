"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
// Used strictly server-side to bypass RLS safely
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    }

    return { success: true };
  } catch (e) {
    console.error("Exception subscribing:", e);
    return { success: false, error: "server_error" };
  }
}
