/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function AgeVerificationModal() {
  const t = useTranslations("Age");
  const [showModal, setShowModal] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Check if the user has already verified their age
    const verified = localStorage.getItem("age_verified");
    if (!verified) {
      setShowModal(true);
      // Disable scrolling when modal is open
      document.body.style.overflow = "hidden";
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem("age_verified", "true");
    setShowModal(false);
    document.body.style.overflow = "auto";
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-w-md w-full px-6 py-12 flex flex-col items-center text-center">
        <Image 
          src="/logo-transparent.png" 
          alt="The Church Tasting Room" 
          width={300} 
          height={150} 
          className="object-contain mb-10"
        />
        
        {denied ? (
          <div className="text-[var(--color-warm-white)]">
            <p className="text-xl font-serif mb-6">{t("denied")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-serif text-[var(--color-gold)] mb-4 leading-relaxed">
              {t("welcome_1")}<br />{t("welcome_2")}
            </h2>
            <p className="text-[var(--color-warm-white)] mb-10">{t("subtitle")}</p>
            
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={handleConfirm}
                className="w-full bg-[var(--color-gold)] text-black px-6 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors"
              >
                {t("over_18")}
              </button>
              <button 
                onClick={handleDeny}
                className="w-full border border-[var(--color-charcoal)] text-gray-400 px-6 py-4 uppercase tracking-widest font-bold hover:text-[var(--color-warm-white)] hover:border-gray-500 transition-colors"
              >
                {t("under_18")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
