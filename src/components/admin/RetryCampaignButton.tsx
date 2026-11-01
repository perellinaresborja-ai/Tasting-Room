'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { retryCampaign } from '@/app/actions/communications';

export default function RetryCampaignButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRetry = async () => {
    if (!confirm('¿Deseas reintentar el envío para los destinatarios pendientes o fallidos de esta campaña? Los que ya fueron aceptados por el proveedor NO se volverán a enviar.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await retryCampaign({ campaignId });
      alert(res.message);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Error al reintentar el envío.');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-yellow-900/40 text-yellow-300 border border-yellow-700/60 hover:bg-yellow-800/60 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {loading ? 'Reintentando...' : 'Reintentar'}
    </button>
  );
}
