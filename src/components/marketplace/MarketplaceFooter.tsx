import Link from "next/link";
import { Logo } from "@/components/crm/Logo";
import { WA_INMOBILIARIA, WA_PARTICULAR } from "@/lib/contacto";

const FOOTER_COLS = [
  {
    title: "Buscar",
    links: [
      { href: "/?operacion=VENTA", label: "Comprar" },
      { href: "/?operacion=ALQUILER", label: "Alquilar" },
      { href: "/?operacion=ALQUILER_TEMPORARIO", label: "Temporario" },
      { href: "/mapa", label: "Por mapa" },
    ],
  },
  {
    title: "Sumate",
    links: [
      {
        href: WA_INMOBILIARIA,
        label: "¿Querés trabajar con nosotros?",
      },
      {
        href: WA_PARTICULAR,
        label: "¿Querés publicar tus propiedades?",
      },
      { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
      { href: "/login", label: "Acceder" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terminos", label: "Términos" },
      { href: "/privacidad", label: "Privacidad" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function MarketplaceFooter() {
  return (
    <footer className="px-6 sm:px-10 lg:px-12 pt-12 pb-7" style={{ background: "var(--antracita-900, #14110E)", color: "var(--crema-100, #F5EFE5)" }}>
      <div className="max-w-6xl mx-auto">
        {/* Grid: 1.5fr + 3×1fr */}
        <div
          className="grid grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] gap-8 lg:gap-12 pb-8 border-b border-white/10"
        >
          {/* Brand column */}
          <div>
            <Logo variant="lockup" size={22} onDark />
            <p
              style={{
                fontSize: 13,
                color: "var(--crema-300, #D9C9B0)",
                margin: "14px 0 0",
                fontStyle: "italic",
                fontFamily: "var(--font-fraunces-display), Georgia, serif",
              }}
            >
              Tu próxima propiedad está acá.
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--crema-300, #D9C9B0)",
                margin: "10px 0 0",
                fontFamily: "var(--font-dm-sans), sans-serif",
              }}
            >
              Argentina
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h5
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 10.5,
                  color: "var(--crema-300, #D9C9B0)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  margin: "0 0 12px",
                }}
              >
                {col.title}
              </h5>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 13,
                        color: "var(--crema-100, #F5EFE5)",
                        textDecoration: "none",
                        fontFamily: "var(--font-dm-sans), sans-serif",
                        opacity: 0.8,
                        transition: "opacity 200ms",
                      }}
  
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 20,
            fontSize: 11.5,
            color: "var(--crema-300, #D9C9B0)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          <span>© {new Date().getFullYear()} InmoLibres</span>
          <span>Hecho en Argentina</span>
        </div>
      </div>
    </footer>
  );
}
