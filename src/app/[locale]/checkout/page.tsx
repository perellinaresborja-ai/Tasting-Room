/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import { mockTastings } from "@/lib/mock-data";
import { formatTime } from "@/lib/utils/formatDate";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const tastingId = searchParams.get("tasting");
  const t = useTranslations("Checkout");
  const locale = useLocale();
  
  const [tasting, setTasting] = useState<CheckoutTasting | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Gift mode state
  const isGiftParam = searchParams.get("gift") === "true";
  const [isGift, setIsGift] = useState(isGiftParam);
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const [marketingConsent, setMarketingConsent] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (tastingId) {
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
    if (requiresAgeConfirmation && !ageConfirmed) {
      alert(locale === "es" ? "Por favor, confirma que eres mayor de 18 años para continuar." : "Please confirm that you are over 18 years old to proceed.");
      const ageBox = document.getElementById("age_confirm");
      if (ageBox) ageBox.focus();
      return;
    }
    
    if (isGift && (!recipientName || recipientName.trim() === '')) {
      alert(locale === "es" ? "Por favor, indica a quién va dirigido el regalo (persona, pareja o grupo)." : "Please enter the recipient's name (person, couple or group).");
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    setIsSubmitting(true);
    formData.append("tasting_id", tastingId!);
    formData.append("locale", locale);
    formData.append("tickets", tickets);
    formData.append("is_gift", isGift ? "true" : "false");
    formData.append("recipient_name", recipientName.trim());
    formData.append("gift_message", giftMessage.trim());
    formData.append("marketing_email", marketingConsent ? "true" : "false");
    formData.append("marketing_whatsapp", marketingConsent ? "true" : "false");

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-2xl font-serif text-[var(--color-warm-white)]">{title}</h2>
        {isGift && (
          <span className="bg-[var(--color-gold)] text-black text-xs font-bold px-3 py-1 uppercase tracking-widest self-start sm:self-auto">
            🎁 {locale === "es" ? "Tarjeta Regalo" : "Gift Voucher"}
          </span>
        )}
      </div>
      <p className="text-gray-400 mb-8 tracking-widest text-sm uppercase">{tasting.date} • {formatTime(tasting.start_time)}</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN REGALO */}
        <div className={`p-5 border transition-all ${isGift ? 'bg-[#1c1a14] border-[var(--color-gold)]' : 'bg-black/40 border-[var(--color-charcoal)]'}`}>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="is_gift_checkbox" 
              checked={isGift} 
              onChange={(e) => setIsGift(e.target.checked)} 
              className="w-5 h-5 accent-[var(--color-gold)] cursor-pointer"
            />
            <label htmlFor="is_gift_checkbox" className="text-sm font-semibold text-[var(--color-gold)] uppercase tracking-wider cursor-pointer flex items-center gap-2">
              <span>🎁</span>
              <span>{locale === "es" ? "Esta compra es para regalar a otra persona" : "This booking is a gift for someone else"}</span>
            </label>
          </div>

          {isGift && (
            <div className="pt-4 mt-3 border-t border-[var(--color-charcoal)] space-y-4 animate-in fade-in duration-300">
              <p className="text-xs text-gray-300 font-light leading-relaxed">
                {locale === "es"
                  ? "Al completar el pago se generará una Tarjeta Regalo oficial de The Church con las plazas reservadas, lista para compartir con 1 solo clic por WhatsApp, Email o descargar en PDF para imprimir."
                  : "Upon payment completion, an official Gift Card will be generated with reserved seats, ready to share in 1 click via WhatsApp, Email, or download as PDF."}
              </p>

              {/* Nombre de la persona / pareja / grupo */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-300 mb-2 font-semibold">
                  {locale === "es" ? "Nombre de la persona, pareja o grupo *" : "Name of person, couple or group *"}
                </label>
                <input 
                  type="text" 
                  value={recipientName} 
                  onChange={(e) => setRecipientName(e.target.value)} 
                  required={isGift}
                  placeholder={locale === "es" ? "Ej. Laura Martínez, Laura y Carlos, o Familia Pérez" : "e.g. Laura Martinez, Laura & Carlos, or Perez Family"} 
                  className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none text-sm"
                />
              </div>

              {/* Dedicatoria personalizada */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  {locale === "es" ? "Dedicatoria o mensaje personalizado (opcional)" : "Personal Dedication / Message (optional)"}
                </label>
                <textarea 
                  rows={2}
                  value={giftMessage} 
                  onChange={(e) => setGiftMessage(e.target.value)} 
                  placeholder={locale === "es" ? "Ej. ¡Feliz aniversario! Que disfrutéis mucho de la velada." : "e.g. Happy Anniversary! Enjoy this wonderful experience."} 
                  className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* DATOS DEL COMPRADOR */}
        <div className="pt-4 border-t border-[var(--color-charcoal)]">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4 font-semibold">
            {isGift 
              ? (locale === "es" ? "Tus datos (comprador para el recibo y entrega)" : "Your details (buyer for receipt & delivery)")
              : (locale === "es" ? "Tus datos de reserva" : "Your booking details")}
          </p>
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
          <div className="flex items-start gap-3 mt-8 bg-black p-5 border border-[var(--color-charcoal)] hover:border-[var(--color-gold)]/40 transition-colors">
            <input 
              type="checkbox" 
              id="age_confirm" 
              required
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[var(--color-gold)] cursor-pointer"
            />
            <label htmlFor="age_confirm" className="text-sm text-[var(--color-warm-white)] cursor-pointer select-none">
              {t("confirm_age")}
            </label>
          </div>
        )}
        
        <div className="pt-6 mt-6 border-t border-[var(--color-charcoal)]">
          <label className="flex items-start gap-3 cursor-pointer text-gray-300 hover:text-white transition-colors select-none">
            <input 
              type="checkbox" 
              checked={marketingConsent} 
              onChange={(e) => setMarketingConsent(e.target.checked)} 
              className="mt-0.5 w-4 h-4 accent-[var(--color-gold)] cursor-pointer" 
            />
            <span className="text-xs text-gray-300 leading-relaxed">
              {locale === "es" 
                ? "Deseo recibir invitaciones exclusivas y avisos de próximas experiencias en The Church Tasting Room."
                : "I would like to receive exclusive invitations and notices of upcoming experiences at The Church Tasting Room."}
            </span>
          </label>
        </div>
        
        <div className="pt-8 mt-8 border-t border-[var(--color-charcoal)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl text-white">
            <span className="text-sm text-gray-500 uppercase tracking-widest mr-4">{t("total")}</span>
            €{(tasting.price * parseInt(tickets, 10)).toFixed(2)}
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full md:w-auto px-10 py-4 uppercase tracking-widest font-bold transition-all ${
              isSubmitting 
                ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                : "bg-[var(--color-gold)] text-black hover:bg-[var(--color-gold-hover)] cursor-pointer shadow-lg hover:shadow-gold"
            }`}
          >
            {isSubmitting ? t("loading") : (isGift ? (locale === "es" ? "Pagar Tarjeta Regalo" : "Pay for Gift Voucher") : t("pay_securely"))}
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
