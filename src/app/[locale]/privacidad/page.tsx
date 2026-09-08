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
        Política de Privacidad
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Aviso Provisional</p>
  <p className="text-orange-200/80 text-sm mt-1">Contenido provisional pendiente de revisión legal.</p>
</div>
    <h2>1. Responsable del Tratamiento</h2>
    <p>El responsable del tratamiento de los datos es The Church Tasting Room.</p>
    
    <h2>2. Datos Recogidos</h2>
    <p>Recopilamos datos identificativos (nombre, email, teléfono), de preferencias de idioma e intereses para personalizar su experiencia, y datos relacionados con las reservas.</p>
    
    <h2>3. Finalidad</h2>
    <p>La finalidad principal es gestionar las reservas de las catas y experiencias, así como ofrecer una atención al cliente adecuada.</p>
    
    <h2>4. Reservas</h2>
    <p>Los datos aportados durante el proceso de reserva son necesarios para procesar la asistencia al evento.</p>
    
    <h2>5. Comunicaciones</h2>
    <p>Solo enviaremos comunicaciones (email o WhatsApp) si ha prestado su consentimiento expreso y desmarcado en nuestros formularios.</p>
    
    <h2>6. Conservación</h2>
    <p>Los datos se conservarán el tiempo estrictamente necesario para cumplir con las obligaciones legales o hasta que solicite su supresión.</p>
    
    <h2>7. Derechos</h2>
    <p>Puede ejercer sus derechos de acceso, rectificación, cancelación u oposición contactando con nosotros.</p>
    
    <h2>8. Contacto</h2>
    <p>Para cualquier cuestión de privacidad: info@tastingroom.es</p>
  
      </div>
    </main>
  );
}