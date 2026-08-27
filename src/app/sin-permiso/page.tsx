import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Lock, ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Sin acceso — InmoLibres" };

interface SP { modulo?: string }

/**
 * Pantalla para cuando un AGENTE tiene el módulo bloqueado por falta de
 * PERMISO (el Admin no se lo activó), a diferencia de /upgrade que es para
 * cuando el módulo está bloqueado por PLAN. Mismo problema visible ("no puedo
 * entrar"), causa distinta — sugerirle a un agente que "mejore el plan" no
 * tiene sentido, la solución está en Configuración → Agentes de su Admin.
 */
export default async function SinPermisoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { modulo } = await searchParams;
  const nombreModulo = modulo?.trim() || "este módulo";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: "rgba(27,67,50,0.08)" }}
        >
          <Lock className="w-6 h-6" style={{ color: "var(--brand-primary, #1B4332)" }} />
        </div>

        <p
          className="text-xs uppercase tracking-[0.18em] font-semibold mb-3"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--terracota-500, #C1694F)" }}
        >
          Acceso restringido
        </p>

        <h1
          className="text-2xl md:text-3xl font-bold leading-tight mb-3"
          style={{ fontFamily: "var(--font-fraunces-display), 'Playfair Display', Georgia, serif", color: "var(--antracita-900, #14110E)" }}
        >
          Todavía no tenés acceso a {nombreModulo}
        </h1>

        <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--antracita-400)" }}>
          No es un problema de tu plan — tu administrador tiene que habilitarte este
          permiso desde <strong style={{ color: "var(--antracita-700)" }}>Configuración → Agentes</strong>.
          Pedíselo y vas a poder entrar sin hacer nada más.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--antracita-900, #14110E)", color: "#fff" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
