"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FotoItem {
  id: string;
  urlCloudinary: string;
  esPortada: boolean;
}

const slideVariants = {
  enterRight: { opacity: 0, x: 50 },
  enterLeft:  { opacity: 0, x: -50 },
  center:     { opacity: 1,  x: 0 },
  exitLeft:   { opacity: 0, x: -50 },
  exitRight:  { opacity: 0, x: 50 },
};

export function PropiedadGallery({ fotos }: { fotos: FotoItem[] }) {
  if (fotos.length === 0) return null;

  /* ── Estado compartido ────────────────────────────────────────── */
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Mobile carousel
  const [mobileIdx, setMobileIdx]   = useState(0);
  const [mobileDir, setMobileDir]   = useState<"left" | "right">("right");

  // Lightbox
  const [lbOpen,  setLbOpen]  = useState(false);
  const [lbIdx,   setLbIdx]   = useState(0);
  const [lbDir,   setLbDir]   = useState<"left" | "right">("right");

  const count = fotos.length;

  /* ── Handlers lightbox ────────────────────────────────────────── */
  const openAt = (i: number) => { setLbIdx(i); setLbDir("right"); setLbOpen(true); };
  const closeLb = useCallback(() => setLbOpen(false), []);

  const lbPrev = useCallback(() => {
    setLbDir("left");
    setLbIdx((i) => (i - 1 + count) % count);
  }, [count]);

  const lbNext = useCallback(() => {
    setLbDir("right");
    setLbIdx((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!lbOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); lbPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); lbNext(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [lbOpen, lbPrev, lbNext]);

  /* ── Handlers mobile carousel ─────────────────────────────────── */
  const mobilePrev = () => { setMobileDir("left");  setMobileIdx((c) => (c - 1 + count) % count); };
  const mobileNext = () => { setMobileDir("right"); setMobileIdx((c) => (c + 1) % count); };

  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEndMobile = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? mobileNext() : mobilePrev(); }
    setTouchStartX(null);
  };
  const onTouchEndLb = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? lbNext() : lbPrev(); }
    setTouchStartX(null);
  };

  /* ── Helper: chip "Ver galería" ───────────────────────────────── */
  const GaleriaChip = () => (
    <div
      style={{
        position: "absolute", bottom: 14, left: 14,
        background: "rgba(20,17,14,0.70)",
        color: "white",
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        fontFamily: "var(--font-jakarta)",
        backdropFilter: "blur(4px)",
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <Eye style={{ width: 13, height: 13 }} />
      Ver galería · {count} foto{count !== 1 ? "s" : ""}
    </div>
  );

  /* ── Helper: overlay "+N más" ─────────────────────────────────── */
  const extra = count - 5;
  const MoreOverlay = () => (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(20,17,14,0.52)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "white", gap: 4, pointerEvents: "none",
    }}>
      <span style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
        +{extra}
      </span>
      <span style={{ fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.85 }}>
        fotos más
      </span>
    </div>
  );

  /* ── DESKTOP MOSAIC (hidden on mobile) ────────────────────────── */
  const renderDesktopMosaic = () => {
    if (count === 1) {
      return (
        <div
          style={{ position: "relative", height: 460, borderRadius: 18, overflow: "hidden", cursor: "pointer" }}
          onClick={() => openAt(0)}
        >
          <Image src={fotos[0].urlCloudinary} alt="" fill className="object-cover" priority sizes="(min-width: 1024px) 66vw, 0px" />
          <GaleriaChip />
        </div>
      );
    }

    if (count === 2) {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, height: 440, borderRadius: 18, overflow: "hidden" }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openAt(0)}>
            <Image src={fotos[0].urlCloudinary} alt="" fill className="object-cover" priority sizes="(min-width: 1024px) 40vw, 0px" />
            <GaleriaChip />
          </div>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openAt(1)}>
            <Image src={fotos[1].urlCloudinary} alt="" fill className="object-cover" sizes="(min-width: 1024px) 26vw, 0px" />
          </div>
        </div>
      );
    }

    // 3 or 4 images → hero + 2 stacked right
    if (count <= 4) {
      return (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gridTemplateRows: "repeat(2, 220px)",
          gap: 8,
          borderRadius: 18,
          overflow: "hidden",
        }}>
          <div style={{ gridRow: "1 / 3", position: "relative", cursor: "pointer" }} onClick={() => openAt(0)}>
            <Image src={fotos[0].urlCloudinary} alt="" fill className="object-cover" priority sizes="(min-width: 1024px) 40vw, 0px" />
            <GaleriaChip />
          </div>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openAt(1)}>
            <Image src={fotos[1].urlCloudinary} alt="" fill className="object-cover" sizes="(min-width: 1024px) 26vw, 0px" />
            {count === 4 && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(20,17,14,0.42)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", pointerEvents: "none" }}>
                <span style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", fontSize: 22, fontWeight: 700 }}>
                  +{count - 2} más
                </span>
              </div>
            )}
          </div>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => openAt(2)}>
            <Image src={fotos[2].urlCloudinary} alt="" fill className="object-cover" sizes="(min-width: 1024px) 26vw, 0px" />
          </div>
        </div>
      );
    }

    // 5+ images → full 3-column mosaic
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr",
        gridTemplateRows: "repeat(2, 220px)",
        gap: 8,
        borderRadius: 18,
        overflow: "hidden",
      }}>
        {/* Hero */}
        <div style={{ gridRow: "1 / 3", position: "relative", cursor: "pointer" }} onClick={() => openAt(0)}>
          <Image src={fotos[0].urlCloudinary} alt="" fill className="object-cover" priority sizes="(min-width: 1024px) 38vw, 0px" />
          <GaleriaChip />
        </div>

        {/* Slots 1-4 */}
        {fotos.slice(1, 5).map((foto, i) => {
          const isLast = i === 3 && extra > 0;
          return (
            <div key={foto.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => openAt(i + 1)}>
              <Image src={foto.urlCloudinary} alt="" fill className="object-cover" sizes="(min-width: 1024px) 20vw, 0px" />
              {isLast && <MoreOverlay />}
            </div>
          );
        })}
      </div>
    );
  };

  /* ── MOBILE CAROUSEL (hidden on desktop) ──────────────────────── */
  const renderMobileCarousel = () => (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl cursor-pointer"
        style={{ aspectRatio: "16/9", background: "var(--background-mp-alt)" }}
        onClick={() => openAt(mobileIdx)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEndMobile}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mobileIdx}
            initial={mobileDir === "right" ? slideVariants.enterRight : slideVariants.enterLeft}
            animate={slideVariants.center}
            exit={mobileDir === "right" ? slideVariants.exitLeft : slideVariants.exitRight}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={fotos[mobileIdx].urlCloudinary}
              alt=""
              fill
              className="object-cover"
              priority={mobileIdx === 0}
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); mobilePrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 10px rgba(0,0,0,0.14)", opacity: 0.8 }}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "var(--antracite)" }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); mobileNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 10px rgba(0,0,0,0.14)", opacity: 0.8 }}
              aria-label="Foto siguiente"
            >
              <ChevronRight className="w-5 h-5" style={{ color: "var(--antracite)" }} />
            </button>
          </>
        )}

        <div
          className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium tabular-nums"
          style={{ background: "rgba(0,0,0,0.48)", color: "white", fontFamily: "var(--font-jakarta)" }}
        >
          {mobileIdx + 1} / {count}
        </div>
      </div>

      {/* Thumbnails */}
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              onClick={() => { setMobileDir(i > mobileIdx ? "right" : "left"); setMobileIdx(i); }}
              className="relative shrink-0 rounded-xl h-20 w-[76px]"
              style={{
                outline: i === mobileIdx ? "2.5px solid var(--terra-mid)" : "2.5px solid transparent",
                outlineOffset: "2px",
                opacity: i === mobileIdx ? 1 : 0.6,
                transition: "opacity 150ms, outline-color 150ms",
              }}
              aria-label={`Foto ${i + 1}`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <Image src={foto.urlCloudinary} alt="" fill className="object-cover" sizes="76px" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ── LIGHTBOX ─────────────────────────────────────────────────── */
  const renderLightbox = () => (
    <Dialog.Root open={lbOpen} onOpenChange={(open) => { if (!open) setLbOpen(false); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.90)" }} />
        <Dialog.Content
          aria-describedby={undefined}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
          onClick={closeLb}
        >
          <Dialog.Title className="sr-only">Galería de fotos</Dialog.Title>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ position: "relative", width: "90vw", height: "85vh", touchAction: "pan-y" }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEndLb}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={lbIdx}
                initial={lbDir === "right" ? slideVariants.enterRight : slideVariants.enterLeft}
                animate={slideVariants.center}
                exit={lbDir === "right" ? slideVariants.exitLeft : slideVariants.exitRight}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{ position: "absolute", inset: 0 }}
              >
                <Image src={fotos[lbIdx].urlCloudinary} alt="" fill className="object-contain" sizes="90vw" priority />
              </motion.div>
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  onClick={lbPrev}
                  style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", opacity: 0.8, transition: "opacity 150ms" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft style={{ width: 24, height: 24, color: "white" }} />
                </button>
                <button
                  onClick={lbNext}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", opacity: 0.8, transition: "opacity 150ms" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                  aria-label="Foto siguiente"
                >
                  <ChevronRight style={{ width: 24, height: 24, color: "white" }} />
                </button>
              </>
            )}
          </motion.div>

          <Dialog.Close
            style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", opacity: 0.8, transition: "opacity 150ms" }}
            aria-label="Cerrar"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
          >
            <X style={{ width: 20, height: 20, color: "white" }} />
          </Dialog.Close>

          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "6px 16px", borderRadius: 20, background: "rgba(255,255,255,0.15)", color: "white", fontSize: 14, fontWeight: 500, fontFamily: "var(--font-jakarta)", fontVariantNumeric: "tabular-nums", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {lbIdx + 1} / {count}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">{renderDesktopMosaic()}</div>

      {/* Mobile */}
      <div className="lg:hidden">{renderMobileCarousel()}</div>

      {/* Lightbox (shared) */}
      {renderLightbox()}
    </>
  );
}
