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
        Terms & Conditions
      </h1>
      
      <div className="prose prose-invert prose-p:text-gray-400 prose-li:text-gray-400 prose-headings:text-[var(--color-warm-white)] prose-headings:font-serif prose-a:text-[var(--color-gold)] max-w-none">
        
    <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-8">
  <p className="text-orange-400 text-sm font-semibold uppercase tracking-wider">Provisional Notice</p>
  <p className="text-orange-200/80 text-sm mt-1">Provisional content pending legal review.</p>
</div>
    <h2>1. General Information</h2>
    <p>Below are the identifying details of the company:</p>
    <ul>
      <li><strong>Site Owner:</strong> The Church Tasting Room</li>
      <li><strong>Website:</strong> tastingroom.es</li>
      <li><strong>Email:</strong> info@tastingroom.es</li>
      <li><strong>Phone:</strong> +34 626 218 295</li>
      <li><strong>Address:</strong> Camí Vell d&apos;Altea, 26, 03581 L&apos;Albir, Alicante, Spain</li>
    </ul>

    <h2>2. Provisional Sections</h2>
    <h3>2.1 Bookings</h3>
    <p>Bookings are made through the website. A booking is not considered confirmed until payment has been completed.</p>
    
    <h3>2.2 Payments</h3>
    <p>Payments are processed securely through our payment gateway. Major credit cards are accepted.</p>
    
    <h3>2.3 Cancellations</h3>
    <p>Provisional cancellation policy: cancellations are allowed up to 48 hours before the event with a right to refund.</p>
    
    <h3>2.4 Date Changes</h3>
    <p>Date changes are subject to availability and must be requested in advance.</p>
    
    <h3>2.5 Capacity</h3>
    <p>The maximum capacity for experiences is limited and indicated for each tasting to ensure an optimal experience.</p>
    
    <h3>2.6 Access to experiences with alcohol</h3>
    <p>Access and participation in tastings that include alcoholic beverages is strictly reserved for individuals over 18 years of age. ID may be required.</p>
    
    <h3>2.7 Liability</h3>
    <p>The Church Tasting Room is not responsible for allergic reactions if they have not been properly communicated prior to the experience.</p>
  
      </div>
    </main>
  );
}