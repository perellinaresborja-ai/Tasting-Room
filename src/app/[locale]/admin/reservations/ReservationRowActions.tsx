"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteReservation } from "@/app/actions/reservationAdmin";

export default function ReservationRowActions({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await deleteReservation(id);
      if (res.success) {
        setShowModal(false);
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
    <>
      <div className="flex items-center justify-end space-x-3">
        {/* 
          // @ts-ignore */}
        <Link href={`/admin/reservations/${id}` as any} className="text-[var(--color-gold)] hover:text-white transition-colors" title="Editar reserva">
          <Pencil size={18} />
        </Link>
        <button 
          onClick={() => setShowModal(true)} 
          disabled={isDeleting}
          className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
          title="Eliminar reserva"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6 max-w-sm w-full relative">
            <button 
              onClick={() => setShowModal(false)}
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
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-[var(--color-charcoal)] text-white hover:bg-gray-800 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-800 transition-colors disabled:opacity-50 text-xs uppercase tracking-widest"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
