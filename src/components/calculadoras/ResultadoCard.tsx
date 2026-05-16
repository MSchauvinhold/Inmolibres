"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "@/lib/calculadoras";

interface Props {
  label: string;
  valor: number;
  moneda: "ARS" | "USD";
  destacado?: boolean;
  descripcion?: string;
  size?: "sm" | "md" | "lg";
}

function useAnimatedNumber(target: number, duration = 380) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const frameRef = useRef(0);
  const startRef = useRef(0);
  const startValRef = useRef(target);

  useEffect(() => {
    if (Math.abs(prevRef.current - target) < 0.01) return;
    cancelAnimationFrame(frameRef.current);
    startValRef.current = prevRef.current;
    startRef.current = performance.now();

    function step(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValRef.current + (target - startValRef.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = target;
        setDisplay(target);
      }
    }

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

export function ResultadoCard({ label, valor, moneda, destacado, descripcion, size = "md" }: Props) {
  const animated = useAnimatedNumber(valor);

  const sizeMap = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  if (destacado) {
    return (
      <div
        className="rounded-2xl p-5 flex flex-col gap-1"
        style={{ background: "var(--brand-primary)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
          {label}
        </p>
        <p
          className={`${sizeMap[size]} font-bold tabular-nums text-white leading-none`}
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          {fmt(animated, moneda)}
        </p>
        {descripcion && (
          <p className="text-xs text-white/50 mt-1">{descripcion}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-0.5 border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <p
        className={`${sizeMap[size]} font-bold tabular-nums text-text-primary leading-none`}
        style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--brand-accent)" }}
      >
        {fmt(animated, moneda)}
      </p>
      {descripcion && (
        <p className="text-[11px] text-text-muted mt-0.5">{descripcion}</p>
      )}
    </div>
  );
}
