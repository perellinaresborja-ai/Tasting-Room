/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { classifyTasting } from "@/lib/utils/tastingClassification";
import TastingRowActions from "./TastingRowActions";

export default async function AdminTastings() {
  const supabase = await createClient();
  
  const { data: tastings } = await supabase
    .from('tastings')
    .select('*')
    .order('date', { ascending: false });

  const allTastings = tastings || [];
  const openTastings = allTastings
    .filter((t: any) => classifyTasting(t) !== 'PAST')
    .sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
  const closedTastings = allTastings.filter((t: any) => classifyTasting(t) === 'PAST');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Catas</h1>
          <p className="text-xs text-gray-400 mt-1">
            Importante: para cada evento nuevo pulsa siempre «Nueva Cata» (no cambies la fecha de una cata anterior para no arrastrar sus reservas).
          </p>
        </div>
        <Link href="/admin/tastings/new" className="bg-[var(--color-gold)] text-black px-4 py-2 text-sm uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors self-start sm:self-auto">
          Nueva Cata
        </Link>
      </div>

      {/* Catas Abiertas / Borradores */}
      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        <h2 className="text-lg font-serif text-[var(--color-warm-white)] uppercase tracking-widest mb-4">
          Catas Activas / Próximas
        </h2>
        {openTastings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay catas próximas creadas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Título</th>
                  <th className="pb-3 font-normal">Fecha y Hora</th>
                  <th className="pb-3 font-normal">Precio</th>
                  <th className="pb-3 font-normal">Capacidad</th>
                  <th className="pb-3 font-normal">Estado</th>
                  <th className="pb-3 font-normal text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {openTastings.map((tasting: any) => (
                  <tr key={tasting.id}>
                    <td className="py-4 text-gray-300 font-serif">{tasting.title_es}</td>
                    <td className="py-4 text-gray-400">{tasting.date} {tasting.start_time}</td>
                    <td className="py-4 text-[var(--color-gold)]">{tasting.price}€</td>
                    <td className="py-4 text-gray-300">{tasting.capacity}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-xs uppercase tracking-wider ${
                        tasting.status === 'PUBLISHED' ? 'bg-green-900/30 text-green-400' : 
                        tasting.status === 'DRAFT' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {tasting.status === 'PUBLISHED' ? 'ABIERTA' : tasting.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <TastingRowActions id={tasting.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catas Cerradas / Pasadas */}
      {closedTastings.length > 0 && (
        <div className="bg-[#0e0e0e] border border-[var(--color-charcoal)] p-6 opacity-85">
          <h2 className="text-lg font-serif text-gray-400 uppercase tracking-widest mb-4">
            Catas Cerradas / Finalizadas ({closedTastings.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Título</th>
                  <th className="pb-3 font-normal">Fecha y Hora</th>
                  <th className="pb-3 font-normal">Precio</th>
                  <th className="pb-3 font-normal">Capacidad</th>
                  <th className="pb-3 font-normal">Estado</th>
                  <th className="pb-3 font-normal text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {closedTastings.map((tasting: any) => (
                  <tr key={tasting.id}>
                    <td className="py-4 text-gray-400 font-serif">{tasting.title_es}</td>
                    <td className="py-4 text-gray-500">{tasting.date} {tasting.start_time}</td>
                    <td className="py-4 text-gray-400">{tasting.price}€</td>
                    <td className="py-4 text-gray-400">{tasting.capacity}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 text-xs uppercase tracking-wider bg-gray-800 text-gray-400 border border-gray-700">
                        CERRADA
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <TastingRowActions id={tasting.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
