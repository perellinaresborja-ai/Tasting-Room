import AdminTastingForm from "../AdminTastingForm";

export default function NewTastingPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Nueva Cata</h1>
      <AdminTastingForm />
    </div>
  );
}
