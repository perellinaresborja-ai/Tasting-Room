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
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.append("tasting_id", tastingId!);
    formData.append("locale", locale);
    formData.append("tickets", tickets);

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
