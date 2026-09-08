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
        Privacy Policy
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Provisional Notice</p>
  <p className="text-orange-200/80 text-sm mt-1">Provisional content pending legal review.</p>
</div>
    <h2>1. Data Controller</h2>
    <p>The data controller is The Church Tasting Room.</p>
    
    <h2>2. Data Collected</h2>
    <p>We collect identifying data (name, email, phone), language preferences and interests to customize your experience, and data related to bookings.</p>
    
    <h2>3. Purpose</h2>
    <p>The main purpose is to manage tasting and experience bookings, as well as to offer adequate customer support.</p>
    
    <h2>4. Bookings</h2>
    <p>The data provided during the booking process is necessary to process attendance at the event.</p>
    
    <h2>5. Communications</h2>
    <p>We will only send communications (email or WhatsApp) if you have provided your express consent in our forms.</p>
    
    <h2>6. Conservation</h2>
    <p>Data will be kept for the time strictly necessary to comply with legal obligations or until you request its deletion.</p>
    
    <h2>7. Rights</h2>
    <p>You can exercise your rights of access, rectification, cancellation, or opposition by contacting us.</p>
    
    <h2>8. Contact</h2>
    <p>For any privacy concerns: info@tastingroom.es</p>
  
      </div>
    </main>
  );
}