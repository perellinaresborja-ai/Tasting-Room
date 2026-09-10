'use server';
import { createClient } from "@/lib/supabase/server";

export async function getAudience({ audience, filterType, tastingId }: { audience: string, filterType: string, tastingId: string }) {
  const supabase = await createClient();
  let recipients: any[] = [];
  
  // 1. Get confirmed reservations to strictly define who is a "Cliente"
  const { data: confirmedRes } = await supabase.from('reservations').select('profile_id').eq('status', 'CONFIRMED');
  const confirmedProfileIds = new Set(confirmedRes?.map(r => r.profile_id) || []);

  // 2. Fetch profiles if we need clients OR interested leads
  if (audience === 'clients' || audience === 'both' || filterType === 'interested') {
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      for (const p of profiles) {
        const isClient = confirmedProfileIds.has(p.id);
        
        // If they are not a client, they can ONLY be included if we are specifically looking for 'interested' leads
        if (!isClient && filterType !== 'interested') {
          continue; 
        }

        recipients.push({
          id: p.id,
          email: p.email,
          name: p.first_name || '',
          hasEmailConsent: !!p.marketing_email_consent,
          hasWaConsent: !!p.marketing_whatsapp_consent,
          phone: p.phone,
          type: isClient ? 'client' : 'lead'
        });
      }
    }
  }

  if (audience === 'subscribers' || audience === 'both') {
    const { data: subs } = await supabase.from('subscribers').select('*');
    if (subs) {
      for (const s of subs) {
        recipients.push({
          id: s.id,
          email: s.email,
          name: '',
          hasEmailConsent: !!s.consent_email,
          hasWaConsent: !!s.consent_wa,
          type: 'subscriber'
        });
      }
    }
  }

  // Deduplicate by email
  const seen = new Set();
  let unique = recipients.filter(r => {
    if (!r.email) return true;
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  // Apply filters
  if (filterType === 'recurring') {
    const counts: Record<string, number> = {};
    confirmedRes?.forEach(r => { if(r.profile_id) counts[r.profile_id] = (counts[r.profile_id] || 0) + 1; });
    const recurringIds = new Set(Object.keys(counts).filter(k => counts[k] > 1));
    unique = unique.filter(r => r.type === 'client' && recurringIds.has(r.id));
  } else if (filterType === 'interested' && tastingId) {
    const { data: res } = await supabase.from('reservations').select('profile_id, status, created_at, payment_status').eq('tasting_id', tastingId);
    const interestedIds = new Set();
    res?.forEach(r => {
      if (r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && r.payment_status === 'ABANDONED')) {
        interestedIds.add(r.profile_id);
      } else if (r.status === 'PENDING' && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000) {
        interestedIds.add(r.profile_id);
      }
    });
    // Can be 'client' or 'lead'
    unique = unique.filter(r => (r.type === 'client' || r.type === 'lead') && interestedIds.has(r.id));
  } else if (filterType === 'attendees' && tastingId) {
    const { data: res } = await supabase.from('reservations').select('profile_id').eq('tasting_id', tastingId).eq('status', 'CONFIRMED');
    const attIds = new Set(res?.map(r => r.profile_id));
    unique = unique.filter(r => r.type === 'client' && attIds.has(r.id));
  }

  return unique;
}

export async function sendCampaign({ channel, segment, subject, message, recipientIds }: { channel: string, segment: string, subject: string, message: string, recipientIds: string[] }) {
  const supabase = await createClient();
  
  // Here we would use Resend for EMAIL
  // if (channel === 'EMAIL') { await resend.emails.send(...) }

  // Save to DB
  const { error } = await supabase.from('communications').insert({
    subject: channel === 'EMAIL' ? subject : 'Campaña WhatsApp',
    channel: channel,
    segment: segment,
    filters_used: {},
    recipients_count: recipientIds.length,
    status: 'DRAFT', // No enviamos correos en entorno actual
    sent_at: null // No enviado realmente
  });

  if (error) throw error;
  return { success: true };
}
