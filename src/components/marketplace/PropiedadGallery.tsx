"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FotoItem {
  id: string;
  urlCloudinary: string;
  esPortada: boolean;
}

const slideVariants = {
  enterRight: { opacity: 0, x: 50 },
  enterLeft: { opacity: 0, x: -50 },
  center: { opacity: 1, x: 0 },
  exitLeft: { opacity: 0, x: -50 },
  exitRight: { opacity: 0, x: 50 },
};

export function PropiedadGallery({ fotos }: { fotos: FotoItem[] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxDir, setLightboxDir] = useState<"left" | "right">("right");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (fotos.length === 0) return null;

  const prev = () => {
    setDirection("left");
    setCurrent((c) => (c - 1 + fotos.length) % fotos.length);
  };

  const next = () => {
    setDirection("right");
    setCurrent((c) => (c + 1) % fotos.length);
  };

  const goTo = (i: number) => {
    setDirection(i > current ? "right" : "left");
    setCurrent(i);
  };

  const openLightbox = () => {
    setLightboxIndex(current);
    setLightboxDir("right");
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const lightboxPrev = useCallback(() => {
    setLightboxDir("left");
    setLightboxIndex((i) => (i - 1 + fotos.length) % fotos.length);
  }, [fotos.length]);

  const lightboxNext = useCallback(() => {
    setLightboxDir("right");
    setLightboxIndex((i) => (i + 1) % fotos.length);
  }, [fotos.length]);

  // Radix Dialog maneja Escape nativamente — solo necesitamos las flechas
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); lightboxPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); lightboxNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? lightboxNext() : lightboxPrev();
    }
    setTouchStartX(null);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Imagen principal — 16/9 con altura mínima garantizada */}
        <div
          className="relative overflow-hidden rounded-2xl cursor-pointer group min-h-[340px] lg:min-h-[480px]"
          style={{ aspectRatio: "16/9", background: "var(--background-mp-alt)" }}
          onClick={openLightbox}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={direction === "right" ? slideVariants.enterRight : slideVariants.enterLeft}
              animate={slideVariants.center}
              exit={direction === "right" ? slideVariants.exitLeft : slideVariants.exitRight}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={fotos[current].urlCloudinary}
                alt=""
                fill
                className="object-cover object-center"
                priority={current === 0}
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            </motion.div>
          </AnimatePresence>

          {fotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity opacity-70 hover:opacity-100"
                style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: "var(--antracite)" }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity opacity-70 hover:opacity-100"
                style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 10px rgba(0,0,0,0.14)" }}
                aria-label="Foto siguiente"
              >
                <ChevronRight className="w-5 h-5" style={{ color: "var(--antracite)" }} />
              </button>
            </>
          )}

          {/* Indicador expandir */}
          <div
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.50)" }}
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </div>

          {/* Contador */}
          <div
            className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums"
            style={{ background: "rgba(0,0,0,0.48)", color: "white", fontFamily: "var(--font-jakarta)" }}
          >
            {current + 1} / {fotos.length}
          </div>
        </div>

        {/* Miniaturas — py-1 da espacio al outline sin clipear */}
        {fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
            {fotos.map((foto, i) => (
              <button
                key={foto.id}
                onClick={() => goTo(i)}
                className="relative shrink-0 rounded-xl h-20 lg:h-24 w-[76px] lg:w-[92px]"
                style={{
                  outline: i === current ? "2.5px solid var(--terra-mid)" : "2.5px solid transparent",
                  outlineOffset: "2px",
                  opacity: i === current ? 1 : 0.6,
                  transition: "opacity 150ms, outline-color 150ms",
                  flexShrink: 0,
                }}
                aria-label={`Foto ${i + 1}`}
              >
                {/* overflow-hidden en wrapper interior — no clipea el outline del botón */}
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <Image
                    src={foto.urlCloudinary}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 76px, 92px"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/*
       * Lightbox — usa Radix Dialog.Portal que monta directamente en document.body.
       * z-index via inline style (no Tailwind) para garantizar que no sea afectado
       * por stacking contexts del backdropFilter del header ni del sticky sidebar.
       */}
      <Dialog.Root open={lightboxOpen} onOpenChange={(open) => { if (!open) setLightboxOpen(false); }}>
        <Dialog.Portal>
          {/* Overlay: backdrop oscuro detrás del contenido */}
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.90)",
            }}
          />

          {/* Content: fullscreen — click en el área oscura cierra el lightbox */}
          <Dialog.Content
            aria-describedby={undefined}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              outline: "none",
            }}
            onClick={closeLightbox}
          >
            <Dialog.Title className="sr-only">Galería de fotos</Dialog.Title>
            {/* Contenedor de imagen — stopPropagation para no cerrar al hacer click adentro */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "relative",
                width: "90vw",
                height: "85vh",
                touchAction: "pan-y",
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={lightboxIndex}
                  initial={lightboxDir === "right" ? slideVariants.enterRight : slideVariants.enterLeft}
                  animate={slideVariants.center}
                  exit={lightboxDir === "right" ? slideVariants.exitLeft : slideVariants.exitRight}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <Image
                    src={fotos[lightboxIndex].urlCloudinary}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="90vw"
                    priority
                  />
                </motion.div>
              </AnimatePresence>

              {fotos.length > 1 && (
                <>
                  <button
                    onClick={lightboxPrev}
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      cursor: "pointer",
                      opacity: 0.8,
                      transition: "opacity 150ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft style={{ width: 24, height: 24, color: "white" }} />
                  </button>
                  <button
                    onClick={lightboxNext}
                    style={{
                      position: "absolute",
                      right: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      cursor: "pointer",
                      opacity: 0.8,
                      transition: "opacity 150ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                    aria-label="Foto siguiente"
                  >
                    <ChevronRight style={{ width: 24, height: 24, color: "white" }} />
                  </button>
                </>
              )}
            </motion.div>

            {/* Botón cerrar — Dialog.Close llama onOpenChange(false) nativamente */}
            <Dialog.Close
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
                opacity: 0.8,
                transition: "opacity 150ms",
              }}
              aria-label="Cerrar"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
            >
              <X style={{ width: 20, height: 20, color: "white" }} />
            </Dialog.Close>

            {/* Contador */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "6px 16px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.15)",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "var(--font-jakarta)",
                fontVariantNumeric: "tabular-nums",
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              {lightboxIndex + 1} / {fotos.length}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
