"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { updateReservation, deleteReservation, resendConfirmationEmail } from "@/app/actions/reservationAdmin";
import { Save, Trash2, Mail, X } from "lucide-react";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    setLoading(true);
    const res = await deleteReservation(reservation.id);
    if (res.success) {
      setShowDeleteModal(false);
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
    <>
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
              onClick={() => setShowDeleteModal(true)}
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6 max-w-sm w-full relative">
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-serif text-[var(--color-gold)] uppercase tracking-widest mb-4">
              Eliminar Reserva
            </h3>
            <p className="text-gray-300 text-sm mb-8 text-left">
              ¿Seguro que deseas eliminar esta reserva de forma permanente? Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 border border-[var(--color-charcoal)] text-white hover:bg-gray-800 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="px-6 py-2 bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-800 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
