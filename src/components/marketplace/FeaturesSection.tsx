"use client";

import { Home, Shield, MessageCircle } from "lucide-react";

const FEATURES = [
  {
    icon: Home,
    title: "Propiedades locales",
    text: "Todas las inmobiliarias de Paso de los Libres en un solo lugar.",
    iconBg: "var(--terracota-50, #FBF1EC)",
    iconColor: "var(--terracota-500, #C1694F)",
  },
  {
    icon: Shield,
    title: "Publicaciones verificadas",
    text: "Cada propiedad es publicada por inmobiliarias de confianza de la ciudad.",
    iconBg: "#E8F5E9",
    iconColor: "#2D6A4F",
  },
  {
    icon: MessageCircle,
    title: "Contacto directo",
    text: "Hablá directamente con la inmobiliaria por WhatsApp sin intermediarios.",
    iconBg: "var(--terracota-50, #FBF1EC)",
    iconColor: "var(--terracota-500, #C1694F)",
  },
];

export function FeaturesSection() {
  return (
    <section
      className="py-16 px-4"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-fraunces-display), Georgia, serif",
              color: "var(--antracita-900, #14110E)",
              letterSpacing: "-0.02em",
            }}
          >
            ¿Por qué InmoLibres?
          </h2>
          <p
            className="mt-3 text-sm max-w-md mx-auto"
            style={{ color: "var(--antracita-300, #6F665C)", fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            La forma más sencilla de encontrar propiedades en Paso de los Libres.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-7 rounded-2xl"
              style={{
                background: "white",
                boxShadow: "var(--shadow-il)",
                border: "1px solid var(--border, #E8DFD0)",
                transition: "box-shadow 200ms ease-out, transform 200ms ease-out",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg-il)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-il)";
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: feature.iconBg }}
              >
                <feature.icon
                  className="w-7 h-7"
                  style={{ color: feature.iconColor }}
                />
              </div>
              <h3
                className="font-semibold text-base mb-2"
                style={{
                  color: "var(--antracita-900, #14110E)",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--antracita-500, #3A332C)",
                  fontFamily: "var(--font-dm-sans), sans-serif",
                }}
              >
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
