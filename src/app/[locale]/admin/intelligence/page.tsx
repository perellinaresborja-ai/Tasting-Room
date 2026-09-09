import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";

export default async function IntelligenceDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  // Basic fetch
  const { data: tastings } = await supabase.from('tastings').select('*').order('date', { ascending: false }).limit(20);
  const { data: reservations } = await supabase.from('reservations').select('*, profiles(first_name, last_name, email, phone)');
  
  const safeTastings = tastings || [];
  const safeReservations = reservations || [];

  // Calculate some intelligence metrics
  // "Checkout abandonado" (EXPIRED or OLD PENDING)
  const recentAbandonments = safeReservations.filter((r: any) => {
    if (r.status === 'CONFIRMED') return false;
    const isRecent = new Date(r.created_at).getTime() > Date.now() - 48 * 60 * 60 * 1000; // Last 48h
    return isRecent && (r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000));
  });

  const abandonedValue = recentAbandonments.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
  const abandonedPlazas = recentAbandonments.reduce((sum: number, r: any) => sum + (r.tickets || 0), 0);

  // Alertas
  const { data: alerts } = await supabase.from('commercial_alerts').select('*').eq('status', 'PENDING');

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest border-b border-[var(--color-charcoal)] pb-4">
        Inteligencia Comercial
      </h1>

      {/* ALERTAS */}
      <section>
        <h2 className="text-xl font-bold text-red-500 mb-6 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Hoy / Requiere Atención
        </h2>
        
        {(!alerts || alerts.length === 0) ? (
          <div className="bg-[#111] p-6 border border-[var(--color-charcoal)] text-gray-500 text-sm uppercase tracking-widest text-center">
            No hay alertas comerciales activas
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert: any) => (
              <div key={alert.id} className="bg-[#1a0f0f] border border-red-900 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <h3 className="text-[10px] text-red-400 uppercase tracking-widest mb-1">{alert.alert_type}</h3>
                <h4 className="text-lg font-bold text-white mb-2">{alert.title}</h4>
                <p className="text-gray-400 text-sm mb-4">{alert.description}</p>
                {alert.action_url && (
                  <Link href={alert.action_url as any} className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-widest hover:text-white">
                    {alert.action_text || 'Ver Detalle'} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RECUPERACIÓN DE CONVERSIÓN */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Recuperación de Conversión (24-48h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-black border border-[var(--color-charcoal)] p-4 flex flex-col justify-center">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Abandonos Recientes</h3>
            <p className="text-3xl font-bold text-orange-400">{recentAbandonments.length}</p>
          </div>
          <div className="bg-black border border-[var(--color-charcoal)] p-4 flex flex-col justify-center">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Plazas Potenciales</h3>
            <p className="text-3xl font-bold text-white">{abandonedPlazas}</p>
          </div>
          <div className="bg-black border border-[var(--color-charcoal)] p-4 flex flex-col justify-center">
            <h3 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Valor Potencial</h3>
            <p className="text-3xl font-bold text-green-400">€{abandonedValue.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* LEADS POR EXPERIENCIA */}
      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Leads por Experiencia</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-[var(--color-gold)] uppercase tracking-widest bg-[#111]">
              <tr>
                <th className="p-3">Experiencia</th>
                <th className="p-3">Confirmados</th>
                <th className="p-3">Abandonos Totales</th>
                <th className="p-3">Demanda Perdida</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-charcoal)] bg-black">
              {safeTastings.map((t: any) => {
                const resT = safeReservations.filter((r: any) => r.tasting_id === t.id);
                const confT = resT.filter((r: any) => r.status === 'CONFIRMED');
                const abndT = resT.filter((r: any) => r.status === 'EXPIRED' || r.status === 'CANCELLED' || (r.status === 'PENDING' && new Date(r.created_at).getTime() < Date.now() - 15 * 60 * 1000));
                
                return (
                  <tr key={t.id} className="hover:bg-[#111]">
                    <td className="p-3 font-bold text-white">{t.title_es}</td>
                    <td className="p-3">{confT.length}</td>
                    <td className="p-3 text-orange-400">{abndT.length}</td>
                    <td className="p-3 text-red-400">
                       {/* Calculate tickets that were abandoned */}
                       {abndT.reduce((sum: number, r: any) => sum + (r.tickets || 0), 0)} plazas
                    </td>
                    <td className="p-3 text-right">
                       <button className="text-[10px] uppercase tracking-widest border border-[var(--color-gold)] text-[var(--color-gold)] px-2 py-1 hover:bg-[var(--color-gold)] hover:text-black transition-colors">
                         Segmentar
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ARCHITECTURE NOTICE */}
      <section className="bg-[#111] p-6 border border-[var(--color-charcoal)] mt-12">
        <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Módulos en Arquitectura</h2>
        <div className="text-sm text-gray-400 space-y-4">
          <p>La base de datos ya está registrando las tablas necesarias para soportar:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Atribución (UTMs):</strong> La tabla <code className="text-white bg-black px-1">analytics_events</code> está desplegada.</li>
            <li><strong>Alertas Comerciales:</strong> El motor puede insertar alertas programáticas en <code className="text-white bg-black px-1">commercial_alerts</code>.</li>
            <li><strong>Funnel Completo:</strong> Listo para recopilar <code>tasting_view</code>, <code>booking_click</code>, etc., respetando normativas (sin PII).</li>
            <li><strong>Comparador Inteligente:</strong> Disponible una vez el volumen de históricos sea &gt; 5 eventos de la misma categoría.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
