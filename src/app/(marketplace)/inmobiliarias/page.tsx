import type { Metadata } from "next";
import {
  Building2, Users, FileText, Wallet, ShieldCheck, BarChart3,
  MessageCircle, CheckCircle2,
} from "lucide-react";
import { WA_INMOBILIARIA } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "CRM inmobiliario en Argentina — Software de gestión para inmobiliarias",
  description:
    "Sistema de gestión (CRM/ERP) para inmobiliarias: propiedades, clientes, contratos de alquiler y compraventa con ajuste automático por ICL/IPC, finanzas y comisiones, todo en un solo lugar. Publicación automática en el marketplace de InmoLibres.",
  alternates: { canonical: "/inmobiliarias" },
  openGraph: {
    title: "CRM inmobiliario en Argentina — InmoLibres",
    description:
      "El sistema de gestión hecho para inmobiliarias: propiedades, clientes, contratos y finanzas en un solo lugar.",
  },
};

const FEATURES = [
  {
    icon: Building2,
    title: "Gestión de propiedades",
    text: "Cargá tus propiedades una vez y publicalas automáticamente en el marketplace. Fotos, videos, mapa y todos los datos en un solo lugar.",
  },
  {
    icon: Users,
    title: "Clientes y prospectos",
    text: "Pipeline de ventas, visitas agendadas y seguimiento de cada contacto para que ningún interesado se pierda en el camino.",
  },
  {
    icon: FileText,
    title: "Contratos con ajuste automático",
    text: "Generá contratos de alquiler y compraventa, con ajustes periódicos por índice ICL o IPC calculados automáticamente.",
  },
  {
    icon: Wallet,
    title: "Finanzas y comisiones",
    text: "Registrá comisiones de alquiler y venta, egresos y el resultado de tu inmobiliaria, mes a mes, sin planillas sueltas.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-agente con permisos",
    text: "Sumá agentes a tu equipo con permisos por módulo: cada uno ve y edita solo lo que le corresponde.",
  },
  {
    icon: BarChart3,
    title: "Reportes y métricas",
    text: "Operaciones cerradas, ranking de agentes y evolución de tu inmobiliaria en gráficos claros, sin armar nada a mano.",
  },
];

const PASOS = [
  { n: "1", title: "Nos escribís", text: "Nos contás sobre tu inmobiliaria por WhatsApp y vemos qué plan se ajusta a tu operación." },
  { n: "2", title: "Te damos de alta", text: "Creamos tu cuenta, cargamos tu logo y tus datos, y migramos tus propiedades si ya las tenés en otro lado." },
  { n: "3", title: "Empezás a operar", text: "Gestionás todo desde el sistema y tus propiedades quedan publicadas en el marketplace, sin trabajo extra." },
];

export default function InmobiliariasPage() {
  return (
    <main>
      {/* Hero */}
      <section
        className="px-5 sm:px-8 pt-16 pb-14 text-center"
        style={{ background: "linear-gradient(180deg, var(--terracota-100, #FAE5D3) 0%, var(--crema-50, #FBF8F2) 100%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <span
            className="inline-block mb-5 px-3 py-1 rounded-full"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--terracota-700, #7E3F26)",
              background: "rgba(255,255,255,0.7)",
              border: "1px solid var(--terracota-300, #E0A088)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Para inmobiliarias
          </span>
          <h1
            style={{
              fontFamily: "var(--font-fraunces-display), Georgia, serif",
              fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.08,
              color: "var(--antracita-900, #14110E)",
              margin: "0 0 16px",
            }}
          >
            El CRM inmobiliario hecho para trabajar en Argentina
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--antracita-500, #3A332C)",
              maxWidth: 620,
              margin: "0 auto 28px",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            Gestioná propiedades, clientes, contratos y finanzas desde un solo sistema — y aparecé
            automáticamente en el marketplace de InmoLibres, sin cargar nada dos veces.
          </p>
          <a
            href={WA_INMOBILIARIA}
            target="_blank"
            rel="noreferrer"
            className="btn-terra inline-flex items-center gap-2"
            style={{ fontSize: 14, padding: "12px 26px", borderRadius: 14 }}
          >
            <MessageCircle size={16} />
            Quiero conocer el sistema
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4" style={{ background: "var(--crema-50, #FBF8F2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900, #14110E)", letterSpacing: "-0.02em" }}
            >
              Todo lo que tu inmobiliaria necesita
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "var(--antracita-300, #6F665C)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Un sistema de gestión (CRM/ERP) pensado por y para el día a día de una inmobiliaria argentina.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-7 rounded-2xl transition-transform hover:-translate-y-1"
                style={{ background: "white", boxShadow: "var(--shadow-il)", border: "1px solid var(--border, #E8DFD0)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "var(--terracota-50, #FBF1EC)" }}
                >
                  <f.icon className="w-7 h-7" style={{ color: "var(--terracota-500, #C1694F)" }} />
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "var(--antracita-900, #14110E)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--antracita-500, #3A332C)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 px-4" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-12"
            style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900, #14110E)", letterSpacing: "-0.02em" }}
          >
            Cómo empezar
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {PASOS.map((p) => (
              <div key={p.n} className="text-center">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4 font-bold"
                  style={{ background: "var(--terracota-500, #C1694F)", color: "white", fontFamily: "var(--font-fraunces-display), Georgia, serif" }}
                >
                  {p.n}
                </div>
                <h3 className="font-semibold text-base mb-2" style={{ color: "var(--antracita-900, #14110E)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--antracita-500, #3A332C)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        className="py-16 px-5 text-center"
        style={{ background: "var(--antracita-900, #14110E)" }}
      >
        <div className="max-w-xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--crema-100, #F5EFE5)" }}
          >
            Sumá tu inmobiliaria a InmoLibres
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--crema-300, #D9C9B0)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
            <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
            Sin permanencia forzada · planes según el tamaño de tu operación
          </p>
          <a
            href={WA_INMOBILIARIA}
            target="_blank"
            rel="noreferrer"
            className="btn-terra inline-flex items-center gap-2"
            style={{ fontSize: 14, padding: "12px 26px", borderRadius: 14 }}
          >
            <MessageCircle size={16} />
            Hablar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
