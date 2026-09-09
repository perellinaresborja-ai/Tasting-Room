/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/server";

export default async function AdminClients() {
  const supabase = await createClient();
  
  const { data: clients } = await supabase
    .from('profiles')
    .select('*, reservations(id, status, places, total_amount)')
    .eq('role', 'CUSTOMER')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Clientes</h1>

      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
        {!clients || clients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay clientes registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-500 border-b border-[var(--color-charcoal)]">
                <tr>
                  <th className="pb-3 font-normal">Nombre</th>
                  <th className="pb-3 font-normal">Email</th>
                  <th className="pb-3 font-normal">Teléfono</th>
                  <th className="pb-3 font-normal">Reservas</th>
                  <th className="pb-3 font-normal">Importe Total</th>
                  <th className="pb-3 font-normal">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {clients.map((client: any) => {
                  const totalReservations = client.reservations?.length || 0;
                  const totalSpent = client.reservations?.filter((r: unknown) => r.status === 'CONFIRMED').reduce((acc: number, r: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */) => acc + Number(r.total_amount), 0) || 0;
                  
                  return (
                    <tr key={client.id}>
                      <td className="py-4 text-gray-300">{client.first_name || '-'} {client.last_name || ''}</td>
                      <td className="py-4 text-[var(--color-gold)]">{client.email}</td>
                      <td className="py-4 text-gray-400">{client.phone || '-'}</td>
                      <td className="py-4 text-gray-300">{totalReservations}</td>
                      <td className="py-4 text-[var(--color-gold)]">{totalSpent}€</td>
                      <td className="py-4 text-gray-500 text-xs">{new Date(client.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
