"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDate, formatDayOfWeek, formatTime } from "@/lib/utils/formatDate";
import { ChevronLeft, ChevronRight } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function UpcomingTastingsCarousel({ tastings, locale, labelNextTasting }: { tastings: any[], locale: string, labelNextTasting: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === tastings.length - 1 ? 0 : prevIndex + 1));
  }, [tastings.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? tastings.length - 1 : prevIndex - 1));
  }, [tastings.length]);

  useEffect(() => {
    if (tastings.length <= 1) return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (!isHovered) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 6000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, isHovered, tastings.length, currentIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsHovered(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    setIsHovered(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  if (!tastings || tastings.length === 0) return null;

  // Single tasting logic
  if (tastings.length === 1) {
    const nextTasting = tastings[0];
    const isSoldOut = nextTasting.status === 'SOLD_OUT';
    
    return (
      <section className="py-20 px-4 md:px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-serif text-[var(--color-gold)] mb-12 text-center">
            {labelNextTasting}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[var(--color-charcoal)] group">
            <div className="relative h-64 md:h-auto overflow-hidden">
              <Image 
                src={nextTasting.cover_image || "/logo-header-full.png"} 
                alt={locale === "es" ? nextTasting.title_es : nextTasting.title_en} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            </div>
            <div className="p-10 md:p-16 flex flex-col justify-center bg-[#141414]">
              <h4 className="text-3xl font-serif text-[var(--color-gold)] mb-6">
                {locale === "es" ? nextTasting.title_es : nextTasting.title_en}
              </h4>
              <div className="space-y-4 mb-8 text-[var(--color-warm-white)]">
                <div className="flex items-start gap-3">
                  <span className="text-[var(--color-gold)] mt-1">📅</span>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-400 capitalize">{formatDayOfWeek(nextTasting.date, locale)}</span>
                    <span>{formatDate(nextTasting.date, locale)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-gold)]">⏱</span> {formatTime(nextTasting.start_time)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-gold)]">€</span> {nextTasting.price.toFixed(2)}
                </div>
                {nextTasting.capacity && (
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-gold)]">🍷</span> 
                    <span className="text-xs uppercase tracking-wider text-gray-300">
                      {locale === 'es' 
                        ? `Aforo íntimo: ${nextTasting.capacity} plazas` 
                        : `Intimate capacity: ${nextTasting.capacity} seats`}
                    </span>
                  </div>
                )}
              </div>
              
              {isSoldOut ? (
                 <div className="inline-block border border-red-900 text-red-500 px-8 py-3 uppercase tracking-widest text-sm text-center w-fit opacity-80 cursor-not-allowed">
                   {locale === 'es' ? 'AGOTADO' : 'SOLD OUT'}
                 </div>
              ) : (
                <div className="flex flex-wrap gap-3 items-center">
                  <Link href={{ pathname: "/tastings/[slug]", params: { slug: nextTasting.slug } }} className="inline-block bg-[var(--color-gold)] text-black font-bold px-8 py-3 uppercase tracking-widest text-xs text-center hover:bg-white transition-colors">
                    {locale === 'es' ? 'RESERVAR' : 'BOOK'}
                  </Link>
                  <Link href={{ pathname: "/checkout", query: { tasting: nextTasting.id, tickets: "2", gift: "true" } }} className="inline-flex items-center gap-1.5 border border-[var(--color-gold)] text-[var(--color-gold)] px-5 py-3 uppercase tracking-widest text-xs text-center hover:bg-[var(--color-gold)] hover:text-black transition-colors font-medium">
                    <span>🎁</span>
                    <span>{locale === 'es' ? 'REGALA UNA CATA' : 'GIFT A TASTING'}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Multiple tastings carousel
  return (
    <section className="py-20 px-4 md:px-8 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-12 flex justify-center items-center">
          <h3 className="text-3xl font-serif text-[var(--color-gold)] text-center">
            {labelNextTasting}
          </h3>
          
          <div className="hidden md:flex gap-4 absolute right-0">
            <button 
              onClick={() => { prevSlide(); setIsHovered(true); setTimeout(() => setIsHovered(false), 100); }} 
              className="p-2 border border-[var(--color-charcoal)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors text-gray-500"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => { nextSlide(); setIsHovered(true); setTimeout(() => setIsHovered(false), 100); }} 
              className="p-2 border border-[var(--color-charcoal)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] transition-colors text-gray-500"
              aria-label="Siguiente"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div 
          className="relative overflow-hidden w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
        >
          <div 
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] w-full items-stretch"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {tastings.map((tasting) => {
              const isSoldOut = tasting.status === 'SOLD_OUT';
              
              return (
                <div key={tasting.id} className="w-full flex-shrink-0 min-w-full flex">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[var(--color-charcoal)] group w-full">
                    <div className="relative min-h-[250px] md:min-h-full h-full overflow-hidden">
                      <Image 
                        src={tasting.cover_image || "/logo-header-full.png"} 
                        alt={locale === "es" ? tasting.title_es : tasting.title_en} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                    </div>
                    <div className="p-10 md:p-16 flex flex-col justify-center bg-[#141414] h-full flex-1">
                      <h4 className="text-3xl font-serif text-[var(--color-gold)] mb-6">
                        {locale === "es" ? tasting.title_es : tasting.title_en}
                      </h4>
                      <div className="space-y-4 mb-8 text-[var(--color-warm-white)] flex-1">
                        <div className="flex items-start gap-3">
                          <span className="text-[var(--color-gold)] mt-1">📅</span>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-400 capitalize">{formatDayOfWeek(tasting.date, locale)}</span>
                            <span>{formatDate(tasting.date, locale)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--color-gold)]">⏱</span> {formatTime(tasting.start_time)}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--color-gold)]">€</span> {tasting.price.toFixed(2)}
                        </div>
                        {tasting.capacity && (
                          <div className="flex items-center gap-3">
                            <span className="text-[var(--color-gold)]">🍷</span> 
                            <span className="text-xs uppercase tracking-wider text-gray-300">
                              {locale === 'es' 
                                ? `Aforo íntimo: ${tasting.capacity} plazas` 
                                : `Intimate capacity: ${tasting.capacity} seats`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-4 flex flex-wrap gap-2 items-center">
                        {isSoldOut ? (
                          <div className="inline-block border border-red-900 text-red-500 px-6 py-2.5 uppercase tracking-widest text-xs text-center w-fit opacity-80 cursor-not-allowed">
                            {locale === 'es' ? 'AGOTADO' : 'SOLD OUT'}
                          </div>
                        ) : (
                          <>
                            <Link href={{ pathname: "/tastings/[slug]", params: { slug: tasting.slug } }} className="inline-block bg-[var(--color-gold)] text-black font-bold px-6 py-2.5 uppercase tracking-widest text-xs text-center hover:bg-white transition-colors">
                              {locale === 'es' ? 'RESERVAR' : 'BOOK'}
                            </Link>
                            <Link href={{ pathname: "/checkout", query: { tasting: tasting.id, tickets: "2", gift: "true" } }} className="inline-flex items-center gap-1 border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-2.5 uppercase tracking-widest text-xs text-center hover:bg-[var(--color-gold)] hover:text-black transition-colors">
                              <span>🎁</span>
                              <span>{locale === 'es' ? 'REGALA UNA CATA' : 'GIFT A TASTING'}</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {tastings.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-[var(--color-gold)] w-4' 
                  : 'bg-gray-700 hover:bg-gray-500'
              }`}
              aria-label={`Ir a experiencia ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
