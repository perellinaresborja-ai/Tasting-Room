import { createClient } from '@/lib/supabase/server';
import ScannerClient from './ScannerClient';

export default async function ScannerPage() {
  const supabase = await createClient();

  // Load future and ongoing tastings for the scanner selection
  const { data: tastings } = await supabase
    .from('tastings')
    .select('id, title_es, date')
    .eq('status', 'PUBLISHED')
    .order('date', { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Scanner de Accesos</h1>
        <p className="text-gray-400 mt-2">Valida las entradas de los asistentes usando el código QR personal de su área de cliente.</p>
      </div>

      {(!tastings || tastings.length === 0) ? (
        <div className="bg-[#141414] border border-[var(--color-charcoal)] p-12 text-center text-gray-500">
          No hay catas publicadas para realizar check-in.
        </div>
      ) : (
        <ScannerClient tastings={tastings} />
      )}
    </div>
  );
}
