/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  
  // Real counts
  const [{ count: tastingsCount }, { count: resCount }, { count: subCount }] = await Promise.all([
    supabase.from('tastings').select('*', { count: 'exact', head: true }),
    supabase.from('reservations').select('*', { count: 'exact', head: true }),
    supabase.from('subscribers').select('*', { count: 'exact', head: true })
  ]);

  // Plazas vendidas
  const { data: resData } = await supabase.from('reservations').select('places').eq('status', 'CONFIRMED');
  const plazasVendidas = resData?.reduce((acc, curr) => acc + curr.places, 0) || 0;

  // Últimas reservas
  const { data: latestReservations } = await supabase
    .from('reservations')
    .select('*, profile:profiles(first_name, last_name, email), tasting:tastings(title_es, date)')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Catas Programadas" value={tastingsCount || 0} />
        <StatCard title="Reservas Totales" value={resCount || 0} />
        <StatCard title="Plazas Vendidas" value={plazasVendidas} />
        <StatCard title="Suscriptores" value={subCount || 0} />
      </div>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        <h2 className="text-xl font-serif text-[var(--color-warm-white)] mb-6 uppercase tracking-widest">Últimas Reservas</h2>
        
        {!latestReservations || latestReservations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Aún no hay reservas registradas.</p>
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
                {latestReservations.map((res: { id: string; profile?: { first_name?: string; email?: string; }; tasting?: { title_es?: string; }; places?: number; status?: string; }) => (
                  <tr key={res.id}>
                    <td className="py-4 text-gray-300">{res.profile?.first_name || res.profile?.email || 'N/A'}</td>
                    <td className="py-4 text-gray-300">{res.tasting?.title_es}</td>
                    <td className="py-4 text-[var(--color-gold)]">{res.places}</td>
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
