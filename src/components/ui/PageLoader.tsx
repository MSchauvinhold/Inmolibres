"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Buscando propiedades...",
  "Preparando tu búsqueda...",
  "Casi listo...",
];

export function PageLoader() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "var(--background-mp)" }}
    >
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Smoke from chimney */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={68}
              cy={24}
              r={3 - i * 0.4}
              fill="#8B4513"
              animate={{
                y: [0, -18],
                opacity: [0.75, 0],
                scale: [1, 1.7],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.46,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Chimney */}
          <rect x="62" y="18" width="10" height="24" rx="2.5" fill="#6B3410" />

          {/* Roof */}
          <polygon points="8,52 48,12 88,52" fill="#8B4513" />
          {/* Roof highlight */}
          <polygon points="8,52 48,14 88,52" fill="#A0522D" opacity="0.3" />

          {/* House body */}
          <rect x="16" y="50" width="64" height="40" rx="4" fill="#C1694F" />

          {/* Left window */}
          <rect x="22" y="58" width="18" height="15" rx="3" fill="#FAE5D3" />
          <line x1="31" y1="58" x2="31" y2="73" stroke="#C1694F" strokeWidth="1.5" />
          <line x1="22" y1="65.5" x2="40" y2="65.5" stroke="#C1694F" strokeWidth="1.5" />

          {/* Right window */}
          <rect x="56" y="58" width="18" height="15" rx="3" fill="#FAE5D3" />
          <line x1="65" y1="58" x2="65" y2="73" stroke="#C1694F" strokeWidth="1.5" />
          <line x1="56" y1="65.5" x2="74" y2="65.5" stroke="#C1694F" strokeWidth="1.5" />

          {/* Door */}
          <rect x="38" y="66" width="20" height="24" rx="3.5" fill="#FAE5D3" />
          {/* Door knob */}
          <circle cx="55" cy="78" r="2" fill="#C1694F" />

          {/* Steps */}
          <rect x="35" y="88" width="26" height="3.5" rx="1.75" fill="#A0522D" />
        </svg>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="mt-7 text-sm font-medium tracking-wide"
          style={{
            color: "var(--antracite-mid)",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          {MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--terra-mid)" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
