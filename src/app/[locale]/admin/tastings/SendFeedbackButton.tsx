"use client";

import { useTransition } from "react";
import { sendFeedbackEmailsAction } from "@/app/actions/feedback";

export default function SendFeedbackButton({ tastingId, title }: { tastingId: string, title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button 
      onClick={() => {
        if (confirm(`¿Enviar email de feedback a los asistentes de ${title}?`)) {
          startTransition(async () => {
            const res = await sendFeedbackEmailsAction(tastingId);
            if (res.success) alert(`Se enviaron ${res.sent} emails.`);
            else alert(res.error);
          });
        }
      }}
      disabled={isPending}
      className="text-gray-400 hover:text-white uppercase tracking-widest text-xs ml-4 disabled:opacity-50"
    >
      {isPending ? 'Enviando...' : 'Pedir Feedback'}
    </button>
  );
}