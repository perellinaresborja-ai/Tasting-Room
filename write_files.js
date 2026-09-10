const fs = require('fs');
const path = require('path');

const rowActionsContent = \"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Pencil, Trash2 } from "lucide-react";
import { deleteReservation } from "@/app/actions/reservationAdmin";

export default function ReservationRowActions({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("¿Seguro que deseas eliminar esta reserva de forma permanente?")) return;
    
    setIsDeleting(true);
    try {
      const res = await deleteReservation(id);
      if (res.success) {
        router.refresh();
      } else {
        alert("Error al eliminar la reserva: " + res.error);
        setIsDeleting(false);
      }
    } catch (e) {
      alert("Error inesperado al eliminar.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end space-x-3">
      {/* 
        // @ts-ignore */}
      <Link href={(\\\/admin/reservations/\\\\\\ as any)} className="text-[var(--color-gold)] hover:text-white transition-colors" title="Editar reserva">
        <Pencil size={18} />
      </Link>
      <button 
        onClick={handleDelete} 
        disabled={isDeleting}
        className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
        title="Eliminar reserva"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
\;

const adminActionsContent = \"use server";
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
    revalidatePath(\\\/admin/reservations/\\\\\\);
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
        redirectTo: \\\\\\/auth/callback?next=/es/member\\\
      }
    });

    if (linkError) throw linkError;

    const actionUrl = \\\\\\/auth/callback?token_hash=\\\&type=magiclink&next=/es/member\\\;
    const title = res.tasting?.title_es || 'The Church Tasting Room';
    
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
    
    await resend.emails.send({
      from: 'The Church Tasting Room <reservas@tastingroom.es>',
      to: res.profile.email,
      subject: \\\Confirmación de Reserva: \\\\\\,
      html: \\\
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h1 style="color: #c9a96e; text-transform: uppercase;">The Church Tasting Room</h1>
          <h2>Reserva Confirmada</h2>
          <p>Hola \\\,</p>
          <p>Adjuntamos el enlace para acceder a tu reserva.</p>
          <div style="margin: 30px 0;">
            <a href="\\\" style="background-color: #c9a96e; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">ACCEDER A MI CAPILLA</a>
          </div>
          <p style="font-size: 12px; color: #666;">Al acceder podrás ver tu código QR necesario para entrar.</p>
        </div>
      \\\
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
\;

const editFormContent = \"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { updateReservation, deleteReservation, resendConfirmationEmail } from "@/app/actions/reservationAdmin";
import { Save, Trash2, Mail } from "lucide-react";

export default function ReservationEditForm({ reservation }: { reservation: any }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    tickets: reservation.tickets,
    total_amount: reservation.total_amount,
    payment_status: reservation.payment_status,
    status: reservation.status
  });
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateReservation(reservation.id, formData);
    if (res.success) {
      alert("Reserva actualizada correctamente");
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!window.confirm("¿Seguro que deseas eliminar esta reserva de forma permanente?")) return;
    setLoading(true);
    const res = await deleteReservation(reservation.id);
    if (res.success) {
      router.push("/admin/reservations");
      router.refresh();
    } else {
      alert("Error al eliminar: " + res.error);
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    if (!window.confirm("¿Deseas reenviar el email de confirmación a " + reservation.profile?.email + "?")) return;
    setEmailLoading(true);
    const res = await resendConfirmationEmail(reservation.id);
    if (res.success) {
      alert("Email reenviado correctamente");
    } else {
      alert("Error al enviar email: " + res.error);
    }
    setEmailLoading(false);
  }

  return (
    <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--color-charcoal)] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-serif text-white">{reservation.profile?.first_name} {reservation.profile?.last_name}</h2>
          <p className="text-gray-400 text-sm">{reservation.profile?.email}</p>
        </div>
        <button 
          type="button"
          onClick={handleResendEmail} 
          disabled={emailLoading || loading}
          className="flex items-center gap-2 bg-blue-900/30 text-blue-400 border border-blue-800 px-4 py-2 hover:bg-blue-800/40 transition-colors disabled:opacity-50 text-sm uppercase tracking-widest"
        >
          <Mail size={16} />
          {emailLoading ? "Enviando..." : "Reenviar Email"}
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Plazas (Tickets)</label>
            <input 
              type="number" 
              value={formData.tickets}
              onChange={e => setFormData({...formData, tickets: parseInt(e.target.value) || 0})}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Importe Total (€)</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.total_amount}
              onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Estado de Pago</label>
            <select 
              value={formData.payment_status}
              onChange={e => setFormData({...formData, payment_status: e.target.value})}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gray-500">Estado de Reserva</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="NO_SHOW">NO_SHOW</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-[var(--color-charcoal)] gap-4">
          <button 
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900 px-6 py-3 transition-colors disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            <Trash2 size={16} />
            Eliminar Reserva
          </button>
          
          <button 
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-[var(--color-gold)] text-black px-8 py-3 hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50 text-sm uppercase tracking-widest font-bold"
          >
            <Save size={16} />
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
\;

const editPageContent = \/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import ReservationEditForm from "./ReservationEditForm";

export default async function AdminReservationEdit({ params }: { params: { id: string, locale: string } }) {
  const supabase = await createClient();
  
  const { data: reservation } = await supabase
    .from('reservations')
    .select('*, profile:profiles(*), tasting:tastings(*)')
    .eq('id', params.id)
    .single();

  if (!reservation) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/admin/reservations" className="text-gray-500 hover:text-white transition-colors text-sm uppercase tracking-widest mb-2 block">
            &larr; Volver a Reservas
          </Link>
          <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">
            Editar Reserva
          </h1>
          <p className="text-gray-400 mt-1">ID: {reservation.id}</p>
        </div>
      </div>

      <ReservationEditForm reservation={reservation} />
    </div>
  );
}
\;

fs.writeFileSync('src/app/[locale]/admin/reservations/ReservationRowActions.tsx', rowActionsContent);
fs.writeFileSync('src/app/actions/reservationAdmin.ts', adminActionsContent);
fs.writeFileSync('src/app/[locale]/admin/reservations/[id]/ReservationEditForm.tsx', editFormContent);
fs.writeFileSync('src/app/[locale]/admin/reservations/[id]/page.tsx', editPageContent);
