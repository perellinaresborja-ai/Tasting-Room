import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";


export default async function AdminTastings() {
  const supabase = await createClient();
  
  const { data: tastings } = await supabase
    .from('tastings')
    .select('*')
    .order('date', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Catas</h1>
        <Link href="/admin/tastings/new" className="bg-[var(--color-gold)] text-black px-4 py-2 text-sm uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors">
          Nueva Cata
        </Link>
      </div>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        {!tastings || tastings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay catas creadas.</p>
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
                {tastings.map((tasting: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
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
                        {tasting.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <Link href={`/admin/tastings/${tasting.id}`} className="text-[var(--color-gold)] hover:underline uppercase tracking-widest text-xs">Editar</Link>
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
