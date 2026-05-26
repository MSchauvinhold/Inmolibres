import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toPlanKey, LIMITES_PLAN, type PlanKey } from "@/lib/planes";
import { Check, X, MessageCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Planes — InmoLibres" };

const PLANES_CONFIG: {
  key: PlanKey;
  precio: string;
  periodo: string;
  tagline: string;
  destacado?: boolean;
}[] = [
  {
    key: "BASICO",
    precio: "$15.999",
    periodo: "/mes",
    tagline: "Para dueños que quieren publicar sin intermediarios.",
  },
  {
    key: "AVANZADO",
    precio: "$44.999",
    periodo: "/mes",
    tagline: "El CRM completo para inmobiliarias en crecimiento.",
    destacado: false,
  },
  {
    key: "PRO",
    precio: "$62.999",
    periodo: "/mes",
    tagline: "Contratos, finanzas y gestión completa sin límites.",
    destacado: true,
  },
];

const FEATURES_BY_PLAN: { label: string; BASICO: boolean; AVANZADO: boolean; PRO: boolean }[] = [
  { label: "Marketplace público",        BASICO: true,  AVANZADO: true,  PRO: true  },
  { label: "Hasta 4 propiedades",        BASICO: true,  AVANZADO: false, PRO: false },
  { label: "Propiedades ilimitadas",     BASICO: false, AVANZADO: true,  PRO: true  },
  { label: "Consultas de interesados",   BASICO: true,  AVANZADO: true,  PRO: true  },
  { label: "CRM de prospectos (Kanban)", BASICO: false, AVANZADO: true,  PRO: true  },
  { label: "Agenda de visitas",          BASICO: false, AVANZADO: true,  PRO: true  },
  { label: "Calculadoras (ICL/IPC, escrituración, comisiones, divisas)", BASICO: false, AVANZADO: true,  PRO: true  },
  { label: "Hasta 2 agentes",           BASICO: false, AVANZADO: true,  PRO: false },
  { label: "Hasta 3 agentes",           BASICO: false, AVANZADO: false, PRO: true  },
  { label: "Contratos con PDF legal",    BASICO: false, AVANZADO: false, PRO: true  },
  { label: "Historial de pagos",         BASICO: false, AVANZADO: false, PRO: true  },
  { label: "Dashboard de finanzas",      BASICO: false, AVANZADO: false, PRO: true  },
  { label: "Contactos y documentos",     BASICO: false, AVANZADO: false, PRO: true  },
  { label: "Alertas automáticas",        BASICO: false, AVANZADO: true,  PRO: true  },
];

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const planActual = toPlanKey(session.user.plan);
  const isParticular = session.user.rol === "PARTICULAR";
  const backHref = isParticular ? "/particular/propiedades" : "/dashboard";
  const waBase = `https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ""}`;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      {/* Back nav */}
      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: "var(--antracita-400)" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </Link>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-12 text-center">
        <p
          className="text-xs uppercase tracking-[0.18em] font-semibold mb-3"
          style={{
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: "var(--terracota-500, #C1694F)",
          }}
        >
          Planes y precios
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold leading-tight"
          style={{
            fontFamily: "var(--font-fraunces-display), 'Playfair Display', Georgia, serif",
            color: "var(--antracita-900, #14110E)",
          }}
        >
          El plan correcto para
          <br />
          <em style={{ color: "var(--terracota-500)", fontStyle: "italic" }}>tu negocio inmobiliario</em>
        </h1>
        <p className="mt-4 text-base max-w-lg mx-auto" style={{ color: "var(--antracita-400)" }}>
          Desde publicar tu propiedad hasta gestionar contratos, finanzas y agentes. Elegí el nivel que necesitás.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANES_CONFIG.map((p, i) => {
            const limite = LIMITES_PLAN[p.key];
            const isCurrent = planActual === p.key;
            const waMsg = encodeURIComponent(`Hola, quiero actualizar mi plan de InmoLibres a ${limite.nombre}.`);

            return (
              <div
                key={p.key}
                style={{
                  background: p.destacado ? "var(--antracita-900, #14110E)" : "#fff",
                  border: p.destacado
                    ? "2px solid var(--dorado-500, #D4A853)"
                    : isCurrent
                    ? "2px solid var(--terracota-300, #E0A088)"
                    : "1px solid var(--border, #E8DFD0)",
                  borderRadius: 20,
                  padding: 28,
                  position: "relative",
                  boxShadow: p.destacado
                    ? "0 8px 32px rgba(212,168,83,0.18), 0 2px 8px rgba(0,0,0,0.10)"
                    : "0 2px 8px rgba(58,35,18,0.06)",
                  animationDelay: `${i * 80}ms`,
                }}
                className="il-card-upgrade"
              >
                {/* Badge Recomendado / Tu plan actual */}
                {(p.destacado || isCurrent) && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: p.destacado
                        ? "var(--dorado-500, #D4A853)"
                        : "var(--terracota-500, #C1694F)",
                      color: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isCurrent ? "✓ Tu plan actual" : "Recomendado"}
                  </div>
                )}

                {/* Nombre del plan */}
                <p
                  className="text-xs uppercase tracking-[0.14em] font-semibold mb-2"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: p.destacado ? "var(--dorado-400, #E8C46B)" : "var(--antracita-400)",
                  }}
                >
                  {limite.nombre}
                </p>

                {/* Precio */}
                <div className="mb-1">
                  <span
                    className="text-4xl font-bold"
                    style={{
                      fontFamily: "var(--font-fraunces-display), Georgia, serif",
                      color: p.destacado ? "#fff" : "var(--antracita-900)",
                    }}
                  >
                    {p.precio}
                  </span>
                  {p.periodo && (
                    <span className="text-sm ml-1" style={{ color: p.destacado ? "rgba(255,255,255,0.5)" : "var(--antracita-300)" }}>
                      {p.periodo}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                <p
                  className="text-sm mb-6 leading-snug"
                  style={{ color: p.destacado ? "rgba(255,255,255,0.65)" : "var(--antracita-400)" }}
                >
                  {p.tagline}
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-8">
                  {FEATURES_BY_PLAN.map((f) => {
                    const tiene = f[p.key];
                    return (
                      <li
                        key={f.label}
                        className="flex items-start gap-2.5"
                        style={{ opacity: tiene ? 1 : 0.35 }}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: tiene
                              ? p.destacado ? "rgba(212,168,83,0.25)" : "rgba(27,67,50,0.1)"
                              : "transparent",
                          }}
                        >
                          {tiene
                            ? <Check className="w-2.5 h-2.5" style={{ color: p.destacado ? "var(--dorado-400)" : "var(--brand-primary, #1B4332)" }} />
                            : <X className="w-2.5 h-2.5" style={{ color: p.destacado ? "rgba(255,255,255,0.3)" : "var(--antracita-300)" }} />
                          }
                        </span>
                        <span
                          className="text-[13px] leading-snug"
                          style={{ color: p.destacado ? (tiene ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)") : (tiene ? "var(--antracita-700)" : "var(--antracita-300)") }}
                        >
                          {f.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-center"
                    style={{
                      background: p.destacado ? "rgba(255,255,255,0.08)" : "var(--crema-100)",
                      color: p.destacado ? "rgba(255,255,255,0.5)" : "var(--antracita-300)",
                    }}
                  >
                    Plan actual
                  </div>
                ) : (
                  <a
                    href={`${waBase}?text=${waMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: p.destacado
                        ? "var(--dorado-500, #D4A853)"
                        : "var(--antracita-900, #14110E)",
                      color: "#fff",
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contactar para actualizar
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-8" style={{ color: "var(--antracita-300)" }}>
          Precios en ARS. Las suscripciones se gestionan con el equipo de InmoLibres.
          <br />
          Ante cualquier consulta escribinos por WhatsApp al{" "}
          <a href={waBase} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--terracota-500)" }}>
            soporte
          </a>.
        </p>
      </div>
    </div>
  );
}
