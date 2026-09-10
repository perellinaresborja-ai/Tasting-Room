"use client";

import { useState } from "react";
import { subscribeAction } from "@/app/actions/subscribe";

type Props = {
  locale: string;
  t: {
    email: string;
    consent_email: string;
    subscribe_btn: string;
    subscribe_success: string;
    subscribe_error: string;
    subscribe_invalid?: string;
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
    
    if (!consent_email) {
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
      
      <div>
        <input name="email" type="email" placeholder={t.email + " *"} required className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] transition-colors" />
      </div>
      
      <div className="flex flex-col gap-3 mt-6 mb-8 border border-[var(--color-charcoal)] bg-black p-6">
        <div className="flex items-start gap-3">
          <input type="checkbox" name="consent_email" id="consent_email" required className="mt-1 cursor-pointer" />
          <label htmlFor="consent_email" className="text-sm text-gray-400 cursor-pointer">{t.consent_email}</label>
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
        <div className="text-red-500 mb-4 text-center">Debes aceptar recibir comunicaciones para suscribirte.</div>
      )}

      <button type="submit" disabled={status === "loading"} className="w-full bg-black border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold)] hover:text-black transition-colors disabled:opacity-50">
        {status === "loading" ? "..." : t.subscribe_btn}
      </button>
    </form>
  );
}
