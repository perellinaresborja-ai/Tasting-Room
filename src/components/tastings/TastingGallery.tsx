"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

interface TastingGalleryProps {
  coverImage?: string;
  galleryImages?: string[];
  title: string;
}

export default function TastingGallery({
  coverImage,
  galleryImages = [],
  title,
}: TastingGalleryProps) {
  // Collect all valid images: coverImage first, followed by additional gallery images
  const allImages = [
    coverImage || "/logo-header-full.png",
    ...(galleryImages || []).filter(Boolean),
  ].filter((img, idx, arr) => arr.indexOf(img) === idx);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentImage = allImages[currentIndex] || allImages[0];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Container */}
      <div 
        onClick={() => setLightboxOpen(true)}
        className="relative h-[48vh] lg:h-[62vh] border border-[var(--color-charcoal)] overflow-hidden bg-black cursor-pointer group"
      >
        <Image
          src={currentImage}
          alt={`${title} - Foto ${currentIndex + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority
        />
        
        {/* Subtle hover overlay hint */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-[var(--color-charcoal)] text-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} />
        </div>

        {/* Carousel controls if more than 1 image */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white border border-[var(--color-charcoal)] hover:border-[var(--color-gold)] p-2.5 rounded-full transition-all opacity-80 hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white border border-[var(--color-charcoal)] hover:border-[var(--color-gold)] p-2.5 rounded-full transition-all opacity-80 hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>

            {/* Counter badge */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 text-xs text-[var(--color-gold)] uppercase tracking-widest border border-[var(--color-charcoal)]">
              {currentIndex + 1} / {allImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {allImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {allImages.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-20 h-20 flex-shrink-0 border transition-all overflow-hidden ${
                  isActive
                    ? "border-[var(--color-gold)] ring-1 ring-[var(--color-gold)] scale-102"
                    : "border-[var(--color-charcoal)] opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={img}
                  alt={`Miniatura ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox / Fullscreen Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 border border-white/20 hover:border-white rounded-full transition-colors z-10"
            aria-label="Cerrar vista completa"
          >
            <X size={24} />
          </button>

          {/* Lightbox Main Image */}
          <div 
            className="relative w-full max-w-5xl h-[75vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage}
              alt={title}
              fill
              className="object-contain"
              priority
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-3 rounded-full border border-white/20 hover:border-[var(--color-gold)] transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-3 rounded-full border border-white/20 hover:border-[var(--color-gold)] transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Lightbox footer counter */}
          <div className="mt-4 text-sm text-[var(--color-gold)] uppercase tracking-widest">
            {currentIndex + 1} de {allImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
