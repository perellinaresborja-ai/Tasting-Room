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
        Aviso Legal
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Aviso Provisional</p>
  <p className="text-orange-200/80 text-sm mt-1">Contenido provisional pendiente de revisión legal.</p>
</div>
    <h2>1. Titularidad</h2>
    <p>Este sitio web es propiedad de The Church Tasting Room.</p>
    
    <h2>2. Contacto</h2>
    <p>Email: info@tastingroom.es<br />Teléfono: 626 218 295<br />Dirección: Camí Vell d&apos;Altea, 26, 03581 L&apos;Albir, Alicante, España</p>
    
    <h2>3. Dominio</h2>
    <p>El dominio oficial es tastingroom.es</p>
    
    <h2>4. Propiedad Intelectual</h2>
    <p>Todos los contenidos, imágenes, diseño y estructura son propiedad intelectual de The Church Tasting Room y están protegidos por la normativa vigente.</p>
    
    <h2>5. Responsabilidad</h2>
    <p>The Church Tasting Room no asume responsabilidad alguna por el uso incorrecto o inapropiado de la información mostrada en las páginas del sitio web.</p>
    
    <h2>6. Legislación Aplicable</h2>
    <p>Estas condiciones legales se rigen por la legislación española.</p>
  
      </div>
    </main>
  );
}