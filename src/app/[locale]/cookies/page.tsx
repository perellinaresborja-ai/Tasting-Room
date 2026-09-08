import {setRequestLocale} from "next-intl/server";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  
  const isEs = locale === 'es';

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-24">
      <h1 className="text-3xl md:text-4xl font-serif text-[var(--color-gold)] mb-12 uppercase tracking-widest text-center">
        {isEs ? 'Política de Cookies' : 'Cookie Policy'}
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
        <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
          <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">
            {isEs ? 'Aviso Provisional' : 'Provisional Notice'}
          </p>
          <p className="text-orange-200/80 text-sm mt-1">
            {isEs ? 'Contenido provisional pendiente de revisión legal.' : 'Provisional content pending legal review.'}
          </p>
        </div>

        {isEs ? (
          <>
            <h2>1. ¿Qué son las cookies?</h2>
            <p>Las cookies son pequeños archivos de texto que se guardan en su dispositivo al visitar la web para permitir su correcto funcionamiento y mejorar su experiencia.</p>
            
            <h2>2. Cookies Necesarias</h2>
            <p>Actualmente solo utilizamos cookies estrictamente necesarias para el funcionamiento de la web, como el idioma seleccionado y el almacenamiento de la verificación de mayoría de edad.</p>
            
            <h2>3. Preferencias</h2>
            <p>Se guardan preferencias como el idioma activo para evitar tener que seleccionarlo en cada visita.</p>
            
            <h2>4. Analítica (Futuro)</h2>
            <p>En el futuro, podremos incorporar cookies analíticas para mejorar el servicio, las cuales requerirán de su previo consentimiento expreso.</p>
            
            <h2>5. Terceros</h2>
            <p>Actualmente no se están instalando cookies comerciales de terceros sin su consentimiento explícito.</p>
          </>
        ) : (
          <>
            <h2>1. What are cookies?</h2>
            <p>Cookies are small text files saved on your device when visiting the website to allow it to function properly and improve your experience.</p>
            
            <h2>2. Necessary Cookies</h2>
            <p>We currently only use strictly necessary cookies for the operation of the website, such as the selected language and the storage of age verification.</p>
            
            <h2>3. Preferences</h2>
            <p>Preferences such as the active language are saved to avoid having to select it on each visit.</p>
            
            <h2>4. Analytics (Future)</h2>
            <p>In the future, we may incorporate analytical cookies to improve the service, which will require your prior express consent.</p>
            
            <h2>5. Third Parties</h2>
            <p>Currently, no third-party commercial cookies are being installed without your explicit consent.</p>
          </>
        )}
      </div>
    </main>
  );
}