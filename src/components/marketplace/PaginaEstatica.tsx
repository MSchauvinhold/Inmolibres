/**
 * Layout compartido para páginas estáticas del marketplace
 * (FAQ, términos, privacidad, cookies).
 */

export function PaginaEstatica({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="px-5 sm:px-8 py-12 sm:py-16" style={{ minHeight: "60vh" }}>
      <div className="max-w-3xl mx-auto">
        <h1
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--antracita-900, #14110E)",
            margin: 0,
          }}
        >
          {titulo}
        </h1>
        {subtitulo && (
          <p
            style={{
              fontSize: 15,
              color: "var(--antracita-300, #6F665C)",
              margin: "10px 0 0",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {subtitulo}
          </p>
        )}
        <div
          className="mt-10"
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            fontSize: 14.5,
            lineHeight: 1.75,
            color: "var(--antracita-500, #3A332C)",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

/** Sección con encabezado para las páginas legales */
export function SeccionLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        style={{
          fontFamily: "var(--font-fraunces-display), Georgia, serif",
          fontSize: 19,
          fontWeight: 600,
          color: "var(--antracita-900, #14110E)",
          margin: "0 0 8px",
        }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}
