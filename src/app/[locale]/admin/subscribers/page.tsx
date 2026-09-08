import { createClient } from "@/lib/supabase/server";

export default async function AdminSubscribers({ searchParams }: { searchParams: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */ }) {
  const supabase = await createClient();
  const params = await searchParams;
  const q = params.q || "";
  
  let query = supabase.from('subscribers').select('*').order('created_at', { ascending: false });
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  
  const { data: subscribers } = await query;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Suscriptores</h1>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        <form className="mb-6 flex gap-4">
          <input 
            type="text" 
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email..." 
            className="flex-1 bg-black border border-[var(--color-charcoal)] p-3 text-white focus:outline-none focus:border-[var(--color-gold)]"
          />
          <button type="submit" className="bg-white text-black px-6 uppercase tracking-widest font-bold hover:bg-[var(--color-gold)] transition-colors">
            Buscar
          </button>
        </form>

        {!subscribers || subscribers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No se encontraron suscriptores.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Nombre</th>
                  <th className="pb-3 font-normal">Email</th>
                  <th className="pb-3 font-normal">Teléfono</th>
                  <th className="pb-3 font-normal">Idioma</th>
                  <th className="pb-3 font-normal">Intereses</th>
                  <th className="pb-3 font-normal">Comunicaciones</th>
                  <th className="pb-3 font-normal">Fecha Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {subscribers.map((sub: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */) => (
                  <tr key={sub.id}>
                    <td className="py-4 text-gray-300">{sub.name}</td>
                    <td className="py-4 text-[var(--color-gold)]">{sub.email}</td>
                    <td className="py-4 text-gray-400">{sub.phone || '-'}</td>
                    <td className="py-4 text-gray-400 uppercase">{sub.language}</td>
                    <td className="py-4 text-gray-400">{sub.interests || '-'}</td>
                    <td className="py-4">
                      <div className="text-xs space-y-1">
                        <p className={sub.consent_email ? 'text-green-500' : 'text-gray-600'}>Email: {sub.consent_email ? 'SÍ' : 'NO'}</p>
                        <p className={sub.consent_wa ? 'text-green-500' : 'text-gray-600'}>WA: {sub.consent_wa ? 'SÍ' : 'NO'}</p>
                      </div>
                    </td>
                    <td className="py-4 text-gray-500 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
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
