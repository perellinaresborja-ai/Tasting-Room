/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/formatDate";
import { classifyTasting } from "@/lib/utils/tastingClassification";
import ReservationRowActions from "./ReservationRowActions";

function ReservationTable({ reservations }: { reservations: any[] }) {
  if (!reservations || reservations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Todavía no hay reservas registradas en esta cata.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
          <tr>
            <th className="pb-3 font-normal">Fecha Reserva</th>
            <th className="pb-3 font-normal">Cliente</th>
            <th className="pb-3 font-normal">Plazas</th>
            <th className="pb-3 font-normal">Importe</th>
            <th className="pb-3 font-normal">Pago</th>
            <th className="pb-3 font-normal">Estado</th>
            <th className="pb-3 font-normal text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-charcoal)]">
          {reservations.map((res: any) => (
            <tr key={res.id}>
              <td className="py-4 text-gray-500 text-xs">{new Date(res.created_at).toLocaleString('es-ES')}</td>
              <td className="py-4 text-gray-300">
                <div>{res.profile?.first_name} {res.profile?.last_name}</div>
                <div className="text-xs text-gray-500">{res.profile?.email}</div>
              </td>
              <td className="py-4 text-[var(--color-gold)] font-serif text-lg">{res.tickets}</td>
              <td className="py-4 text-gray-300">€{res.total_amount}</td>
              <td className="py-4">
                <span className={`px-2 py-1 text-xs uppercase tracking-wider ${res.payment_status === 'PAID' ? 'bg-green-900/30 text-green-400 border border-green-800' : res.payment_status === 'FAILED' ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-gray-800 text-gray-400 border border-gray-600'}`}>
                  {res.payment_status}
                </span>
              </td>
              <td className="py-4">
                <span className={`px-2 py-1 text-xs uppercase tracking-wider ${res.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400' : res.status === 'CANCELLED' ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                  {res.status}
                </span>
              </td>
              <td className="py-4 text-right">
                <ReservationRowActions id={res.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminReservations() {
  const supabase = await createClient();

  const [{ data: tastings }, { data: reservations }] = await Promise.all([
    supabase.from('tastings').select('*').order('date', { ascending: true }),
    supabase
      .from('reservations')
      .select('*, profile:profiles(first_name, last_name, email), tasting:tastings(id, title_es, date, start_time, end_time, status, capacity)')
      .order('created_at', { ascending: false })
  ]);

  const allTastings = tastings || [];
  const allReservations = reservations || [];

  const upcomingTastings = allTastings.filter((t) => classifyTasting(t) === 'UPCOMING');
  const closedTastings = allTastings
    .filter((t) => classifyTasting(t) === 'PAST')
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Reservas por Cata</h1>
        <p className="text-xs text-gray-400 mt-2">
          Cada cata tiene su listado independiente. Cuando una cata finaliza, queda cerrada automáticamente y pasa al archivo inferior.
        </p>
      </div>

      {/* Catas Abiertas / Próximas */}
      <div className="space-y-6">
        {upcomingTastings.length === 0 ? (
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 text-center text-gray-500">
            No hay catas abiertas en este momento.
          </div>
        ) : (
          upcomingTastings.map((tasting) => {
            const tastingReservations = allReservations.filter((r) => r.tasting_id === tasting.id);
            const confirmed = tastingReservations.filter((r) => r.status === 'CONFIRMED');
            const soldSeats = confirmed.reduce((acc, r) => acc + (r.tickets || 0), 0);

            return (
              <div key={tasting.id} className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-[var(--color-charcoal)]">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-800 mr-2">
                      ABIERTA
                    </span>
                    <h2 className="inline text-xl font-serif text-[var(--color-warm-white)]">
                      {tasting.title_es}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(tasting.date, 'es', true)} {tasting.start_time ? `· ${String(tasting.start_time).slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="mr-4">
                      Reservas confirmadas: <strong className="text-white">{confirmed.length}</strong>
                    </span>
                    <span>
                      Plazas vendidas: <strong className="text-[var(--color-gold)]">{soldSeats} / {tasting.capacity}</strong>
                    </span>
                  </div>
                </div>

                <ReservationTable reservations={tastingReservations} />
              </div>
            );
          })
        )}
      </div>

      {/* Archivo de Catas Cerradas */}
      {closedTastings.length > 0 && (
        <details className="bg-[#0e0e0e] border border-[var(--color-charcoal)] p-6 group">
          <summary className="cursor-pointer text-sm uppercase tracking-widest text-gray-400 hover:text-[var(--color-gold)] font-semibold">
            Archivo de Catas Cerradas / Realizadas ({closedTastings.length})
          </summary>
          <div className="space-y-6 mt-6">
            {closedTastings.map((tasting) => {
              const tastingReservations = allReservations.filter((r) => r.tasting_id === tasting.id);
              const confirmed = tastingReservations.filter((r) => r.status === 'CONFIRMED');
              const soldSeats = confirmed.reduce((acc, r) => acc + (r.tickets || 0), 0);

              return (
                <div key={tasting.id} className="bg-[#141414] border border-[var(--color-charcoal)] p-5 opacity-80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--color-charcoal)]">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 mr-2">
                        CERRADA
                      </span>
                      <span className="text-base font-serif text-gray-200">{tasting.title_es}</span>
                      <span className="text-xs text-gray-500 ml-2">({formatDate(tasting.date, 'es', true)})</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {confirmed.length} reservas · {soldSeats} / {tasting.capacity} plazas finales
                    </div>
                  </div>
                  <ReservationTable reservations={tastingReservations} />
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
