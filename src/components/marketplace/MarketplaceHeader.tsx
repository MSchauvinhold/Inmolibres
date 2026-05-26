"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Home, Bed, Clock, Map } from "lucide-react";
import { Logo } from "@/components/crm/Logo";

const NAV_LINKS = [
  { href: "/?operacion=VENTA", label: "Comprar", icon: Home },
  { href: "/?operacion=ALQUILER", label: "Alquilar", icon: Bed },
  { href: "/?operacion=ALQUILER_TEMPORARIO", label: "Temporario", icon: Clock },
  { href: "/mapa", label: "Mapa", icon: Map },
];

export function MarketplaceHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 24);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <>
      {/* Main header */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          height: scrolled ? 60 : 72,
          background: scrolled
            ? "rgba(255, 255, 255, 0.94)"
            : "rgba(250, 248, 245, 0)",
          backdropFilter: scrolled ? "blur(18px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(18px)" : "none",
          boxShadow: scrolled
            ? "0 1px 24px rgba(139, 69, 19, 0.09)"
            : "none",
          borderBottom: scrolled
            ? "1px solid rgba(221,213,200,0.6)"
            : "1px solid transparent",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo variant="lockup" size={22} />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden sm:flex items-center gap-8">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="relative text-sm font-medium group flex items-center gap-1.5"
                style={{
                  color: "var(--antracita-500, #3A332C)",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
                <span
                  className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 group-hover:w-full rounded-full"
                  style={{
                    background: "var(--terracota-500, #C1694F)",
                    transition: "width 280ms cubic-bezier(0.25,0.46,0.45,0.94)",
                  }}
                />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex btn-terra text-sm px-5 py-2 rounded-xl"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              Acceder
            </Link>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-xl transition-colors"
              style={{
                color: "var(--antracite)",
                background: mobileOpen ? "var(--terra-pale)" : "transparent",
              }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="sm:hidden sticky z-40 px-4 pt-2 pb-4 space-y-1"
            style={{
              top: scrolled ? 60 : 72,
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(16px)",
              borderBottom: "1px solid var(--cream-border)",
              boxShadow: "0 4px 16px rgba(139,69,19,0.08)",
            }}
          >
            {NAV_LINKS.map(({ href, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: "var(--antracita-900, #14110E)",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--terracota-50, #FBF1EC)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {Icon && <Icon className="w-4 h-4" style={{ color: "var(--terracota-500, #C1694F)" }} />}
                  {label}
                </Link>
              </motion.div>
            ))}
            <div className="pt-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block btn-terra text-center text-sm w-full rounded-xl py-3"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                Acceder
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
