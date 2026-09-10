"use client";

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
      <Link href={`/admin/reservations/${id}` as any} className="text-[var(--color-gold)] hover:text-white transition-colors" title="Editar reserva">
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
