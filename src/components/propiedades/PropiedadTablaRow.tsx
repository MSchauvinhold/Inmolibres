"use client";

import { useRouter } from "next/navigation";

/**
 * Fila de la vista lista de Propiedades.
 *
 * La página es un Server Component: el `<tr>` no puede llevar onClick ni onMouseEnter
 * ahí (Next 16 corta el render con "Event handlers cannot be passed to Client
 * Component props"). Se aísla acá la parte interactiva y las celdas siguen llegando
 * como children desde el servidor.
 */
export function PropiedadTablaRow({
  propiedadId,
  isLast,
  children,
}: {
  propiedadId: string;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        cursor: "pointer",
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--crema-50, #FBF8F2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      onClick={() => router.push(`/propiedades/${propiedadId}/editar`)}
    >
      {children}
    </tr>
  );
}
