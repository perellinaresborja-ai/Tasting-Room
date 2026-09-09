import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createClient } from "@/lib/supabase/server";

export default async function StatisticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const { data: tastings } = await supabase.from("tastings").select("*");
  const { data: reservations } = await supabase.from("reservations").select("*, profiles(first_name, last_name, email, phone)");

  const safeTastings = tastings || [];
  const safeReservations = reservations || [];

  const completedTastings = safeTastings.filter((t: any) => t.status === "COMPLETED").length;
  const confirmedRes = safeReservations.filter((r: any) => r.status === "CONFIRMED");
  const ticketsSold = confirmedRes.reduce((acc: number, r: any) => acc + (r.tickets || 0), 0);
  const totalRevenue = confirmedRes.reduce((acc: number, r: any) => acc + (Number(r.total_amount) || 0), 0);
  const totalCapacity = safeTastings.reduce((acc: number, t: any) => acc + (t.capacity || 0), 0);
  const avgOccupancy = totalCapacity > 0 ? (ticketsSold / totalCapacity) * 100 : 0;
  const realAttendance = confirmedRes.filter((r: any) => r.check_in_time).reduce((acc: number, r: any) => acc + (r.tickets || 0), 0);
  
  const uniqueClients = new Set(confirmedRes.map((r: any) => r.profile_id)).size;
  const clientCounts = confirmedRes.reduce((acc: any, r: any) => {
    if (r.profile_id) acc[r.profile_id] = (acc[r.profile_id] || 0) + 1;
    return acc;
  }, {});
  const returningClients = Object.values(clientCounts).filter((count: any) => count > 1).length;

  const abandonedRes = safeReservations.filter((r: any) => {
    if (r.status === "EXPIRED" || r.status === "CANCELLED" || (r.status === "PENDING" && r.payment_status === "ABANDONED")) return true;
    if (r.status === "PENDING") {
      const isOld = new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000;
      return isOld;
    }
    return false;
  });

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest border-b border-[var(--color-charcoal)] pb-4">
        Estadísticas y Rendimiento
      </h1>
      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Dashboard General</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Experiencias Realizadas" value={completedTastings} />
          <StatCard title="Plazas Vendidas" value={ticketsSold} />
          <StatCard title="Facturación" value={`€${totalRevenue.toFixed(2)}`} />
          <StatCard title="Ocupación Media" value={`${avgOccupancy.toFixed(1)}%`} />
          <StatCard title="Asistencia Real" value={realAttendance} />
          <StatCard title="Clientes Únicos" value={uniqueClients} />
          <StatCard title="Clientes Recurrentes" value={returningClients} />
          <StatCard title="Leads / Abandonos" value={abandonedRes.length} />
          <StatCard title="Valoración Media" value="Sin datos" />
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Rendimiento de Experiencias</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-[var(--color-gold)] uppercase tracking-widest bg-[#111]">
              <tr>
                <th className="p-3">Experiencia</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Ocupación</th>
                <th className="p-3">Facturación</th>
                <th className="p-3">Asistencia</th>
                <th className="p-3">Interesados perdidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-charcoal)] bg-black">
              {safeTastings.map((t: any) => {
                const resT = safeReservations.filter((r: any) => r.tasting_id === t.id);
                const confT = resT.filter((r: any) => r.status === "CONFIRMED");
                const abndT = resT.filter((r: any) => r.status === "EXPIRED" || r.status === "CANCELLED" || (r.status === "PENDING" && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000));
                
                const tix = confT.reduce((acc: number, r: any) => acc + (r.tickets || 0), 0);
                const rev = confT.reduce((acc: number, r: any) => acc + (Number(r.total_amount) || 0), 0);
                const occ = t.capacity > 0 ? Math.round((tix / t.capacity) * 100) : 0;
                const att = confT.filter((r: any) => r.check_in_time).reduce((acc: number, r: any) => acc + (r.tickets || 0), 0);

                return (
                  <tr key={t.id} className="hover:bg-[#111]">
                    <td className="p-3 font-bold text-white">{t.title_es} <br/><span className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</span></td>
                    <td className="p-3">{t.category || 'Sin categorizar'}</td>
                    <td className="p-3">{tix}/{t.capacity} ({occ}%)</td>
                    <td className="p-3">€{rev.toFixed(2)}</td>
                    <td className="p-3">{att}</td>
                    <td className="p-3 text-orange-400">{abndT.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Demanda y Planificación</h2>
        <div className="bg-[#111] p-6 border border-[var(--color-charcoal)] text-center">
          <p className="text-gray-500 text-sm uppercase tracking-widest">Sin datos suficientes todavía para planificaciones avanzadas</p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) {
  return (
    <div className="bg-black border border-[var(--color-charcoal)] p-4 flex flex-col justify-center">
      <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-[10px] text-orange-400 mt-2">{subtitle}</p>}
    </div>
  );
}
