import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { LIMITES_PLAN } from "@/lib/planes";
import { ParticularPropiedadesClient } from "@/components/particular/ParticularPropiedadesClient";

export const metadata = { title: "Mis propiedades — InmoLibres" };

export default async function ParticularPropiedadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const userId = session.user.id;
  const MAX = LIMITES_PLAN.BASICO.maxPropiedades;

  const propiedadesRaw = await db.propiedad.findMany({
    where: { agenteId: userId },
    include: {
      fotos: { where: { esPortada: true }, take: 1 },
      atributos: { select: { superficieCubierta: true, habitaciones: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const propiedades = propiedadesRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    direccion: p.direccion,
    precio: Number(p.precio),
    moneda: p.moneda,
    publicada: p.publicada,
    descripcion: p.descripcion,
    fotoUrl: p.fotos[0]?.urlCloudinary ?? null,
    habitaciones: p.atributos?.habitaciones ?? null,
    superficieCubierta: p.atributos?.superficieCubierta ?? null,
  }));

  const puedeAgregar = propiedades.length < MAX;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900)" }}
          >
            Mis propiedades
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--antracita-400)" }}>
            Publicá hasta {MAX} propiedades en el marketplace.{" "}
            <span
              style={{
                color: propiedades.length >= MAX ? "var(--danger-600, #B91C1C)" : "var(--terracota-600, #A85737)",
                fontWeight: 600,
              }}
            >
              {propiedades.length}/{MAX} usadas
            </span>
          </p>
        </div>

        {/* Badge de plan */}
        <span
          className="text-[11px] font-semibold px-3 py-1 rounded-full"
          style={{ background: "var(--crema-200, #ECE4D6)", color: "var(--antracita-500)" }}
        >
          Plan Básico
        </span>
      </div>

      {/* Lista */}
      <ParticularPropiedadesClient propiedades={propiedades} />

      {/* CTA */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: puedeAgregar ? "var(--crema-100)" : "var(--crema-200)",
          border: "1px solid var(--border)",
        }}
      >
        {puedeAgregar ? (
          <div className="text-center space-y-2">
            <p className="text-sm font-medium" style={{ color: "var(--antracita-900)" }}>
              ¿Querés publicar una propiedad?
            </p>
            <p className="text-xs" style={{ color: "var(--antracita-400)" }}>
              Contactate con InmoLibres y te ayudamos a cargarla.
            </p>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ""}?text=${encodeURIComponent("Hola, quiero publicar una propiedad en InmoLibres.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-1 px-5 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#25D366" }}
            >
              Contactar por WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-center text-sm" style={{ color: "var(--antracita-400)" }}>
            Alcanzaste el límite de {MAX} propiedades activas del plan Básico.
          </p>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs hover:underline" style={{ color: "var(--antracita-300)" }}>
          ← Volver al marketplace
        </Link>
      </div>
    </div>
  );
}
