"use client";

import { motion } from "motion/react";
import { Home, Shield, MessageCircle } from "lucide-react";

const FEATURES = [
  {
    icon: Home,
    title: "Propiedades locales",
    text: "Todas las inmobiliarias de Paso de los Libres en un solo lugar.",
    iconBg: "var(--terra-pale)",
    iconColor: "var(--terra-mid)",
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
    iconBg: "var(--terra-pale)",
    iconColor: "var(--terra-mid)",
  },
];

export function FeaturesSection() {
  return (
    <section
      className="py-16 px-4"
      style={{ background: "var(--background-mp-alt)" }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="text-center mb-12"
        >
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-fraunces)",
              color: "var(--antracite)",
              letterSpacing: "-0.02em",
            }}
          >
            ¿Por qué InmoLibres?
          </h2>
          <p
            className="mt-3 text-sm max-w-md mx-auto"
            style={{ color: "var(--antracite-light)", fontFamily: "var(--font-jakarta)" }}
          >
            La forma más sencilla de encontrar propiedades en Paso de los Libres.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.15, ease: "easeOut" }}
              whileHover={{ y: -4, boxShadow: "var(--shadow-mp-card-hover)" }}
              className="p-7 rounded-2xl"
              style={{
                background: "white",
                boxShadow: "var(--shadow-mp-card)",
                transition: "box-shadow 200ms ease-out",
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
                  color: "var(--antracite)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--antracite-mid)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {feature.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
