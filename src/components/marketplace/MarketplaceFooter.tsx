import Link from "next/link";

const NAV_LINKS = [
  { href: "/?operacion=VENTA", label: "Comprar" },
  { href: "/?operacion=ALQUILER", label: "Alquilar" },
  { href: "/?operacion=ALQUILER_TEMPORARIO", label: "Temporario" },
  { href: "/login", label: "Acceder" },
];

export function MarketplaceFooter() {
  return (
    <footer
      className="py-8 px-4"
      style={{ background: "var(--antracite)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <span
              className="text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              Inmo<span style={{ color: "#C1694F" }}>Libres</span>
            </span>
            <p
              className="mt-1 text-sm"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Paso de los Libres, Corrientes, Argentina
            </p>
            <p
              className="mt-1 text-sm italic"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-fraunces)",
              }}
            >
              Tu próxima propiedad está acá.
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-all duration-200 hover:opacity-100"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "var(--font-jakarta)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-6 pt-4 text-center text-xs"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.22)",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          © {new Date().getFullYear()} InmoLibres · Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
}
