"use client";

import { useTransition } from "react";
import { cancelReservationAction } from "@/app/actions/cancelReservation";

export default function CancelReservationButton({ reservationId, status }: { reservationId: string, status: string }) {
  const [isPending, startTransition] = useTransition();

  if (status === 'CANCELLED') return null;

  return (
    <button 
      onClick={() => {
        if (confirm('¿Estás seguro de cancelar esta reserva?')) {
          startTransition(async () => {
            const res = await cancelReservationAction(reservationId);
            if (!res.success) alert(res.error);
          });
        }
      }}
      disabled={isPending}
      className="text-red-500 hover:text-red-400 text-xs uppercase tracking-wider ml-2 disabled:opacity-50"
    >
      {isPending ? 'Cancelando...' : 'Cancelar'}
    </button>
  );
}