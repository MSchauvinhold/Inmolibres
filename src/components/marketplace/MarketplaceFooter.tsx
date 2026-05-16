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
      className="py-14 px-4"
      style={{ background: "var(--antracite)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #C1694F 0%, #8B4513 100%)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V12Z"
                    fill="white"
                  />
                </svg>
              </div>
              <span
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                InmoLibres
              </span>
            </div>
            <p
              className="text-sm"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-jakarta)",
              }}
            >
              Paso de los Libres, Corrientes, Argentina
            </p>
            <p
              className="mt-1.5 text-base italic"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-fraunces)",
              }}
            >
              Tu próxima propiedad está acá.
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-3">
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
          className="mt-12 pt-6 text-center text-xs"
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
