import type { Metadata } from "next";
import {
  Home, PencilLine, MessageCircle, Eye, CheckCircle2,
} from "lucide-react";
import { WA_PARTICULAR } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Publicá tu propiedad sin inmobiliaria — Dueño directo",
  description:
    "Vendé o alquilá tu casa, departamento o terreno vos mismo, sin comisión de inmobiliaria. Publicá como dueño directo en InmoLibres y recibí consultas por WhatsApp.",
  alternates: { canonical: "/publicar" },
  openGraph: {
    title: "Publicá tu propiedad sin inmobiliaria — InmoLibres",
    description: "Vendé o alquilá tu propiedad vos mismo, como dueño directo, sin comisión de inmobiliaria.",
  },
};

const FEATURES = [
  {
    icon: Home,
    title: "Hasta 4 propiedades",
    text: "Publicá hasta 4 propiedades propias en venta o alquiler, con la etiqueta de dueño directo.",
  },
  {
    icon: Eye,
    title: "Mismo marketplace que las inmobiliarias",
    text: "Tu propiedad aparece junto a las de las inmobiliarias de la zona, con fotos, mapa y toda la información.",
  },
  {
    icon: PencilLine,
    title: "Editá cuando quieras",
    text: "Cambiá el precio o la descripción vos mismo desde tu portal, sin depender de nadie para actualizarla.",
  },
  {
    icon: MessageCircle,
    title: "Consultas directas",
    text: "Los interesados te contactan directo a vos, por WhatsApp o email — sin intermediarios en el medio.",
  },
];

const PASOS = [
  { n: "1", title: "Nos escribís", text: "Nos contás qué querés publicar (vender o alquilar) por WhatsApp." },
  { n: "2", title: "Armamos tu publicación", text: "Te ayudamos a cargar fotos, descripción y ubicación en el mapa." },
  { n: "3", title: "Recibís consultas", text: "Tu propiedad queda visible en el marketplace y las consultas te llegan directo a vos." },
];

export default function PublicarPage() {
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
            Dueño directo
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
            Publicá tu propiedad vos mismo, sin inmobiliaria
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--antracita-500, #3A332C)",
              maxWidth: 580,
              margin: "0 auto 28px",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            Si sos el dueño y querés vender o alquilar directamente, te damos un espacio en el
            marketplace de InmoLibres para que la gente te encuentre — sin pagar comisión de inmobiliaria.
          </p>
          <a
            href={WA_PARTICULAR}
            target="_blank"
            rel="noreferrer"
            className="btn-terra inline-flex items-center gap-2"
            style={{ fontSize: 14, padding: "12px 26px", borderRadius: 14 }}
          >
            <MessageCircle size={16} />
            Quiero publicar mi propiedad
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4" style={{ background: "var(--crema-50, #FBF8F2)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900, #14110E)", letterSpacing: "-0.02em" }}
            >
              Vender o alquilar sin intermediarios
            </h2>
            <p className="mt-3 text-sm max-w-lg mx-auto" style={{ color: "var(--antracita-300, #6F665C)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Un espacio propio para dueños directos, dentro del mismo marketplace que usan las inmobiliarias.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
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
            Publicá tu propiedad hoy
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--crema-300, #D9C9B0)", fontFamily: "var(--font-dm-sans), sans-serif" }}>
            <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
            Sin comisión de inmobiliaria · publicación verificada
          </p>
          <a
            href={WA_PARTICULAR}
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
