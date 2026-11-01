'use server';

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

export async function getAudience({ 
  audience, 
  filterType, 
  tastingId 
}: { 
  audience: string; 
  filterType: string; 
  tastingId: string; 
}) {
  const supabase = await createClient();
  let recipients: any[] = [];
  
  // 1. Get confirmed reservations to strictly define who is a "Cliente"
  const { data: confirmedRes } = await supabase
    .from('reservations')
    .select('profile_id')
    .eq('status', 'CONFIRMED');
  const confirmedProfileIds = new Set(confirmedRes?.map(r => r.profile_id) || []);

  // 2. Fetch profiles if we need clients OR interested leads
  if (audience === 'clients' || audience === 'both' || filterType === 'interested') {
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) {
      for (const p of profiles) {
        const isClient = confirmedProfileIds.has(p.id);
        
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
    if (seen.has(r.email.toLowerCase())) return false;
    seen.add(r.email.toLowerCase());
    return true;
  });

  // Apply filters
  if (filterType === 'recurring') {
    const counts: Record<string, number> = {};
    confirmedRes?.forEach(r => { 
      if (r.profile_id) counts[r.profile_id] = (counts[r.profile_id] || 0) + 1; 
    });
    const recurringIds = new Set(Object.keys(counts).filter(k => counts[k] > 1));
    unique = unique.filter(r => r.type === 'client' && recurringIds.has(r.id));
  } else if (filterType === 'interested' && tastingId) {
    const { data: res } = await supabase
      .from('reservations')
      .select('profile_id, status, created_at, payment_status')
      .eq('tasting_id', tastingId);
    const interestedIds = new Set();
    res?.forEach(r => {
      if (r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && r.payment_status === 'ABANDONED')) {
        interestedIds.add(r.profile_id);
      } else if (r.status === 'PENDING' && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000) {
        interestedIds.add(r.profile_id);
      }
    });
    unique = unique.filter(r => (r.type === 'client' || r.type === 'lead') && interestedIds.has(r.id));
  } else if (filterType === 'attendees' && tastingId) {
    const { data: res } = await supabase
      .from('reservations')
      .select('profile_id')
      .eq('tasting_id', tastingId)
      .eq('status', 'CONFIRMED');
    const attIds = new Set(res?.map(r => r.profile_id));
    unique = unique.filter(r => r.type === 'client' && attIds.has(r.id));
  }

  return unique;
}

function formatEmailHtml(body: string, siteUrl: string, recipientName?: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #050505; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="${siteUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" style="height: 48px; width: auto; margin: 0 auto 16px; display: block;" />
        <p style="color: #c9a96e; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0;">CLUB & TASTING ROOM</p>
      </div>

      <div style="background-color: #111111; border: 1px solid #222222; padding: 28px; margin-bottom: 28px; line-height: 1.7; color: #dddddd;">
        ${recipientName ? `<p style="color: #c9a96e; font-size: 16px; margin: 0 0 16px 0; font-weight: bold;">Hola ${recipientName},</p>` : ''}
        <div style="white-space: pre-wrap; font-size: 15px; color: #e5e5e5;">
          ${body.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}
        </div>
      </div>

      <div style="border-top: 1px solid #1a1a1a; padding-top: 20px; text-align: center; font-size: 11px; color: #777777;">
        <p style="margin: 0 0 8px 0;">The Church Tasting Room • Camí Vell d'Altea 26, L'Albir (Alicante)</p>
        <p style="margin: 0;">Has recibido esta comunicación porque diste tu consentimiento para recibir novedades y catas exclusivas.</p>
      </div>
    </div>
  `;
}

export async function sendCampaign({
  campaignId,
  channel,
  segment,
  subject,
  message,
  recipientIds
}: {
  campaignId?: string;
  channel: 'EMAIL' | 'WHATSAPP';
  segment: string;
  subject: string;
  message: string;
  recipientIds: string[];
}) {
  // 1. Authorize: Admin only
  const { profile: adminProfile } = await requireAdmin('es');
  if (!adminProfile) {
    return { success: false, error: 'NO_AUTORIZADO', message: 'No tienes permisos de administrador.' };
  }

  // 2. Validate channel & content
  if (channel === 'WHATSAPP') {
    return { success: false, error: 'WHATSAPP_NOT_CONFIGURED', message: 'El canal WhatsApp aún no está conectado en producción.' };
  }
  if (channel !== 'EMAIL') {
    return { success: false, error: 'CANAL_INVALIDO', message: 'Canal de comunicación no reconocido.' };
  }

  const cleanSubject = (subject || '').trim();
  const cleanMessage = (message || '').trim();

  if (!cleanSubject) {
    return { success: false, error: 'ASUNTO_REQUERIDO', message: 'El asunto del correo es obligatorio.' };
  }
  if (!cleanMessage) {
    return { success: false, error: 'MENSAJE_REQUERIDO', message: 'El cuerpo del mensaje es obligatorio.' };
  }
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    return { success: false, error: 'SIN_DESTINATARIOS', message: 'No se han seleccionado destinatarios.' };
  }

  const supabase = await createClient();
  const activeCampaignId = campaignId || crypto.randomUUID();

  // 3. Ensure campaign row exists in DB before locking
  const { data: existingComm } = await supabase
    .from('communications')
    .select('id, status')
    .eq('id', activeCampaignId)
    .maybeSingle();

  if (!existingComm) {
    await supabase.from('communications').insert({
      id: activeCampaignId,
      subject: cleanSubject,
      message: cleanMessage,
      channel: 'EMAIL',
      segment,
      status: 'PENDING',
      recipients_count: 0,
      accepted_count: 0,
      failed_count: 0,
      created_by: adminProfile.id
    });
  }

  // 4. ATOMIC DATABASE LOCK: Prevents simultaneous executions and recovers stale locks
  const { data: lockResult, error: lockErr } = await supabase.rpc('claim_campaign_lock', {
    p_campaign_id: activeCampaignId,
    p_admin_id: adminProfile.id,
    p_stale_seconds: 180
  });

  if (lockErr) {
    console.error('Error claiming campaign lock:', lockErr);
    // Fallback direct check if RPC not yet created
    if (existingComm && existingComm.status === 'SENDING') {
      return { success: false, error: 'IN_PROGRESS', message: 'La campaña ya se está procesando actualmente.' };
    }
  } else if (lockResult && !lockResult.success) {
    return { success: false, error: lockResult.code, message: lockResult.message };
  }

  // 5. SERVER-SIDE CONSENT VERIFICATION: Query database directly at dispatch time
  const { data: authorizedProfiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, marketing_email_consent')
    .in('id', recipientIds)
    .eq('marketing_email_consent', true);

  const { data: authorizedSubscribers } = await supabase
    .from('subscribers')
    .select('id, email, consent_email')
    .in('id', recipientIds)
    .eq('consent_email', true);

  const targetMap = new Map<string, { id?: string; email: string; name?: string; type: 'client' | 'subscriber' | 'lead' }>();

  authorizedProfiles?.forEach(p => {
    if (p.email && p.email.includes('@')) {
      const emailClean = p.email.toLowerCase().trim();
      targetMap.set(emailClean, { id: p.id, email: emailClean, name: p.first_name || '', type: 'client' });
    }
  });

  authorizedSubscribers?.forEach(s => {
    if (s.email && s.email.includes('@')) {
      const emailClean = s.email.toLowerCase().trim();
      if (!targetMap.has(emailClean)) {
        targetMap.set(emailClean, { id: s.id, email: emailClean, type: 'subscriber' });
      }
    }
  });

  const verifiedRecipients = Array.from(targetMap.values());

  if (verifiedRecipients.length === 0) {
    await supabase
      .from('communications')
      .update({ status: 'FAILED', error_log: ['Ningún destinatario cuenta con consentimiento activo en servidor.'] })
      .eq('id', activeCampaignId);

    return {
      success: false,
      error: 'NO_VALID_RECIPIENTS',
      message: 'Ninguno de los destinatarios seleccionados cuenta con autorización comercial activa.'
    };
  }

  // 6. Register individual recipients in communication_recipients
  for (const rec of verifiedRecipients) {
    try {
      await supabase
        .from('communication_recipients')
        .insert({
          communication_id: activeCampaignId,
          recipient_id: rec.id || null,
          recipient_type: rec.type,
          email: rec.email,
          recipient_name: rec.name || null,
          status: 'PENDING'
        });
    } catch {
      // Row might exist on retry, proceed
    }
  }

  // Update total count
  await supabase
    .from('communications')
    .update({ recipients_count: verifiedRecipients.length })
    .eq('id', activeCampaignId);

  // 7. Dispatch queue using atomic recipient claiming
  return await executeCampaignDispatch({
    campaignId: activeCampaignId,
    subject: cleanSubject,
    message: cleanMessage,
    adminId: adminProfile.id
  });
}

export async function retryCampaign({ campaignId }: { campaignId: string }) {
  const { profile: adminProfile } = await requireAdmin('es');
  if (!adminProfile) {
    return { success: false, error: 'NO_AUTORIZADO', message: 'No tienes permisos de administrador.' };
  }

  const supabase = await createClient();

  // 1. Reconcile any stale PROCESSING recipients from a crashed previous execution
  try {
    await supabase.rpc('reconcile_stale_campaign', {
      p_campaign_id: campaignId,
      p_stale_seconds: 180
    });
  } catch (reconcileErr) {
    console.error('Error reconciling stale campaign:', reconcileErr);
  }

  // 2. Atomic lock
  const { data: lockResult, error: lockErr } = await supabase.rpc('claim_campaign_lock', {
    p_campaign_id: campaignId,
    p_admin_id: adminProfile.id,
    p_stale_seconds: 180
  });

  if (lockErr) {
    console.error('Error claiming campaign lock:', lockErr);
  } else if (lockResult && !lockResult.success) {
    return { success: false, error: lockResult.code, message: lockResult.message };
  }

  // 3. Fetch campaign details
  const { data: comm } = await supabase
    .from('communications')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!comm) {
    return { success: false, error: 'NOT_FOUND', message: 'Campaña no encontrada.' };
  }

  // 4. Re-verify active consent for pending/failed recipients
  const { data: pendingRecipients } = await supabase
    .from('communication_recipients')
    .select('id, email')
    .eq('communication_id', campaignId)
    .in('status', ['PENDING', 'FAILED']);

  if (!pendingRecipients || pendingRecipients.length === 0) {
    await supabase.from('communications').update({ status: 'ACCEPTED' }).eq('id', campaignId);
    return { success: true, message: 'Todos los destinatarios ya estaban aceptados.' };
  }

  const emailsToCheck = pendingRecipients.map(r => r.email.toLowerCase());
  const { data: validProfiles } = await supabase
    .from('profiles')
    .select('email')
    .in('email', emailsToCheck)
    .eq('marketing_email_consent', true);
  const validProfileEmails = new Set(validProfiles?.map(p => p.email.toLowerCase()) || []);

  const { data: validSubscribers } = await supabase
    .from('subscribers')
    .select('email')
    .in('email', emailsToCheck)
    .eq('consent_email', true);
  const validSubscriberEmails = new Set(validSubscribers?.map(s => s.email.toLowerCase()) || []);

  for (const r of pendingRecipients) {
    const isConsentActive = validProfileEmails.has(r.email.toLowerCase()) || validSubscriberEmails.has(r.email.toLowerCase());
    if (!isConsentActive) {
      await supabase
        .from('communication_recipients')
        .update({
          status: 'FAILED',
          error_message: 'Consentimiento revocado antes del reintento.'
        })
        .eq('id', r.id);
    }
  }

  return await executeCampaignDispatch({
    campaignId,
    subject: comm.subject,
    message: comm.message || comm.subject,
    adminId: adminProfile.id
  });
}

// Atomic recipient dispatch loop
async function executeCampaignDispatch({
  campaignId,
  subject,
  message,
  adminId
}: {
  campaignId: string;
  subject: string;
  message: string;
  adminId: string;
}) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tastingroom.es';
  const errorLogs: string[] = [];

  let continueLoop = true;
  const batchSize = 3;

  while (continueLoop) {
    // ATOMIC RECIPIENT CLAIM: Uses FOR UPDATE SKIP LOCKED
    // Immediately marks claimed batch as 'PROCESSING' in the database before sending
    let claimedBatch: any[] = [];
    
    const { data: rpcBatch, error: rpcErr } = await supabase.rpc('claim_recipients_for_dispatch', {
      p_campaign_id: campaignId,
      p_batch_size: batchSize
    });

    if (!rpcErr && rpcBatch && rpcBatch.length > 0) {
      claimedBatch = rpcBatch;
    } else {
      // Fallback query if RPC isn't deployed yet
      const { data: fallbackRecipients } = await supabase
        .from('communication_recipients')
        .select('*')
        .eq('communication_id', campaignId)
        .in('status', ['PENDING', 'FAILED'])
        .limit(batchSize);

      if (fallbackRecipients && fallbackRecipients.length > 0) {
        const ids = fallbackRecipients.map(r => r.id);
        await supabase
          .from('communication_recipients')
          .update({ status: 'PROCESSING', sent_at: new Date().toISOString() })
          .in('id', ids);
        claimedBatch = fallbackRecipients;
      }
    }

    if (claimedBatch.length === 0) {
      // Queue is fully processed or claimed by other workers
      continueLoop = false;
      break;
    }

    // Process claimed batch concurrently
    await Promise.all(
      claimedBatch.map(async (rec) => {
        try {
          // Official Resend SDK Idempotency Mechanism:
          // Passes idempotencyKey in the second argument (CreateEmailRequestOptions)
          // guaranteeing the provider never sends duplicate emails for the same key.
          const { data: resendData, error: resendError } = await resend.emails.send(
            {
              from: 'The Church Tasting Room <info@tastingroom.es>',
              to: rec.email,
              subject: subject,
              html: formatEmailHtml(message, siteUrl, rec.recipient_name || undefined)
            },
            {
              idempotencyKey: `${campaignId}_${rec.id}`
            }
          );

          if (resendError) {
            const errStr = `${rec.email}: ${resendError.message}`;
            errorLogs.push(errStr);
            await supabase
              .from('communication_recipients')
              .update({
                status: 'FAILED',
                error_message: resendError.message
              })
              .eq('id', rec.id);
          } else if (resendData?.id) {
            // ACCEPTED by provider: store Resend ID immediately
            await supabase
              .from('communication_recipients')
              .update({
                status: 'ACCEPTED',
                provider_message_id: resendData.id,
                sent_at: new Date().toISOString(),
                error_message: null
              })
              .eq('id', rec.id);
          } else {
            const errStr = `${rec.email}: Respuesta incompleta del proveedor`;
            errorLogs.push(errStr);
            await supabase
              .from('communication_recipients')
              .update({
                status: 'UNCERTAIN',
                error_message: 'Respuesta incompleta del proveedor. Estado incierto: excluido de reintento automático.'
              })
              .eq('id', rec.id);
          }
        } catch (sendErr: any) {
          const errStr = `${rec.email}: ${sendErr.message || 'Error de conexión con Resend'}`;
          errorLogs.push(errStr);
          await supabase
            .from('communication_recipients')
            .update({
              status: 'UNCERTAIN',
              error_message: `${sendErr.message || 'Error de conexión'}. Estado incierto: excluido de reintento automático para evitar duplicados.`
            })
            .eq('id', rec.id);
        }
      })
    );

    // Heartbeat: update campaign timestamp to maintain lock validity
    await supabase
      .from('communications')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    // Pacing between micro-batches
    await new Promise(r => setTimeout(r, 150));
  }

  // Recalculate true counts from individual recipient rows
  const { data: allRecipients } = await supabase
    .from('communication_recipients')
    .select('status')
    .eq('communication_id', campaignId);

  const totalCount = allRecipients?.length || 0;
  const acceptedCount = allRecipients?.filter(r => r.status === 'ACCEPTED').length || 0;
  const failedCount = allRecipients?.filter(r => r.status === 'FAILED').length || 0;
  const uncertainCount = allRecipients?.filter(r => r.status === 'UNCERTAIN').length || 0;
  const pendingOrProcessing = allRecipients?.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length || 0;

  let finalStatus: 'ACCEPTED' | 'PARTIAL' | 'FAILED' = 'ACCEPTED';
  if (pendingOrProcessing > 0 || uncertainCount > 0 || (failedCount > 0 && acceptedCount > 0)) {
    finalStatus = 'PARTIAL';
  } else if (failedCount > 0 && acceptedCount === 0) {
    finalStatus = 'FAILED';
  } else if (acceptedCount === totalCount && totalCount > 0) {
    finalStatus = 'ACCEPTED';
  }

  // Final update of campaign row
  await supabase
    .from('communications')
    .update({
      recipients_count: totalCount,
      accepted_count: acceptedCount,
      failed_count: failedCount,
      status: finalStatus,
      sent_at: acceptedCount > 0 ? new Date().toISOString() : null,
      error_log: errorLogs.length > 0 ? errorLogs : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId);

  return {
    success: acceptedCount > 0,
    campaignId,
    status: finalStatus,
    total: totalCount,
    accepted: acceptedCount,
    failed: failedCount,
    pending: pendingOrProcessing,
    message: finalStatus === 'ACCEPTED'
      ? `Campaña aceptada por el proveedor: ${acceptedCount} de ${totalCount} emails aceptados para envío.`
      : finalStatus === 'PARTIAL'
      ? `Envío parcial: ${acceptedCount} aceptados, ${failedCount} fallidos${uncertainCount > 0 ? `, ${uncertainCount} en estado incierto (excluidos por seguridad)` : ''}${pendingOrProcessing > 0 ? `, ${pendingOrProcessing} pendientes` : ''}. Puedes reintentar los no enviados.`
      : `Error de envío: ${errorLogs[0] || 'El proveedor rechazó el envío de todos los destinatarios.'}`
  };
}
