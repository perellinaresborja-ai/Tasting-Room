import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build').trim(), {
  apiVersion: '2026-08-26.dahlia',
});

const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const resend = new Resend((process.env.RESEND_API_KEY || 're_dummy').trim());

const DEFAULT_ADMIN_EMAILS = ['info@tastingroom.es', 'perellinaresborja@gmail.com'];

function getAdminNotificationEmails(): string[] {
  const fromEnv = process.env.ADMIN_NOTIFICATION_EMAILS;
  if (fromEnv && fromEnv.trim().length > 0) {
    return Array.from(
      new Set(
        fromEnv
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes('@'))
      )
    );
  }
  return DEFAULT_ADMIN_EMAILS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWhatsAppUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.length === 9 && /^[6789]/.test(digits) ? `34${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConfirmationEmailParams {
  toEmail: string;
  firstName: string;
  lastName?: string;
  locale: string;
  title: string;
  date: string;
  startTime?: string | null;
  tickets: number;
  totalAmount: number;
  isGift: boolean;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
  buyerName?: string;
  idempotencyKey?: string;
  subjectPrefix?: string;
}

async function dispatchConfirmationEmail(params: ConfirmationEmailParams) {
  let appUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es').trim().replace(/\/+$/, '');
  if (appUrl.includes('://tastingroom.es')) {
    appUrl = appUrl.replace('://tastingroom.es', '://www.tastingroom.es');
  }

  const time = params.startTime ? String(params.startTime).slice(0, 5) : '';

  // Generate secure access link
  let actionUrl = `${appUrl}/${params.locale}/member`;
  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: params.toEmail,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/${params.locale}/member`
      }
    });

    if (!linkError && linkData?.properties?.hashed_token) {
      actionUrl = `${appUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=/${params.locale}/member`;
    } else if (linkError) {
      console.error("Error generating link for email:", linkError);
    }
  } catch (err) {
    console.error("Error generating link for email:", err);
  }

  const recipientName = params.recipientName || '';
  const giftMessage = params.giftMessage || '';
  const buyerName = params.buyerName || `${params.firstName} ${params.lastName || ''}`.trim();
  const prefix = params.subjectPrefix ? `${params.subjectPrefix} ` : '';

  let emailSubject = '';
  let html = '';

  if (params.isGift) {
    emailSubject = params.locale === 'en'
      ? `${prefix}🎁 Gift Voucher: ${params.title} for ${recipientName} — The Church Tasting Room`
      : `${prefix}🎁 Tu Tarjeta Regalo para ${params.title} está lista — The Church Tasting Room`;

    html = params.locale === 'en' ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" width="260" style="width: 260px; max-width: 85%; height: auto; margin: 0 auto 16px; display: block;" />
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">EXPERIENCE GIFT VOUCHER</h1>
        </div>

        <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
          <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">To</p>
          <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${recipientName}</p>

          ${buyerName ? `
            <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">From</p>
            <p style="color: #ffffff; font-size: 15px; margin: 0 0 16px;">${buyerName}</p>
          ` : ''}

          ${giftMessage ? `
            <div style="padding: 12px; background-color: #050505; border-left: 3px solid #c9a96e; font-style: italic; color: #cccccc; font-size: 13px; margin-bottom: 16px;">
              &ldquo;${giftMessage}&rdquo;
            </div>
          ` : ''}

          <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 16px;">
            <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 8px;">${params.title}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 4px;">📅 Date: ${params.date} • ⏱ Time: ${time}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0;">Seats: ${params.tickets} · The Church Tasting Room</p>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 14px; color: #cccccc;">You can forward this email to <strong>${recipientName}</strong>, or access My Chapel to view your booking details and access QR.</p>
          <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 12px;">Access My Chapel</a>
        </div>

        <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 30px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
      </div>
    ` : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" width="260" style="width: 260px; max-width: 85%; height: auto; margin: 0 auto 16px; display: block;" />
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">TARJETA REGALO DE EXPERIENCIA</h1>
        </div>

        <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
          <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Para</p>
          <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${recipientName}</p>

          ${buyerName ? `
            <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">De parte de</p>
            <p style="color: #ffffff; font-size: 15px; margin: 0 0 16px;">${buyerName}</p>
          ` : ''}

          ${giftMessage ? `
            <div style="padding: 12px; background-color: #050505; border-left: 3px solid #c9a96e; font-style: italic; color: #cccccc; font-size: 13px; margin-bottom: 16px;">
              &ldquo;${giftMessage}&rdquo;
            </div>
          ` : ''}

          <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 16px;">
            <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 8px;">${params.title}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 4px;">📅 Fecha: ${params.date} • ⏱ Hora: ${time}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0;">Plazas: ${params.tickets} · The Church Tasting Room</p>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 14px; color: #cccccc;">Puedes reenviarle este comprobante a <strong>${recipientName}</strong>, o acceder a Mi Capilla para ver los detalles y el QR de acceso.</p>
          <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 12px;">Acceder a Mi Capilla</a>
        </div>

        <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 30px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
      </div>
    `;
  } else {
    const guestFullName = `${params.firstName || ''} ${params.lastName || ''}`.trim() || params.toEmail;
    emailSubject = params.locale === 'en'
      ? `${prefix}✨ Booking Confirmed: ${params.title} — The Church Tasting Room`
      : `${prefix}✨ Tu reserva para ${params.title} está confirmada — The Church Tasting Room`;

    html = params.locale === 'en' ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" width="260" style="width: 260px; max-width: 85%; height: auto; margin: 0 auto 16px; display: block;" />
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">BOOKING CONFIRMED</h1>
        </div>

        <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
          <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Guest</p>
          <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${guestFullName}</p>

          <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 8px;">
            <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Experience</p>
            <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 10px;">${params.title}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 6px;">📅 Date: ${params.date} • ⏱ Time: ${time}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 6px;">🥂 Seats reserved: <strong style="color: #ffffff;">${params.tickets}</strong></p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0;">💳 Total paid: <strong style="color: #c9a96e;">€${params.totalAmount}</strong></p>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 15px; color: #ffffff; font-weight: bold; margin: 0 0 8px;">Your personal QR access is in My Chapel</p>
          <p style="font-size: 13px; color: #bbbbbb; line-height: 1.6; margin: 0 0 16px;">My Chapel is your personal space at The Church Tasting Room. There you will find your permanent personal QR code for check-in, your upcoming experiences, and your tasting history.</p>
          <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 8px;">Access My Chapel</a>
        </div>

        <p style="font-size: 11px; color: #777777; text-align: center; margin-top: 24px;">This magic access link is personal. You can always request a new one anytime from www.tastingroom.es.</p>
        <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 12px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
      </div>
    ` : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${appUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" width="260" style="width: 260px; max-width: 85%; height: auto; margin: 0 auto 16px; display: block;" />
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 2px;">RESERVA CONFIRMADA</h1>
        </div>

        <div style="border: 2px solid #c9a96e; padding: 24px; background-color: #111111; margin-bottom: 24px; text-align: left;">
          <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Titular de la reserva</p>
          <p style="color: #c9a96e; font-size: 22px; font-weight: bold; margin: 0 0 16px;">${guestFullName}</p>

          <div style="border-top: 1px solid #222222; padding-top: 16px; margin-top: 8px;">
            <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Experiencia</p>
            <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 10px;">${params.title}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 6px;">📅 Fecha: ${params.date} • ⏱ Hora: ${time}</p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0 0 6px;">🥂 Plazas reservadas: <strong style="color: #ffffff;">${params.tickets}</strong></p>
            <p style="color: #aaaaaa; font-size: 14px; margin: 0;">💳 Importe abonado: <strong style="color: #c9a96e;">€${params.totalAmount}</strong></p>
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="font-size: 15px; color: #ffffff; font-weight: bold; margin: 0 0 8px;">Tu QR de acceso está en Mi Capilla</p>
          <p style="font-size: 13px; color: #bbbbbb; line-height: 1.6; margin: 0 0 16px;">Mi Capilla es tu espacio personal en The Church Tasting Room. Allí encontrarás tu código QR permanente para entrar al evento, tus próximas catas y tu historial de experiencias.</p>
          <a href="${actionUrl}" style="background-color: #c9a96e; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-top: 8px;">Acceder a Mi Capilla</a>
        </div>

        <p style="font-size: 11px; color: #777777; text-align: center; margin-top: 24px;">Este enlace de acceso es personal. Siempre puedes solicitar uno nuevo desde www.tastingroom.es.</p>
        <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 12px;">The Church Tasting Room · Camí Vell d'Altea, 26 · 03581 L'Albir, Alicante</p>
      </div>
    `;
  }

  const sendOptions = params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined;
  const primaryRes = await resend.emails.send(
    {
      from: 'The Church Tasting Room <info@tastingroom.es>',
      to: params.toEmail,
      subject: emailSubject,
      html: html
    },
    sendOptions
  );

  // If it's a gift and recipient email is provided, send directly to recipient too!
  if (params.isGift && params.recipientEmail && params.recipientEmail.includes('@')) {
    try {
      await resend.emails.send(
        {
          from: 'The Church Tasting Room <info@tastingroom.es>',
          to: params.recipientEmail,
          subject: params.locale === 'en'
            ? `${prefix}🎁 You received a Tasting Gift Voucher: ${params.title}!`
            : `${prefix}🎁 ¡Tienes un regalo! Tarjeta de Experiencia: ${params.title}`,
          html: html
        },
        params.idempotencyKey ? { idempotencyKey: `${params.idempotencyKey}_recip` } : undefined
      );
      console.log(`Direct gift voucher email sent to recipient ${params.recipientEmail}`);
    } catch (recipErr) {
      console.error('Error sending direct email to gift recipient:', recipErr);
    }
  }

  return primaryRes;
}

interface AdminNotificationEmailParams {
  reservationId: string;
  tastingId: string;
  tastingTitleEs: string;
  date: string;
  startTime?: string | null;
  tickets: number;
  totalAmount: number;
  confirmedSeats?: number | null;
  capacity?: number | null;
  customerEmail: string;
  firstName: string;
  lastName?: string;
  customerPhone?: string | null;
  locale: string;
  isGift: boolean;
  recipientName?: string;
  giftMessage?: string;
  idempotencyKey?: string;
}

async function dispatchAdminNotificationEmail(params: AdminNotificationEmailParams) {
  const rawSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es').trim().replace(/\/+$/, '');
  let publicSiteUrl = rawSiteUrl.startsWith('https://') ? rawSiteUrl : 'https://www.tastingroom.es';
  if (publicSiteUrl.includes('://tastingroom.es')) {
    publicSiteUrl = publicSiteUrl.replace('://tastingroom.es', '://www.tastingroom.es');
  }

  const time = params.startTime ? String(params.startTime).slice(0, 5) : '';
  const guestFullName = `${params.firstName || ''} ${params.lastName || ''}`.trim() || params.customerEmail;
  const waUrl = buildWhatsAppUrl(params.customerPhone);
  const adminReservationUrl = `${publicSiteUrl}/es/admin/reservations/${params.reservationId}`;
  const adminAttendeesUrl = `${publicSiteUrl}/es/admin/tastings/${params.tastingId}/attendees`;

  const remainingSeats =
    typeof params.capacity === 'number' && typeof params.confirmedSeats === 'number'
      ? Math.max(0, params.capacity - params.confirmedSeats)
      : null;

  const occupancyLabel =
    typeof params.capacity === 'number' && typeof params.confirmedSeats === 'number'
      ? `${params.confirmedSeats} / ${params.capacity} plazas confirmadas (${
          remainingSeats === 0 ? '¡AFORO COMPLETO!' : `quedan ${remainingSeats} libres`
        })`
      : null;

  const subject = params.isGift
    ? `🎁 Nueva Tarjeta Regalo (+${params.tickets} pl. · €${params.totalAmount}): ${params.tastingTitleEs} — ${guestFullName}`
    : `🔔 Nueva reserva (+${params.tickets} ${params.tickets === 1 ? 'plaza' : 'plazas'} · €${params.totalAmount}): ${params.tastingTitleEs} — ${guestFullName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #050505; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${publicSiteUrl}/logo-tasting-room-gold.png" alt="The Church Tasting Room" width="200" style="width: 200px; max-width: 75%; height: auto; margin: 0 auto 12px; display: block;" />
        <p style="color: #c9a96e; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 6px;">AVISO INTERNO DE RESERVA</p>
        <h1 style="color: #ffffff; font-size: 20px; margin: 0; letter-spacing: 1px;">
          ${params.isGift ? '🎁 NUEVA TARJETA REGALO PAGADA' : '✨ NUEVA RESERVA CONFIRMADA'}
        </h1>
      </div>

      <div style="border: 1px solid #c9a96e; padding: 20px; background-color: #111111; margin-bottom: 20px;">
        <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">Experiencia</p>
        <p style="color: #ffffff; font-size: 18px; font-weight: bold; margin: 0 0 8px;">${escapeHtml(params.tastingTitleEs)}</p>
        <p style="color: #cccccc; font-size: 14px; margin: 0 0 12px;">📅 ${escapeHtml(params.date)}${time ? ` · ⏱ ${escapeHtml(time)}` : ''}</p>

        <div style="border-top: 1px solid #222222; padding-top: 12px; margin-top: 12px;">
          <p style="color: #dddddd; font-size: 14px; margin: 0 0 6px;">🥂 Plazas compradas: <strong style="color: #ffffff;">${params.tickets}</strong></p>
          <p style="color: #dddddd; font-size: 14px; margin: 0 0 6px;">💳 Importe cobrado (Stripe): <strong style="color: #c9a96e;">€${params.totalAmount}</strong></p>
          ${
            occupancyLabel
              ? `<p style="color: #dddddd; font-size: 14px; margin: 0;">📊 Ocupación actual: <strong style="color: ${remainingSeats === 0 ? '#ef4444' : '#c9a96e'};">${escapeHtml(occupancyLabel)}</strong></p>`
              : ''
          }
        </div>
      </div>

      <div style="border: 1px solid #262626; padding: 20px; background-color: #0d0d0d; margin-bottom: 20px;">
        <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px;">Datos del Cliente</p>
        <p style="color: #ffffff; font-size: 16px; font-weight: bold; margin: 0 0 8px;">${escapeHtml(guestFullName)}</p>
        <p style="color: #cccccc; font-size: 14px; margin: 0 0 6px;">
          ✉️ Email: <a href="mailto:${escapeHtml(params.customerEmail)}" style="color: #c9a96e; text-decoration: none;">${escapeHtml(params.customerEmail)}</a>
        </p>
        ${
          params.customerPhone
            ? `<p style="color: #cccccc; font-size: 14px; margin: 0 0 6px;">
                📞 Teléfono: <a href="tel:${escapeHtml(params.customerPhone)}" style="color: #c9a96e; text-decoration: none;">${escapeHtml(params.customerPhone)}</a>
                ${waUrl ? ` · <a href="${waUrl}" style="color: #4ade80; text-decoration: underline;">Abrir WhatsApp</a>` : ''}
              </p>`
            : `<p style="color: #777777; font-size: 13px; margin: 0 0 6px;">📞 Teléfono: No indicado</p>`
        }
        <p style="color: #888888; font-size: 12px; margin: 8px 0 0;">🌐 Idioma de compra: ${params.locale === 'en' ? 'Inglés (EN)' : 'Español (ES)'}</p>
      </div>

      ${
        params.isGift
          ? `
            <div style="border: 1px solid #3f3420; padding: 16px; background-color: #16130c; margin-bottom: 20px;">
              <p style="color: #c9a96e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">🎁 Detalles del Regalo</p>
              <p style="color: #ffffff; font-size: 14px; margin: 0 0 6px;">Para: <strong>${escapeHtml(params.recipientName || 'No especificado')}</strong></p>
              ${
                params.giftMessage
                  ? `<p style="color: #cccccc; font-size: 13px; font-style: italic; margin: 0;">&ldquo;${escapeHtml(params.giftMessage)}&rdquo;</p>`
                  : ''
              }
            </div>
          `
          : ''
      }

      <div style="text-align: center; margin: 24px 0 12px;">
        <a href="${adminReservationUrl}" style="background-color: #c9a96e; color: #000000; padding: 12px 22px; text-decoration: none; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin: 4px;">
          Ver Reserva en Admin
        </a>
        <a href="${adminAttendeesUrl}" style="background-color: #1a1a1a; border: 1px solid #444444; color: #ffffff; padding: 12px 22px; text-decoration: none; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin: 4px;">
          Lista de Asistentes
        </a>
      </div>

      <p style="font-size: 11px; color: #666666; text-align: center; margin-top: 20px;">
        Puedes responder directamente a este correo para escribir a ${escapeHtml(guestFullName)}.
      </p>
    </div>
  `;

  return resend.emails.send(
    {
      from: 'The Church Reservas <info@tastingroom.es>',
      to: getAdminNotificationEmails(),
      replyTo: params.customerEmail || undefined,
      subject,
      html,
    },
    params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    console.error(`Webhook signature verification failed: ${(err instanceof Error ? err.message : String(err))}`);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      const session = event.data.object as Stripe.Checkout.Session;
      const reservationId = session.metadata?.reservation_id;

      // Zero-side-effect preview mode (authenticated by Stripe HMAC webhook signature)
      if (session.metadata?.preview_only === 'true' && session.customer_email) {
        const previewTastingId = session.metadata?.tasting_id;
        let previewTitle = 'Descubre The Church';
        let previewDate = '2026-11-21';
        let previewStartTime: string | null = '19:30:00';
        let previewPrice = 45;

        if (previewTastingId) {
          const { data: tData } = await supabaseAdmin
            .from('tastings')
            .select('title_es, title_en, date, start_time, price')
            .eq('id', previewTastingId)
            .single();
          if (tData) {
            previewTitle = (session.metadata?.locale === 'en' ? tData.title_en : tData.title_es) || previewTitle;
            previewDate = tData.date || previewDate;
            previewStartTime = tData.start_time || previewStartTime;
            previewPrice = tData.price || previewPrice;
          }
        }

        const previewTickets = parseInt(session.metadata?.tickets || '2', 10) || 2;
        const previewRes = await dispatchConfirmationEmail({
          toEmail: session.customer_email,
          firstName: session.metadata?.first_name || 'Pere',
          lastName: session.metadata?.last_name || '',
          locale: session.metadata?.locale || 'es',
          title: previewTitle,
          date: previewDate,
          startTime: previewStartTime,
          tickets: previewTickets,
          totalAmount: previewPrice * previewTickets,
          isGift: session.metadata?.is_gift === 'true',
          recipientName: session.metadata?.recipient_name,
          giftMessage: session.metadata?.gift_message,
          buyerName: session.metadata?.buyer_name,
          subjectPrefix: '[PRUEBA]',
        });

        return NextResponse.json({
          received: true,
          preview_sent: !previewRes.error,
          resend_id: previewRes.data?.id || null,
          resend_error: previewRes.error?.message || null,
        });
      }

      if (reservationId) {
        if (session.payment_status !== 'paid') {
          console.log(`Payment not confirmed yet for session ${session.id}, status: ${session.payment_status}`);
          return NextResponse.json({ received: true });
        }

        // 1. Fetch reservation to ensure idempotency for email specifically
        const { data: resData, error: resError } = await supabaseAdmin
          .from('reservations')
          .select('*, profile:profiles(email, first_name, last_name, phone, public_token), tasting:tastings(title_es, title_en, date, start_time, capacity)')
          .eq('id', reservationId)
          .single();

        if (resError || !resData) {
          console.error('Reservation not found:', reservationId);
          return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        const wasAlreadyConfirmed = resData.status === 'CONFIRMED' && resData.payment_status === 'PAID';

        // 2. Mark reservation as CONFIRMED and PAID (idempotent for status)
        if (!wasAlreadyConfirmed) {
          const { error: updateError } = await supabaseAdmin
            .from('reservations')
            .update({
              status: 'CONFIRMED',
              payment_status: 'PAID',
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', reservationId);

          if (updateError) {
            console.error('Error updating reservation:', updateError);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
          }
          console.log(`Reservation ${reservationId} marked CONFIRMED.`);

          // TRACK payment_completed
          await import('@/app/actions/analytics').then(m => 
            m.trackAnalyticsEvent({ 
              event_name: 'payment_completed', 
              tasting_id: resData.tasting_id,
              profile_id: resData.profile_id,
              session_id: session.id
            })
          ).catch(() => {});
        }

        // 3. Send customer confirmation email idempotently
        if (!wasAlreadyConfirmed && !resData.confirmation_email_sent_at && resData.profile?.email) {
          try {
            const locale = session.metadata?.locale || "es";
            const title = (locale === 'en' ? resData.tasting?.title_en : resData.tasting?.title_es) || resData.tasting?.title_es || 'The Church Tasting Room';

            const emailRes = await dispatchConfirmationEmail({
              toEmail: resData.profile.email,
              firstName: resData.profile.first_name || '',
              lastName: resData.profile.last_name || '',
              locale,
              title,
              date: resData.tasting?.date || '',
              startTime: resData.tasting?.start_time,
              tickets: resData.tickets,
              totalAmount: resData.total_amount,
              isGift: session.metadata?.is_gift === 'true',
              recipientName: session.metadata?.recipient_name,
              recipientEmail: session.metadata?.recipient_email,
              giftMessage: session.metadata?.gift_message,
              buyerName: session.metadata?.buyer_name,
              idempotencyKey: `confirm_${reservationId}`,
            });

            if (emailRes.error) {
              console.error('Resend error sending confirmation email:', emailRes.error);
            } else {
              await supabaseAdmin
                .from('reservations')
                .update({ confirmation_email_sent_at: new Date().toISOString() })
                .eq('id', reservationId);
              console.log(`Confirmation email sent for reservation ${reservationId} (${emailRes.data?.id})`);
            }
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Don't fail the webhook if just the email fails
          }
        } else {
          console.log(`Email already sent or missing email for reservation ${reservationId}`);
        }

        // 4. Send internal admin notification email (info@tastingroom.es & perellinaresborja@gmail.com)
        if (!wasAlreadyConfirmed) {
          try {
            const { data: confirmedRows } = await supabaseAdmin
              .from('reservations')
              .select('tickets')
              .eq('tasting_id', resData.tasting_id)
              .eq('status', 'CONFIRMED');

            const confirmedSeats = confirmedRows
              ? confirmedRows.reduce((acc, row) => acc + (row.tickets || 0), 0)
              : null;

            await new Promise((resolve) => setTimeout(resolve, 350));

            const adminRes = await dispatchAdminNotificationEmail({
              reservationId,
              tastingId: resData.tasting_id,
              tastingTitleEs: resData.tasting?.title_es || resData.tasting?.title_en || 'The Church Tasting Room',
              date: resData.tasting?.date || '',
              startTime: resData.tasting?.start_time,
              tickets: resData.tickets,
              totalAmount: resData.total_amount,
              confirmedSeats,
              capacity: resData.tasting?.capacity ?? null,
              customerEmail: resData.profile?.email || session.customer_email || '',
              firstName: resData.profile?.first_name || '',
              lastName: resData.profile?.last_name || '',
              customerPhone: resData.profile?.phone || null,
              locale: session.metadata?.locale || 'es',
              isGift: session.metadata?.is_gift === 'true',
              recipientName: session.metadata?.recipient_name,
              giftMessage: session.metadata?.gift_message,
              idempotencyKey: `admin_notify_${reservationId}`,
            });

            if (adminRes.error) {
              console.error('Resend error sending admin notification email:', adminRes.error);
            } else {
              console.log(`Admin notification email sent for reservation ${reservationId} (${adminRes.data?.id})`);
            }
          } catch (adminEmailErr) {
            console.error('Error sending admin notification email:', adminEmailErr);
          }
        }
      }
      break;
      
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      const failedSession = event.data.object as Stripe.Checkout.Session;
      const failedReservationId = failedSession.metadata?.reservation_id;
      
      if (failedReservationId) {
        await supabaseAdmin
          .from('reservations')
          .update({
            status: 'EXPIRED',
            payment_status: 'ABANDONED',
            updated_at: new Date().toISOString()
          })
          .eq('id', failedReservationId)
          .eq('status', 'PENDING');
      }
      break;
  }

  return NextResponse.json({ received: true });
}
