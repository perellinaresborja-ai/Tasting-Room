"use client";

import { useState } from "react";
import { subscribeAction } from "@/app/actions/subscribe";

type Props = {
  locale: string;
  t: {
    email: string;
    phone: string;
    consent_email: string;
    consent_wa: string;
    subscribe_btn: string;
    subscribe_success: string;
    subscribe_error: string;
    subscribe_invalid: string;
  };
};

export default function SubscribeForm({ t, locale }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "not_configured" | "invalid" | "db_error" | "server_error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    const formData = new FormData(e.currentTarget);
    
    // Client-side validation
    const consent_email = formData.get("consent_email") === "on";
    const consent_wa = formData.get("consent_wa") === "on";
    const phone = formData.get("phone") as string;
    
    if (!consent_email && !consent_wa) {
      setStatus("invalid");
      return;
    }
    
    if (consent_wa && !phone.trim()) {
      setStatus("invalid");
      return;
    }

    setStatus("loading");
    const result = await subscribeAction(formData);

    if (result.success) {
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus(result.error as "error" | "not_configured" | "invalid" | "db_error" | "server_error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <input type="hidden" name="locale" value={locale} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="email" type="email" placeholder={t.email + " *"} required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
        <input name="phone" type="tel" placeholder={t.phone} className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
      </div>
      
      <div className="flex flex-col gap-3 mt-6 mb-8 border border-[var(--color-charcoal)] bg-black p-6">
        <div className="flex items-start gap-3">
          <input type="checkbox" name="consent_email" id="consent_email" className="mt-1 cursor-pointer" />
          <label htmlFor="consent_email" className="text-sm text-gray-400 cursor-pointer">{t.consent_email}</label>
        </div>
        <div className="flex items-start gap-3">
          <input type="checkbox" name="consent_wa" id="consent_wa" className="mt-1 cursor-pointer" />
          <label htmlFor="consent_wa" className="text-sm text-gray-400 cursor-pointer">{t.consent_wa}</label>
        </div>
      </div>
      
      {status === "success" && (
        <div className="text-green-500 mb-4 text-center">{t.subscribe_success}</div>
      )}
      {(status === "error" || status === "db_error" || status === "server_error") && (
        <div className="text-red-500 mb-4 text-center">{t.subscribe_error}</div>
      )}
      {status === "not_configured" && (
        <div className="text-[var(--color-gold)] mb-4 text-center">La conexión a la base de datos no está configurada. (Modo Fallback)</div>
      )}
      {status === "invalid" && (
        <div className="text-red-500 mb-4 text-center">Debes seleccionar al menos un canal de comunicación, y rellenar el teléfono si marcas WhatsApp.</div>
      )}

      <button type="submit" disabled={status === "loading"} className="w-full bg-black border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold)] hover:text-black transition-colors disabled:opacity-50">
        {status === "loading" ? "..." : t.subscribe_btn}
      </button>
    </form>
  );
}
