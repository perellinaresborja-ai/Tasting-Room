"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const ALLOWED_EVENTS = [
  'tasting_view',
  'booking_click',
  'checkout_started',
  'payment_completed',
  'member_access',
  'check_in',
  'feedback_completed'
];

interface AnalyticsPayload {
  event_name: string;
  tasting_id?: string;
  profile_id?: string;
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
}

export async function trackAnalyticsEvent(payload: AnalyticsPayload) {
  // 1. Validate event name
  if (!ALLOWED_EVENTS.includes(payload.event_name)) {
    console.warn("Analytics: Invalid event rejected:", payload.event_name);
    return { success: false };
  }

  // 2. Validate payload limits
  const cleanStr = (str?: string) => str ? str.substring(0, 255) : null;
  const cleanUUID = (str?: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return str && uuidRegex.test(str) ? str : null;
  };

  const tastingId = cleanUUID(payload.tasting_id);
  const profileId = cleanUUID(payload.profile_id);

  // 3. Get session / UTMs from cookies
  const cookieStore = await cookies();
  
  // We prioritize payload UTMs, fallback to cookie if existing
  const utmSource = cleanStr(payload.utm_source) || cookieStore.get("utm_source")?.value;
  const utmMedium = cleanStr(payload.utm_medium) || cookieStore.get("utm_medium")?.value;
  const utmCampaign = cleanStr(payload.utm_campaign) || cookieStore.get("utm_campaign")?.value;
  const utmContent = cleanStr(payload.utm_content) || cookieStore.get("utm_content")?.value;
  const utmTerm = cleanStr(payload.utm_term) || cookieStore.get("utm_term")?.value;
  const referrer = cleanStr(payload.referrer) || cookieStore.get("referrer")?.value;

  // We do NOT store or log any PII (email, phone, names). The payload only accepts UUIDs.

  try {
    // 4. Insert via Service Role to bypass RLS (since public INSERT is blocked)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabaseAdmin.from('analytics_events').insert({
      event_name: payload.event_name,
      tasting_id: tastingId,
      profile_id: profileId,
      session_id: cleanStr(payload.session_id) || null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      referrer: referrer
    });

    return { success: true };
  } catch(e) {
    console.error("Analytics internal error:", e);
    return { success: false };
  }
}
