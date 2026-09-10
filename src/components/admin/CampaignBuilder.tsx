'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';

type Recipient = { id: string; email: string; name: string; hasEmailConsent: boolean; hasWaConsent: boolean; phone?: string; type: 'client' | 'subscriber' | 'lead' };

import { getAudience, sendCampaign } from '@/app/actions/communications';

export default function CampaignBuilder({ initialTastingId, initialSegment, initialLocale, tastings }: { initialTastingId?: string; initialSegment?: string; initialLocale: string; tastings: {id:string; title_es:string}[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tId = searchParams.get('tastingId') || initialTastingId || '';
  const seg = searchParams.get('segment') || initialSegment || 'all';
  const showNew = searchParams.get('new') === 'true' || tId || seg !== 'all';

  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState<'clients' | 'subscribers' | 'both'>('clients');
  const [filterType, setFilterType] = useState(seg);
  const [selectedTastingId, setSelectedTastingId] = useState(tId);
  
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const loadRecipients = async () => {
    setLoading(true);
    try {
      const data = await getAudience({ audience, filterType, tastingId: selectedTastingId });
      setRecipients(data || []);
      // Auto-select those with consent for the current channel
      const validIds = (data || [])
        .filter((r: Recipient) => channel === 'EMAIL' ? r.hasEmailConsent : (r.hasWaConsent && r.phone))
        .map((r: Recipient) => r.id);
      setSelectedIds(new Set(validIds));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setStep(2);
  };

  const contactable = recipients.filter(r => channel === 'EMAIL' ? r.hasEmailConsent : (r.hasWaConsent && r.phone));
  const contactableSelected = Array.from(selectedIds).filter(id => {
    const r = recipients.find(x => x.id === id);
    return r && (channel === 'EMAIL' ? r.hasEmailConsent : (r.hasWaConsent && r.phone));
  });

  const handleSend = async () => {
    if (!confirm('¿Estás seguro de guardar esta campaña? El envío real de emails requiere integración de producción (Resend). Se guardará como BORRADOR.')) return;
    setLoading(true);
    try {
      await sendCampaign({
        channel,
        segment: `${audience}-${filterType}`,
        subject,
        message,
        recipientIds: contactableSelected,
      });
      alert('Campaña guardada como borrador con éxito.');
      router.push(`/admin/communications`);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Error de red.');
    }
    setLoading(false);
  };

  if (!showNew) return null;

  return (
    <div className="bg-[#141414] border border-[var(--color-charcoal)] p-6 mt-6">
      <h2 className="text-xl font-serif text-[var(--color-gold)] uppercase tracking-widest mb-6">Nueva Campaña</h2>
      
      {/* STEP 1: AUDIENCE */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-2">Canal</label>
              <select className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white" value={channel} onChange={e => setChannel(e.target.value as any)}>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp (No conectado)</option>
              </select>
              {channel === 'WHATSAPP' && <p className="text-orange-400 text-xs mt-1">El proveedor de WhatsApp aún no está configurado en producción.</p>}
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-2">Audiencia Base</label>
              <select className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white" value={audience} onChange={e => setAudience(e.target.value as any)}>
                <option value="clients">Solo Clientes (con cuenta/reserva)</option>
                <option value="subscribers">Solo Suscriptores (newsletter)</option>
                <option value="both">Ambos</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs uppercase text-gray-500 mb-2">Filtro de Segmento</label>
            <select className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Todos</option>
              <option value="recurring">Clientes Recurrentes</option>
              <option value="interested">Interesados / Abandonos (Requiere Cata)</option>
              <option value="attendees">Asistentes confirmados (Requiere Cata)</option>
            </select>
          </div>

          {(filterType === 'interested' || filterType === 'attendees') && (
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-2">Seleccionar Experiencia</label>
              <select className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white" value={selectedTastingId} onChange={e => setSelectedTastingId(e.target.value)}>
                <option value="">Seleccione una cata...</option>
                {tastings.map(t => <option key={t.id} value={t.id}>{t.title_es}</option>)}
              </select>
            </div>
          )}

          <button onClick={loadRecipients} disabled={loading || ((filterType==='interested'||filterType==='attendees') && !selectedTastingId)} className="bg-[var(--color-gold)] text-black px-6 py-3 uppercase font-bold text-xs hover:bg-white transition-colors disabled:opacity-50">
            {loading ? 'Cargando...' : 'Cargar Destinatarios'}
          </button>
        </div>
      )}

      {/* STEP 2: RECIPIENTS */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-black p-4 border border-[var(--color-charcoal)]">
            <div>
              <p className="text-gray-400 text-sm">Detectados: <span className="text-white font-bold">{recipients.length}</span></p>
              <p className="text-gray-400 text-sm">Contactables ({channel}): <span className="text-[var(--color-gold)] font-bold">{contactable.length}</span></p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Seleccionados válidos: <span className="text-green-400 font-bold">{contactableSelected.length}</span></p>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto border border-[var(--color-charcoal)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#111] text-xs text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="p-2 w-10">Sel</th>
                  <th className="p-2">Email/Teléfono</th>
                  <th className="p-2">Consentimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-charcoal)]">
                {recipients.map(r => {
                  const hasConsent = channel === 'EMAIL' ? r.hasEmailConsent : (r.hasWaConsent && !!r.phone);
                  return (
                    <tr key={r.id} className={hasConsent ? 'text-white' : 'text-gray-600'}>
                      <td className="p-2">
                        <input 
                          type="checkbox" 
                          disabled={!hasConsent} 
                          checked={selectedIds.has(r.id)}
                          onChange={e => {
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) newSet.add(r.id);
                            else newSet.delete(r.id);
                            setSelectedIds(newSet);
                          }}
                        />
                      </td>
                      <td className="p-2">{r.email || r.phone} <span className="text-[10px] ml-2 uppercase text-gray-500">[{r.type}]</span></td>
                      <td className="p-2 text-xs">
                        {hasConsent ? <span className="text-green-500">Sí</span> : <span className="text-red-500">No ({channel})</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="border border-[var(--color-charcoal)] text-white px-6 py-3 uppercase font-bold text-xs hover:bg-[#222]">Volver</button>
            <button onClick={() => setStep(3)} disabled={contactableSelected.length === 0} className="bg-[var(--color-gold)] text-black px-6 py-3 uppercase font-bold text-xs hover:bg-white disabled:opacity-50">
              Redactar Mensaje
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPOSE & SEND */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-[#1a0f0f] border border-red-900 p-4 text-sm text-red-400">
            <strong>AVISO:</strong> Esta es una campaña a {contactableSelected.length} destinatarios.
            {channel === 'WHATSAPP' && " (WhatsApp está desactivado temporalmente. Se guardará en el historial pero no enviará mensajes)."}
          </div>

          {channel === 'EMAIL' && (
            <div>
              <label className="block text-xs uppercase text-gray-500 mb-2">Asunto</label>
              <input type="text" className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Vuelve a The Church" />
            </div>
          )}

          <div>
            <label className="block text-xs uppercase text-gray-500 mb-2">Mensaje (Texto plano o HTML)</label>
            <textarea className="w-full h-32 bg-black border border-[var(--color-charcoal)] p-3 text-white" value={message} onChange={e => setMessage(e.target.value)} placeholder="Hola..."></textarea>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="border border-[var(--color-charcoal)] text-white px-6 py-3 uppercase font-bold text-xs hover:bg-[#222]">Volver</button>
            <button onClick={handleSend} disabled={loading || !message || (channel === 'EMAIL' && !subject)} className="bg-[var(--color-gold)] text-black px-6 py-3 uppercase font-bold text-xs hover:bg-white disabled:opacity-50">
              {loading ? 'Procesando...' : 'Guardar Borrador'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
