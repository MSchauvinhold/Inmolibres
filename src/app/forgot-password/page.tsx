"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/crm/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await res.json() as { error?: string };
      if (res.status === 429) {
        setError(json.error ?? "Demasiados intentos. Esperá 15 minutos.");
        return;
      }
      // Respuesta siempre genérica — mostrar éxito independientemente
      setEnviado(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
      data-color-scheme="light"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ maxWidth: 400, width: "100%" }}
      >
        {/* Logo */}
        <div className="mb-8">
          <Logo variant="lockup" size={22} />
        </div>

        {!enviado ? (
          <>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                color: "var(--terracota-600, #A85737)",
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
              }}
            >
              Recuperar acceso
            </span>
            <h1
              style={{
                fontFamily: "var(--font-fraunces-display), Georgia, serif",
                fontSize: 32,
                margin: "10px 0 6px",
                color: "var(--antracita-900, #14110E)",
                fontWeight: 700,
              }}
            >
              Olvidaste tu contraseña
            </h1>
            <p style={{ fontSize: 14, color: "var(--antracita-500, #3A332C)", margin: "0 0 28px" }}>
              Ingresá tu email y te enviaremos un enlace para restablecerla.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    boxShadow: "0 1px 2px rgba(58,35,18,0.06)",
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

              {error && (
                <p className="text-sm text-center" style={{ color: "var(--danger-500, #B23A2D)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary flex items-center justify-center gap-2 w-full"
                style={{ height: 50, fontSize: 15, borderRadius: 12 }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {loading ? "Enviando..." : "Enviar instrucciones"}
              </button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: "center" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: "var(--success-100, #DCEAE0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: "var(--success-500, #4A7C59)" }} />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-fraunces-display), Georgia, serif",
                fontSize: 26,
                margin: "0 0 10px",
                color: "var(--antracita-900, #14110E)",
              }}
            >
              Revisá tu email
            </h2>
            <p style={{ fontSize: 14, color: "var(--antracita-500, #3A332C)", lineHeight: 1.55, margin: "0 0 28px" }}>
              Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
            <p style={{ fontSize: 12.5, color: "var(--antracita-300, #6F665C)" }}>
              ¿No llegó nada? Revisá la carpeta de spam.
            </p>
          </motion.div>
        )}

        {/* Volver al login */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link
            href="/login"
            style={{
              fontSize: 13.5,
              color: "var(--antracita-500, #3A332C)",
              textDecoration: "none",
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
