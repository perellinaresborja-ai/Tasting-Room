/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/formatDate";
import CancelButton from "./CancelButton";

export default async function AdminReservations() {
  const supabase = await createClient();
  
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, profile:profiles(first_name, last_name, email), tasting:tastings(title_es, date)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Reservas</h1>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        {!reservations || reservations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay reservas en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Fecha Reserva</th>
                  <th className="pb-3 font-normal">Cliente</th>
                  <th className="pb-3 font-normal">Cata</th>
                  <th className="pb-3 font-normal">Plazas</th>
                  <th className="pb-3 font-normal">Importe</th>
                  <th className="pb-3 font-normal">Pago</th>
                  <th className="pb-3 font-normal">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {reservations.map((res: unknown) => (
                  <tr key={res.id}>
                    <td className="py-4 text-gray-500 text-xs">{new Date(res.created_at).toLocaleString('es-ES')}</td>
                    <td className="py-4 text-gray-300">
                      <div>{res.profile?.first_name} {res.profile?.last_name}</div>
                      <div className="text-xs text-gray-500">{res.profile?.email}</div>
                    </td>
                    <td className="py-4 text-gray-300">
                      {res.tasting?.title_es}
                      <span className="text-gray-500 text-xs block">{res.tasting?.date ? formatDate(res.tasting.date, 'es', true) : ''}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
