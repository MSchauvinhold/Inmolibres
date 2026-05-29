"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Lock,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/crm/Logo";

/* ── Campo de contraseña con ojo ───────────────────────────────── */
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: "var(--antracita-500, #3A332C)" }}
      >
        {label}
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
        <Lock
          className="w-4 h-4 shrink-0"
          style={{ color: "var(--antracita-300, #6F665C)" }}
        />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete={autoComplete}
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
          onClick={() => setShow((p) => !p)}
          tabIndex={-1}
          style={{ color: "var(--antracita-300, #6F665C)" }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── Contenido principal (usa useSearchParams → necesita Suspense) */
function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token") ?? "";
  const uid = params.get("uid") ?? "";

  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exitoso, setExitoso] = useState(false);

  const missingParams = !token || !uid;

  // Validaciones en tiempo real
  const checks = {
    largo: nueva.length >= 8,
    mayus: /[A-Z]/.test(nueva),
    numero: /[0-9]/.test(nueva),
    match: nueva === confirmar && confirmar.length > 0,
  };
  const allValid = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allValid) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, uid, nueva, confirmar }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Ocurrió un error. Intentá de nuevo.");
        return;
      }
      setExitoso(true);
      setTimeout(() => router.push("/login?reset=success"), 1800);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Parámetros faltantes / token inválido en URL ── */
  if (missingParams) {
    return (
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
            background: "var(--danger-100, #FDECEA)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <AlertCircle
            className="w-8 h-8"
            style={{ color: "var(--danger-500, #B23A2D)" }}
          />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            fontSize: 26,
            margin: "0 0 10px",
            color: "var(--antracita-900, #14110E)",
          }}
        >
          Enlace inválido
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--antracita-500, #3A332C)",
            lineHeight: 1.55,
            margin: "0 0 24px",
          }}
        >
          Este enlace no es válido o ya expiró. Solicitá uno nuevo desde la
          página de recuperación.
        </p>
        <Link
          href="/forgot-password"
          className="btn-primary inline-flex items-center gap-2"
          style={{ borderRadius: 10, fontSize: 14, padding: "10px 22px" }}
        >
          Solicitar nuevo enlace
        </Link>
      </motion.div>
    );
  }

  /* ── Éxito ── */
  if (exitoso) {
    return (
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
          <CheckCircle
            className="w-8 h-8"
            style={{ color: "var(--success-500, #4A7C59)" }}
          />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            fontSize: 26,
            margin: "0 0 10px",
            color: "var(--antracita-900, #14110E)",
          }}
        >
          ¡Contraseña actualizada!
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--antracita-500, #3A332C)",
            lineHeight: 1.55,
          }}
        >
          Redirigiendo al inicio de sesión…
        </p>
      </motion.div>
    );
  }

  /* ── Formulario ── */
  return (
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
        Nueva contraseña
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
        Restablecé tu contraseña
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--antracita-500, #3A332C)",
          margin: "0 0 28px",
        }}
      >
        Elegí una contraseña segura para tu cuenta.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <PasswordField
          label="Nueva contraseña"
          value={nueva}
          onChange={setNueva}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmar contraseña"
          value={confirmar}
          onChange={setConfirmar}
          autoComplete="new-password"
        />

        {/* Chips de validación */}
        {nueva.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { key: "largo", label: "8+ caracteres", ok: checks.largo },
              { key: "mayus", label: "Una mayúscula", ok: checks.mayus },
              { key: "numero", label: "Un número", ok: checks.numero },
              {
                key: "match",
                label: "Contraseñas coinciden",
                ok: checks.match,
              },
            ].map(({ key, label, ok }) => (
              <span
                key={key}
                style={{
                  fontSize: 11.5,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontWeight: 500,
                  background: ok
                    ? "var(--success-100, #DCEAE0)"
                    : "var(--crema-200, #EDE5D6)",
                  color: ok
                    ? "var(--success-700, #2D6245)"
                    : "var(--antracita-400, #5C554C)",
                  transition: "all 0.2s ease",
                }}
              >
                {ok ? "✓" : "·"} {label}
              </span>
            ))}
          </div>
        )}

        {error && (
          <p
            className="text-sm text-center"
            style={{ color: "var(--danger-500, #B23A2D)" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !allValid}
          className="btn-primary flex items-center justify-center gap-2 w-full"
          style={{ height: 50, fontSize: 15, borderRadius: 12 }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </>
  );
}

/* ── Page wrapper ──────────────────────────────────────────────── */
export default function ResetPasswordPage() {
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

        {/* useSearchParams requiere Suspense en Next.js 15 */}
        <Suspense fallback={<div style={{ minHeight: 260 }} />}>
          <ResetPasswordContent />
        </Suspense>

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
