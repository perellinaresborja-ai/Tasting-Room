import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import CreateInvitationForm from "./CreateInvitationForm";

export default async function AdminInvitationsPage({ params }: { params: unknown }) {
  const { id, locale } = (await params) as unknown;
  const supabase = await createClient();
  
  const { data: tasting } = await supabase.from('tastings').select('id, title_es, title_en, capacity').eq('id', id).single();
  if (!tasting) notFound();

  // Load existing invitations
  const { data: invitations } = await supabase
    .from('reservations')
    .select('id, tickets, status, invitation_token, profile:profiles(first_name, last_name, phone, email)')
    .eq('tasting_id', id)
    .eq('reservation_type', 'INVITATION')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-12">
      <div>
        <Link href={`/admin/tastings`} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest mb-4 inline-block">&larr; Volver a Catas</Link>
        <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Invitaciones</h1>
        <p className="text-gray-400 mt-2">{tasting.title_es}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <CreateInvitationForm tastingId={tasting.id} locale={locale} tastingTitle={tasting.title_es} />
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-serif text-[var(--color-gold)] mb-6">Invitaciones Enviadas</h2>
          
          {!invitations || invitations.length === 0 ? (
            <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 text-center text-gray-500">
              No hay invitaciones creadas para esta cata.
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map(inv => (
                <div key={inv.id} className="bg-[#141414] border border-[var(--color-charcoal)] p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-lg text-white font-bold">{inv.profile?.first_name} {inv.profile?.last_name}</p>
                      <p className="text-gray-500 text-sm">{inv.profile?.phone || inv.profile?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--color-gold)] font-bold">{inv.tickets} plazas</p>
                      <span className={`px-2 py-1 text-xs uppercase tracking-wider inline-block mt-1 ${
                        inv.status === 'CONFIRMED' ? 'bg-green-900/30 text-green-400' :
                        inv.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                  
                  {inv.status !== 'CANCELLED' && inv.status !== 'REJECTED' && (
                    <div className="flex gap-4 border-t border-[var(--color-charcoal)] pt-4 mt-4">
                      <a 
                        href={`https://wa.me/${inv.profile?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${inv.profile?.first_name}! Tienes una invitación personal e intransferible para ${tasting.title_es}. Confirma tu asistencia aquí: ${process.env.NEXT_PUBLIC_SITE_URL}/es/invitation/${inv.invitation_token}`)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-green-500 hover:text-green-400 text-xs uppercase tracking-widest flex items-center gap-1"
                      >
                        Enviar WhatsApp
                      </a>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SITE_URL}/es/invitation/${inv.invitation_token}`);
                          alert('Enlace copiado');
                        }}
                        className="text-blue-500 hover:text-blue-400 text-xs uppercase tracking-widest"
                      >
                        Copiar Enlace
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
