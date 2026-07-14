import Link from "next/link";
import { PaginaEstatica } from "@/components/marketplace/PaginaEstatica";
import { WA_INMOBILIARIA, WA_PARTICULAR } from "@/lib/contacto";

export const metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas a las dudas más comunes sobre InmoLibres.",
};

const FAQS: { pregunta: string; respuesta: React.ReactNode }[] = [
  {
    pregunta: "¿Cómo publico mi propiedad?",
    respuesta: (
      <>
        Contactanos directamente{" "}
        <a href={WA_PARTICULAR} target="_blank" rel="noreferrer" style={{ color: "var(--terracota-600, #A85737)", fontWeight: 600 }}>
          por WhatsApp
        </a>{" "}
        y nos encargamos de cargar todo por vos: fotos, descripción, ubicación en el mapa y datos de contacto.
      </>
    ),
  },
  {
    pregunta: "¿Cuánto cuesta publicar?",
    respuesta: (
      <>
        Las inmobiliarias tienen planes mensuales accesibles con distintas prestaciones
        (publicaciones, agentes, contratos, finanzas). Si sos particular con una propiedad propia,
        tenemos opciones especiales para vos. Escribinos y te pasamos los detalles.
      </>
    ),
  },
  {
    pregunta: "¿Las publicaciones son verificadas?",
    respuesta: (
      <>
        Sí. Todas las propiedades son publicadas por inmobiliarias y particulares verificados.
        No hay publicaciones anónimas: siempre sabés con quién estás hablando.
      </>
    ),
  },
  {
    pregunta: "¿Puedo ver propiedades en el mapa?",
    respuesta: (
      <>
        ¡Sí! Tenemos un <Link href="/mapa" style={{ color: "var(--terracota-600, #A85737)", fontWeight: 600 }}>mapa interactivo</Link>{" "}
        donde podés ver todas las propiedades disponibles con sus precios y filtrarlas por tipo y operación.
      </>
    ),
  },
  {
    pregunta: "¿Qué necesito para alquilar?",
    respuesta: (
      <>
        Generalmente necesitás: DNI, recibos de sueldo o garantía, y en algunos casos un garante.
        Cada inmobiliaria puede tener requisitos distintos — consultale directamente por WhatsApp desde la publicación.
      </>
    ),
  },
  {
    pregunta: "¿Cuánto es la comisión?",
    respuesta: (
      <>
        La comisión varía según la inmobiliaria. En general ronda entre el 3% y 4% para ventas,
        y un mes de alquiler para locaciones. Consultá con la inmobiliaria de la propiedad que te interese.
      </>
    ),
  },
  {
    pregunta: "¿Cómo contacto a una inmobiliaria?",
    respuesta: (
      <>
        Cada publicación tiene un botón de WhatsApp que te conecta directamente con la inmobiliaria
        o el particular que la publicó, sin intermediarios.
      </>
    ),
  },
];


export default function PreguntasFrecuentesPage() {
  return (
    <PaginaEstatica
      titulo="Preguntas frecuentes"
      subtitulo="Las respuestas a las dudas más comunes. Si no encontrás la tuya, escribinos."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQS.map((faq) => (
          <details
            key={faq.pregunta}
            className="group"
            style={{
              background: "#fff",
              border: "1px solid var(--border, #E8DFD0)",
              borderRadius: 14,
              padding: "16px 20px",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 15,
                color: "var(--antracita-900, #14110E)",
                listStyle: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              {faq.pregunta}
              <span
                className="group-open:rotate-45 transition-transform"
                style={{ fontSize: 20, color: "var(--terracota-500, #C1694F)", flexShrink: 0, lineHeight: 1 }}
              >
                +
              </span>
            </summary>
            <div style={{ marginTop: 10, fontSize: 14, color: "var(--antracita-500, #3A332C)" }}>
              {faq.respuesta}
            </div>
          </details>
        ))}
      </div>

      {/* CTA — dos públicos: inmobiliarias y particulares */}
      <div
        className="mt-12 p-7 sm:p-9 rounded-2xl text-center"
        style={{ background: "var(--antracita-900, #14110E)" }}
      >
        <h2
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--crema-50, #FBF8F2)",
            margin: 0,
          }}
        >
          ¿Querés sumarte a InmoLibres?
        </h2>
        <p style={{ fontSize: 14, color: "var(--crema-300, #D9C9B0)", margin: "8px 0 22px" }}>
          Escribinos y te contamos cómo, sin vueltas.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 text-left">
          {[
            {
              titulo: "Soy inmobiliaria",
              texto: "CRM completo, marketplace, contratos y finanzas. Todo en un solo lugar.",
              cta: "Quiero trabajar con ustedes",
              href: WA_INMOBILIARIA,
            },
            {
              titulo: "Soy particular",
              texto: "Publicá tus propiedades y recibí consultas directas por WhatsApp.",
              cta: "Quiero publicar mis propiedades",
              href: WA_PARTICULAR,
            },
          ].map((op) => (
            <div
              key={op.titulo}
              className="p-5 rounded-xl flex flex-col"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-fraunces-display), Georgia, serif",
                  fontSize: 16.5,
                  fontWeight: 600,
                  color: "var(--crema-50, #FBF8F2)",
                  margin: 0,
                }}
              >
                {op.titulo}
              </h3>
              <p style={{ fontSize: 13, color: "var(--crema-300, #D9C9B0)", margin: "6px 0 16px", flex: 1 }}>
                {op.texto}
              </p>
              <a
                href={op.href}
                target="_blank"
                rel="noreferrer"
                className="justify-center"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--whatsapp, #25D366)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13.5,
                  padding: "11px 18px",
                  borderRadius: 999,
                  textDecoration: "none",
                }}
              >
                {op.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </PaginaEstatica>
  );
}
