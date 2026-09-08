"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { error } = await supabase.from("subscribers").upsert(
      {
        name: null,
        email,
        phone,
        language,
        interests: null,
        consent_email,
        consent_wa,
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error("Error subscribing:", error);
      return { success: false, error: "db_error" };
    }

    return { success: true };
  } catch (e) {
    console.error("Exception subscribing:", e);
    return { success: false, error: "server_error" };
  }
}
