import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createClient } from "@/lib/supabase/server";

import Link from "next/link";
import CampaignBuilder from "@/components/admin/CampaignBuilder";
import RetryCampaignButton from "@/components/admin/RetryCampaignButton";

export default async function CommunicationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdmin(locale);
  const supabase = await createClient();

  const { data: comms } = await supabase.from('communications').select('*').order('created_at', { ascending: false });
  const { data: tastings } = await supabase.from('tastings').select('id, title_es');

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end border-b border-[var(--color-charcoal)] pb-4">
        <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">
          Comunicaciones
        </h1>
        <Link href={{ pathname: '/admin/communications', query: { new: 'true' } }} className="bg-[var(--color-gold)] text-black px-6 py-2 uppercase tracking-widest font-bold text-xs hover:bg-white transition-colors">
          Nueva Campaña
        </Link>
      </div>

      <CampaignBuilder initialLocale={locale} tastings={tastings || []} />

      <section>
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">Historial de Envíos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs text-[var(--color-gold)] uppercase tracking-widest bg-[#111]">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Asunto</th>
                <th className="p-3">Segmento</th>
                <th className="p-3">Canal</th>
                <th className="p-3">Destinatarios</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-charcoal)] bg-black">
              {(!comms || comms.length === 0) ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 uppercase tracking-widest text-xs">
                    No hay comunicaciones enviadas
                  </td>
                </tr>
              ) : (
                comms.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#111]">
                    <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-white">{c.subject}</td>
                    <td className="p-3">{c.segment}</td>
                    <td className="p-3">{c.channel}</td>
                    <td className="p-3">
                      {c.accepted_count !== undefined && c.accepted_count !== null 
                        ? `${c.accepted_count} / ${c.recipients_count}` 
                        : c.recipients_count}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        c.status === 'ACCEPTED' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                        c.status === 'PARTIAL' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' :
                        c.status === 'FAILED' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                        c.status === 'SENDING' ? 'bg-blue-900/30 text-blue-400 border border-blue-800' :
                        c.status === 'SENT' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {c.status === 'ACCEPTED' ? 'ACEPTADO' :
                         c.status === 'PARTIAL' ? 'PARCIAL' :
                         c.status === 'FAILED' ? 'FALLIDO' :
                         c.status === 'SENDING' ? 'ENVIANDO...' :
                         c.status === 'SENT' ? 'ENVIADO' :
                         c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {(c.status === 'PARTIAL' || c.status === 'FAILED') && (
                        <RetryCampaignButton campaignId={c.id} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
