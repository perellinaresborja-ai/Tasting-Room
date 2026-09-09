import { createClient } from "@/lib/supabase/server";
import AdminTastingForm from "../AdminTastingForm";
import { notFound } from "next/navigation";

export default async function EditTastingPage({ params }: { params: unknown }) {
  const { id } = (await params) as unknown; console.log('EDIT PAGE PARAMS:', await params, 'ID:', id);
  const supabase = await createClient();
  
  const { data: tasting } = await supabase.from('tastings').select('*').eq('id', id).single();
  
  if (!tasting) { console.log('NOT FOUND!'); notFound(); }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Editar Cata</h1>
      <AdminTastingForm initialData={tasting} />
    </div>
  );
}
