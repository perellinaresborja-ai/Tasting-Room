/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import ReservationEditForm from "./ReservationEditForm";

export default async function AdminReservationEdit({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*, profile:profiles(*), tasting:tastings(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Error fetching reservation:", error);
  }

  if (!reservation) {
    console.error("Reservation not found for id:", id);
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
