"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff, Loader2, Home, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/crm/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detectar ?reset=success y mostrar toast de confirmación
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "success") {
        toast.success("¡Contraseña actualizada! Podés ingresar con tu nueva contraseña.");
        // Limpiar el query param de la URL sin recargar
        const url = new URL(window.location.href);
        url.searchParams.delete("reset");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Email o contraseña incorrectos");
      } else {
        const session = await getSession();
        if (session?.user?.rol === "SUPERADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      toast.error("Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" data-color-scheme="light" style={{ colorScheme: "light" }}>
      {/* Left panel — terracota brand */}
      <div
        className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between"
        style={{
          background: "linear-gradient(180deg, var(--terracota-500, #C1694F) 0%, var(--terracota-700, #8C3D27) 60%, var(--marron-900, #2A1208) 100%)",
          padding: "48px 56px",
          color: "var(--crema-50, #FBF8F2)",
        }}
      >
        {/* Grain overlay */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, opacity: 0.08, mixBlendMode: "multiply", pointerEvents: "none" }}
          aria-hidden="true"
        >
          <filter id="grain-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain-noise)" />
        </svg>

        {/* Architectural skyline illustration */}
        <svg
          viewBox="0 0 540 260"
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 40,
            left: 56,
            right: 56,
            width: "calc(100% - 112px)",
            opacity: 0.16,
            color: "var(--crema-50, #FBF8F2)",
          }}
        >
          <g stroke="currentColor" strokeWidth="0.9" fill="none">
            <path d="M0 240 L0 200 L40 200 L60 175 L80 200 L130 200 L130 160 L180 160 L180 140 L210 140 L210 175 L230 175 L250 150 L270 175 L280 175 L280 130 L320 130 L320 165 L360 165 L380 145 L400 165 L460 165 L460 190 L500 190 L500 170 L540 170 L540 240 Z" />
            {([[16,215],[26,215],[40,210],[150,170],[160,170],[170,170],[190,150],[200,150],[290,140],[300,140],[310,140],[330,175],[340,175],[350,175],[470,175],[480,175],[490,175]] as [number,number][]).map(([x,y], i) => (
              <rect key={i} x={x} y={y} width="6" height="8" />
            ))}
          </g>
        </svg>

        {/* Logo */}
        <div style={{ position: "relative" }}>
          <Logo variant="lockup" size={24} onDark />
        </div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ position: "relative" }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              color: "var(--terracota-300, #F0A98A)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Portal ERP / CRM
          </span>
          <h1
            style={{
              fontFamily: "var(--font-fraunces-display), Georgia, serif",
              fontSize: "clamp(2.5rem, 3.8vw, 3.5rem)",
              margin: "16px 0 0",
              color: "var(--crema-50, #FBF8F2)",
              lineHeight: 1.05,
              maxWidth: 460,
              fontWeight: 700,
            }}
          >
            El sistema<br />
            operativo de tu<br />
            <em style={{ color: "var(--terracota-300, #F0A98A)" }}>inmobiliaria.</em>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "var(--crema-300, #DDD5C8)",
              maxWidth: 400,
              lineHeight: 1.55,
              margin: "20px 0 0",
              fontFamily: "var(--font-dm-sans, sans-serif)",
            }}
          >
            Propiedades, clientes, contratos y finanzas — en un solo lugar.
          </p>

          <div style={{ marginTop: 48, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["ERP", "CRM", "Marketplace"].map((k) => (
              <span
                key={k}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "var(--crema-50, #FBF8F2)",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 500,
                  fontFamily: "var(--font-dm-sans, sans-serif)",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Footer row */}
        <div
          style={{
            position: "relative",
            fontSize: 11,
            color: "var(--terracota-300, #F0A98A)",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          <span>v2.0 · Tierra Moderna</span>
          <span>Paso de los Libres, Corrientes</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="flex-1 flex items-center justify-center px-8 py-12"
        style={{ background: "var(--crema-50, #FBF8F2)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{ maxWidth: 380, width: "100%" }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              color: "var(--terracota-600, #A85737)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Iniciar sesión
          </span>
          <h2
            style={{
              fontFamily: "var(--font-fraunces-display), Georgia, serif",
              fontSize: 36,
              margin: "10px 0 6px",
              color: "var(--antracita-900, #14110E)",
              fontWeight: 700,
            }}
          >
            Bienvenido de vuelta
          </h2>
          <p style={{ fontSize: 14, color: "var(--antracita-500, #3A332C)", margin: "0 0 32px" }}>
            Ingresá con la cuenta de tu inmobiliaria
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email field */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--antracita-500, #3A332C)" }}
              >
                Email
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fff",
                  border: "1px solid var(--border, #E8DFD0)",
                  borderRadius: 12,
                  padding: "0 14px",
                  height: 48,
                  boxShadow: "var(--shadow-sm-il)",
                }}
              >
                <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--antracita-300, #6F665C)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@inmobiliaria.com"
                  required
                  autoComplete="email"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    fontSize: 14,
                    color: "var(--antracita-900, #14110E)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--antracita-500, #3A332C)" }}
                >
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12.5,
                    color: "var(--terracota-600, #A85737)",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fff",
                  border: "1px solid var(--border, #E8DFD0)",
                  borderRadius: 12,
                  padding: "0 14px",
                  height: 48,
                  boxShadow: "var(--shadow-sm-il)",
                }}
              >
                <Lock className="w-4 h-4 shrink-0" style={{ color: "var(--antracita-300, #6F665C)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    fontSize: 14,
                    color: "var(--antracita-900, #14110E)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                  style={{ color: "var(--antracita-300, #6F665C)" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 w-full"
              style={{ height: 52, fontSize: 15, marginTop: 8, borderRadius: 12 }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border, #E8DFD0)" }} />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--antracita-300, #6F665C)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                o
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border, #E8DFD0)" }} />
            </div>

            <Link
              href="/"
              style={{
                fontSize: 13.5,
                color: "var(--antracita-700, #221E19)",
                textDecoration: "none",
                display: "inline-flex",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Home className="w-3.5 h-3.5" style={{ color: "var(--antracita-500, #3A332C)" }} />
              Volver al marketplace
            </Link>
          </form>

          {/* Promo box */}
          <div
            style={{
              marginTop: 40,
              padding: 16,
              background: "var(--crema-100, #F5EFE5)",
              borderRadius: 12,
              border: "1px solid var(--border, #E8DFD0)",
              display: "flex",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--terracota-100, #FCEAE4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "var(--terracota-600, #A85737)" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--antracita-900, #14110E)" }}>
                ¿Tu inmobiliaria no usa InmoLibres todavía?
              </p>
              <p style={{ fontSize: 12.5, color: "var(--antracita-500, #3A332C)", marginTop: 2 }}>
                <Link
                  href="/registro"
                  style={{ color: "var(--terracota-600, #A85737)", fontWeight: 500, textDecoration: "none" }}
                >
                  Registrala gratis →
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
