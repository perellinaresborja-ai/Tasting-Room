import {setRequestLocale} from "next-intl/server";

export default async function LegalPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-24">
      <h1 className="text-3xl md:text-4xl font-serif text-[var(--color-gold)] mb-12 uppercase tracking-widest text-center">
        Condiciones Generales
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Aviso Provisional</p>
  <p className="text-orange-200/80 text-sm mt-1">Contenido provisional pendiente de revisión legal.</p>
</div>
    <h2>1. Información General</h2>
    <p>A continuación se detallan los datos identificativos de la empresa:</p>
    <ul>
      <li><strong>Titular del sitio:</strong> The Church Tasting Room</li>
      <li><strong>Web:</strong> tastingroom.es</li>
      <li><strong>Email:</strong> info@tastingroom.es</li>
      <li><strong>Teléfono:</strong> 626 218 295</li>
      <li><strong>Dirección:</strong> Camí Vell d&apos;Altea, 26, 03581 L&apos;Albir, Alicante, España</li>
    </ul>

    <h2>2. Apartados Provisionales</h2>
    <h3>2.1 Reservas</h3>
    <p>Las reservas se realizan a través del sitio web. Una reserva no se considerará en firme hasta que se haya completado el pago.</p>
    
    <h3>2.2 Pagos</h3>
    <p>Los pagos se procesan de forma segura a través de nuestra pasarela de pago. Se aceptan las principales tarjetas de crédito.</p>
    
    <h3>2.3 Cancelaciones</h3>
    <p>Política provisional de cancelaciones: se permite la cancelación hasta 48 horas antes del evento con derecho a reembolso.</p>
    
    <h3>2.4 Cambios de fecha</h3>
    <p>Los cambios de fecha están sujetos a disponibilidad y deben solicitarse con antelación.</p>
    
    <h3>2.5 Aforo</h3>
    <p>El aforo máximo para las experiencias está limitado y se indica en cada cata para garantizar una experiencia óptima.</p>
    
    <h3>2.6 Acceso a experiencias con alcohol</h3>
    <p>El acceso y la participación en catas que incluyan bebidas alcohólicas está estrictamente reservado a mayores de 18 años. Se podrá requerir identificación.</p>
    
    <h3>2.7 Responsabilidad</h3>
    <p>The Church Tasting Room no se hace responsable de las reacciones alérgicas si no han sido debidamente comunicadas con anterioridad a la experiencia.</p>
  
      </div>
    </main>
  );
}