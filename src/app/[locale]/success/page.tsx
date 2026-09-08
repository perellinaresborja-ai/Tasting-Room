import { Link } from '@/i18n/routing';

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-xl w-full text-center p-12 border border-[var(--color-charcoal)] bg-[#0a0a0a]">
        <div className="w-20 h-20 bg-[var(--color-gold)] rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="text-black text-4xl">✓</span>
        </div>
        <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-4">¡Reserva Confirmada!</h1>
        <p className="text-gray-400 mb-2">Tu pago se ha procesado correctamente.</p>
        {session_id && (
          <p className="text-xs text-gray-600 font-mono mb-8 break-all">
            ID: {session_id}
          </p>
        )}
        <p className="text-[var(--color-warm-white)] mb-10">
          En breve recibirás un correo electrónico con los detalles de tu reserva y el código QR de acceso.
        </p>
        <Link 
          href="/tastings"
          className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 uppercase tracking-widest text-sm hover:bg-[var(--color-gold)] hover:text-black transition-colors"
        >
          Volver a Catas
        </Link>
      </div>
    </main>
  );
}
