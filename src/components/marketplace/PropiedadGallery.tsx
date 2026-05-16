"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "16/9",
          background: "var(--background-mp-alt)",
        }}
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
              className="object-cover"
              priority={current === 0}
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity opacity-70 hover:opacity-100"
              style={{
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
              }}
              aria-label="Foto anterior"
            >
              <ChevronLeft
                className="w-5 h-5"
                style={{ color: "var(--antracite)" }}
              />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity opacity-70 hover:opacity-100"
              style={{
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
              }}
              aria-label="Foto siguiente"
            >
              <ChevronRight
                className="w-5 h-5"
                style={{ color: "var(--antracite)" }}
              />
            </button>
          </>
        )}

        {/* Counter badge */}
        <div
          className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: "rgba(0,0,0,0.48)",
            color: "white",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          {current + 1} / {fotos.length}
        </div>
      </div>

      {/* Thumbnails */}
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              onClick={() => goTo(i)}
              className="relative shrink-0 overflow-hidden rounded-xl"
              style={{
                width: 76,
                height: 56,
                outline:
                  i === current
                    ? "2.5px solid var(--terra-mid)"
                    : "2.5px solid transparent",
                outlineOffset: 1,
                opacity: i === current ? 1 : 0.6,
                transition: "opacity 150ms, outline-color 150ms",
              }}
              aria-label={`Foto ${i + 1}`}
            >
              <Image
                src={foto.urlCloudinary}
                alt=""
                fill
                className="object-cover"
                sizes="76px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
