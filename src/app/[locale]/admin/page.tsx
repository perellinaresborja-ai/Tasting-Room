/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { classifyTasting } from "@/lib/utils/tastingClassification";
import { formatDate } from "@/lib/utils/formatDate";
import { Link } from "@/i18n/routing";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: allTastings }, { data: allReservations }, { count: subCount }] = await Promise.all([
    supabase.from('tastings').select('*').order('date', { ascending: true }),
    supabase
      .from('reservations')
      .select('*, profile:profiles(first_name, last_name, email), tasting:tastings(id, title_es, date, start_time, end_time, status)')
      .order('created_at', { ascending: false }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true })
  ]);

  const upcomingTastings = (allTastings || []).filter(
    (t) => classifyTasting(t) === 'UPCOMING'
  );
  const upcomingIds = new Set(upcomingTastings.map((t) => t.id));

  // Count ONLY reservations belonging to active/open upcoming tastings (closed tastings never mix in)
  const activeConfirmedReservations = (allReservations || []).filter(
    (r) => r.status === 'CONFIRMED' && upcomingIds.has(r.tasting_id)
  );

  const resCount = activeConfirmedReservations.length;
  const plazasVendidas = activeConfirmedReservations.reduce(
    (acc, curr) => acc + (curr.tickets || 0),
    0
  );

  const perTastingStats = upcomingTastings.map((t) => {
    const confirmedForTasting = activeConfirmedReservations.filter((r) => r.tasting_id === t.id);
    const sold = confirmedForTasting.reduce((acc, r) => acc + (r.tickets || 0), 0);
    const revenue = confirmedForTasting.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
    return {
      ...t,
      reservationsCount: confirmedForTasting.length,
      soldSeats: sold,
      freeSeats: Math.max(0, (t.capacity || 0) - sold),
      revenue,
    };
  });

  const latestActiveReservations = (allReservations || [])
    .filter((r) => upcomingIds.has(r.tasting_id) && r.status !== 'EXPIRED')
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Catas Abiertas" value={upcomingTastings.length} />
        <StatCard title="Reservas Activas" value={resCount} />
        <StatCard title="Plazas Vendidas (Activas)" value={plazasVendidas} />
        <StatCard title="Suscriptores" value={subCount || 0} />
      </div>

      {/* Desglose separado por cada cata abierta */}
      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        <h2 className="text-xl font-serif text-[var(--color-warm-white)] mb-6 uppercase tracking-widest">
          Ocupación por Cata Abierta
        </h2>

        {perTastingStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay catas próximas abiertas ahora mismo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Cata</th>
                  <th className="pb-3 font-normal">Fecha</th>
                  <th className="pb-3 font-normal">Reservas</th>
                  <th className="pb-3 font-normal">Plazas Ocupadas</th>
                  <th className="pb-3 font-normal">Libres</th>
                  <th className="pb-3 font-normal">Facturación</th>
                  <th className="pb-3 font-normal text-right">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {perTastingStats.map((t) => (
                  <tr key={t.id}>
                    <td className="py-4 text-white font-serif text-base">{t.title_es}</td>
                    <td className="py-4 text-gray-400">{formatDate(t.date, 'es', true)}</td>
                    <td className="py-4 text-gray-300">{t.reservationsCount}</td>
                    <td className="py-4 text-[var(--color-gold)] font-semibold">
                      {t.soldSeats} / {t.capacity}
                    </td>
                    <td className="py-4 text-gray-300">{t.freeSeats}</td>
                    <td className="py-4 text-gray-300">€{t.revenue}</td>
                    <td className="py-4 text-right">
                      <Link
                        href={{ pathname: '/admin/tastings/[id]/attendees', params: { id: t.id } }}
                        className="text-xs uppercase tracking-wider text-[var(--color-gold)] hover:underline"
                      >
                        Ver asistentes →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        <h2 className="text-xl font-serif text-[var(--color-warm-white)] mb-6 uppercase tracking-widest">
          Últimas Reservas (Catas Abiertas)
        </h2>
        
        {latestActiveReservations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Aún no hay reservas registradas en las catas abiertas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Cliente</th>
                  <th className="pb-3 font-normal">Cata</th>
                  <th className="pb-3 font-normal">Plazas</th>
                  <th className="pb-3 font-normal">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {latestActiveReservations.map((res: { id: string; profile?: { first_name?: string; last_name?: string; email?: string; }; tasting?: { title_es?: string; }; tickets?: number; status?: string; }) => (
                  <tr key={res.id}>
                    <td className="py-4 text-gray-300">
                      {`${res.profile?.first_name || ''} ${res.profile?.last_name || ''}`.trim() || res.profile?.email || 'N/A'}
                    </td>
                    <td className="py-4 text-gray-300">{res.tasting?.title_es}</td>
                    <td className="py-4 text-[var(--color-gold)]">{res.tickets}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-xs uppercase tracking-wider ${res.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
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

function StatCard({ title, value }: { title: string, value: number | string }) {
  return (
    <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6 flex flex-col items-center text-center">
      <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-4">{title}</h3>
      <p className="text-4xl font-serif text-[var(--color-gold)]">{value}</p>
    </div>
  );
}
