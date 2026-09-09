import { createClient } from "@/lib/supabase/server";
import AdminTastingForm from "../AdminTastingForm";
import { notFound } from "next/navigation";
import { generateTastingReport } from "@/lib/intelligence/reportsEngine";

export default async function EditTastingPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: tasting } = await supabase.from('tastings').select('*').eq('id', id).single();
  
  if (!tasting) { notFound(); }

  let report = null;
  if (tasting.status === 'COMPLETED') {
    await generateTastingReport(id).catch(console.error);
    const { data: r } = await supabase.from('tasting_reports').select('*').eq('tasting_id', id).single();
    if (r) report = r.metrics;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">
        {tasting.status === 'COMPLETED' ? 'Detalle de la Cata (Completada)' : 'Editar Cata'}
      </h1>

      {report && (
        <section className="bg-[#111] p-6 border border-[var(--color-charcoal)]">
          <h2 className="text-xl font-bold text-[var(--color-gold)] mb-4 uppercase tracking-wider">Reporte de Rendimiento</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Ocupación</p>
              <p className="text-lg font-bold text-white">{Math.round(report.occupancy_pct)}% ({report.tickets_sold}/{report.capacity})</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Ingresos</p>
              <p className="text-lg font-bold text-green-400">€{report.revenue?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Asistencia</p>
              <p className="text-lg font-bold text-white">{report.check_ins} Check-ins <span className="text-red-400 text-xs">({report.no_shows} No-shows)</span></p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Valoración</p>
              <p className="text-lg font-bold text-white">{report.avg_rating ? `${report.avg_rating.toFixed(1)}/5` : 'Sin datos'} <span className="text-gray-500 text-xs">({report.rating_count} valoraciones)</span></p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Abandonos (Checkout)</p>
              <p className="text-lg font-bold text-orange-400">{report.abandoned_tickets} Plazas</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Demanda no atendida</p>
              <p className="text-lg font-bold text-orange-400">{report.unmet_demand} Plazas</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-[10px]">Mejor Canal</p>
              <p className="text-lg font-bold text-white uppercase">{report.top_channel}</p>
              {report.top_channel !== 'Sin datos' && (
                <p className="text-[10px] text-gray-500">{report.top_channel_conversions} conversiones</p>
              )}
            </div>
          </div>
        </section>
      )}

      <AdminTastingForm initialData={tasting} />
    </div>
  );
}
