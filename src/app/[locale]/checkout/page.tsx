/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { mockTastings } from "@/lib/mock-data";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const tastingId = searchParams.get("tasting");
  const t = useTranslations("Checkout");
  const locale = useLocale();
  
  const [tasting, setTasting] = useState<CheckoutTasting | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [marketingChoice, setMarketingChoice] = useState<string | null>(null);
  const [channelEmail, setChannelEmail] = useState(false);
  const [channelWa, setChannelWa] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (tastingId) {
      // For development, try to load from mock data first
      const mock = mockTastings.find(t => t.id === tastingId);
      if (mock) {
        setTasting(mock);
      } else {
        supabase.from("tastings").select("*").eq("id", tastingId).single().then(({ data }) => {
          if (data) setTasting(data);
        });
      }
    }
  }, [tastingId, supabase]);

  if (!tasting) return <div className="p-16 text-center text-gray-400">{t("loading")}</div>;

  const requiresAgeConfirmation = tasting.includes_alcohol !== false;
  const title = locale === "es" ? tasting.title_es : tasting.title_en;
  const tickets = searchParams.get("tickets") || "1";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (requiresAgeConfirmation && !ageConfirmed) return;
    
    if (!marketingChoice) {
      alert(locale === "es" ? "Por favor, indica si deseas recibir novedades." : "Please indicate if you'd like to receive updates.");
      return;
    }

    if (marketingChoice === 'yes' && !channelEmail && !channelWa) {
      alert(locale === "es" ? "Debes seleccionar al menos un canal (Email o WhatsApp)." : "You must select at least one channel (Email or WhatsApp).");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const phoneValue = formData.get("phone") as string;

    if (marketingChoice === 'yes' && channelWa && (!phoneValue || phoneValue.trim() === '')) {
      alert(locale === "es" ? "Para recibir novedades por WhatsApp, debes introducir un teléfono válido." : "To receive updates via WhatsApp, you must enter a valid phone number.");
      return;
    }
    
    setIsSubmitting(true);
    formData.append("tasting_id", tastingId!);
    formData.append("locale", locale);
    formData.append("tickets", tickets);
    formData.append("marketing_email", marketingChoice === 'yes' && channelEmail ? "true" : "false");
    formData.append("marketing_whatsapp", marketingChoice === 'yes' && channelWa ? "true" : "false");

    try {
      const { createCheckoutSession } = await import("@/app/actions/checkout");
      const res = await createCheckoutSession(formData);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || "Error");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error procesando pago");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#141414] p-8 md:p-12 border border-[var(--color-charcoal)]">
      <h2 className="text-2xl font-serif text-[var(--color-warm-white)] mb-4">{title}</h2>
      <p className="text-gray-400 mb-10 tracking-widest text-sm uppercase">{tasting.date} • {tasting.start_time}</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">{t("first_name")}</label>
            <input type="text" name="first_name" required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">{t("last_name")}</label>
            <input type="text" name="last_name" required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">{t("email")}</label>
            <input type="email" name="email" required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">{t("phone")}</label>
            <input type="tel" name="phone" required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
          </div>
        </div>
        
        {requiresAgeConfirmation && (
          <div className="flex items-start gap-3 mt-8 bg-black p-6 border border-[var(--color-charcoal)]">
            <input 
              type="checkbox" 
              id="age_confirm" 
              required
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="age_confirm" className="text-sm text-[var(--color-warm-white)] cursor-pointer">
              {t("confirm_age")}
            </label>
          </div>
        )}
        
        <div className="pt-8 mt-8 border-t border-[var(--color-charcoal)]">
          <label className="block text-sm text-[var(--color-warm-white)] mb-4">
            {locale === "es" ? "¿Quieres que te avisemos de próximas experiencias?" : "Would you like us to let you know about upcoming experiences?"}
          </label>
          <div className="flex flex-col gap-4 mb-4">
            <label className="flex items-center gap-3 cursor-pointer text-gray-300">
              <input type="radio" name="marketingChoice" value="yes" checked={marketingChoice === 'yes'} onChange={() => setMarketingChoice('yes')} className="w-4 h-4 accent-[var(--color-gold)]" />
              {locale === "es" ? "Sí, quiero recibir novedades" : "Yes, I'd like to receive updates"}
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-gray-300">
              <input type="radio" name="marketingChoice" value="no" checked={marketingChoice === 'no'} onChange={() => { setMarketingChoice('no'); setChannelEmail(false); setChannelWa(false); }} className="w-4 h-4 accent-[var(--color-gold)]" />
              {locale === "es" ? "No, gracias" : "No, thanks"}
            </label>
          </div>

          {marketingChoice === 'yes' && (
            <div className="bg-[#1a1a1a] p-5 border border-[var(--color-charcoal)] mt-4 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-sm text-[var(--color-warm-white)] mb-4">
                {locale === "es" ? "¿Cómo quieres recibirlas?" : "How would you like to receive them?"}
              </p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                  <input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" />
                  Email
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white transition-colors">
                  <input type="checkbox" checked={channelWa} onChange={(e) => setChannelWa(e.target.checked)} className="w-4 h-4 accent-[var(--color-gold)]" />
                  WhatsApp
                </label>
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-8 mt-8 border-t border-[var(--color-charcoal)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl text-white">
            <span className="text-sm text-gray-500 uppercase tracking-widest mr-4">{t("total")}</span>
            €{(tasting.price * parseInt(tickets, 10)).toFixed(2)}
          </div>
          <button 
            type="submit" 
            disabled={(requiresAgeConfirmation && !ageConfirmed) || isSubmitting}
            className={`w-full md:w-auto px-10 py-4 uppercase tracking-widest font-bold transition-colors ${((requiresAgeConfirmation && !ageConfirmed) || isSubmitting) ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-hover)]"}`}
          >
            {isSubmitting ? t("loading") : t("pay_securely")}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center md:text-left">
          {locale === "es" 
            ? "Tus plazas se mantendrán durante 15 minutos mientras completas el pago. La reserva no estará confirmada hasta que el pago se haya realizado correctamente." 
            : "Your places will be held for 15 minutes while you complete payment. Your booking will not be confirmed until payment has been successfully completed."}
        </p>
      </form>
    </div>
  );
}

type CheckoutTasting = { id: string; title_es: string; title_en: string; includes_alcohol: boolean; date: string; start_time: string; price: number; capacity: number; };

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  return (
    <main className="max-w-3xl mx-auto px-4 py-24">
      <h1 className="text-4xl font-serif text-[var(--color-gold)] mb-10 text-center">{t("title")}</h1>
      <Suspense fallback={<div className="text-center p-16 text-gray-400">{t("loading")}</div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
