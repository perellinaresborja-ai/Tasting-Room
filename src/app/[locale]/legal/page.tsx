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
        Legal Notice
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Provisional Notice</p>
  <p className="text-orange-200/80 text-sm mt-1">Provisional content pending legal review.</p>
</div>
    <h2>1. Ownership</h2>
    <p>This website is owned by The Church Tasting Room.</p>
    
    <h2>2. Contact</h2>
    <p>Email: info@tastingroom.es<br />Phone: +34 626 218 295<br />Address: Camí Vell d&apos;Altea, 26, 03581 L&apos;Albir, Alicante, Spain</p>
    
    <h2>3. Domain</h2>
    <p>The official domain is tastingroom.es</p>
    
    <h2>4. Intellectual Property</h2>
    <p>All contents, images, design, and structure are the intellectual property of The Church Tasting Room and are protected by current regulations.</p>
    
    <h2>5. Liability</h2>
    <p>The Church Tasting Room assumes no responsibility for the incorrect or inappropriate use of the information shown on the pages of the website.</p>
    
    <h2>6. Applicable Law</h2>
    <p>These legal conditions are governed by Spanish law.</p>
  
      </div>
    </main>
  );
}