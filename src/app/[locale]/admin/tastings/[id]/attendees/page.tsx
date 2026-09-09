import { createClient } from '@/lib/supabase/server';
import AttendeesLiveView from './AttendeesLiveView';
import { notFound } from 'next/navigation';

export default async function AttendeesPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tasting } = await supabase
    .from('tastings')
    .select('id, title_es')
    .eq('id', id)
    .single();

  if (!tasting) {
    notFound();
  }

  return (
    <div className="p-4 md:p-8">
      <AttendeesLiveView tastingId={tasting.id} tastingTitle={tasting.title_es} />
    </div>
  );
}
