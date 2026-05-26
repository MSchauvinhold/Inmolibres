import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Building2, MapPin, Eye, EyeOff } from "lucide-react";
import { LIMITES_PLAN } from "@/lib/planes";

export const metadata = { title: "Mis propiedades — InmoLibres" };

export default async function ParticularPropiedadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const userId = session.user.id;
  const MAX = LIMITES_PLAN.BASICO.maxPropiedades;

  const propiedades = await db.propiedad.findMany({
    where: { agenteId: userId },
    include: {
      fotos: { where: { esPortada: true }, take: 1 },
      atributos: { select: { superficieCubierta: true, habitaciones: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
      {propiedades.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: "var(--terracota-200, #EDCBB8)", background: "var(--terracota-50, #FBF1EC)" }}
        >
          <Building2 className="w-10 h-10" style={{ color: "var(--terracota-300, #E0A088)" }} />
          <p className="font-medium text-sm" style={{ color: "var(--antracita-700)" }}>
            Todavía no tenés propiedades
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--antracita-400)" }}>
            Contactate con InmoLibres para publicar tu primera propiedad en el marketplace.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {propiedades.map((p) => {
            const foto = p.fotos[0]?.urlCloudinary;
            return (
              <div
                key={p.id}
                className="il-card flex overflow-hidden"
                style={{ padding: 0 }}
              >
                {/* Foto */}
                <div
                  className="w-28 shrink-0 bg-cover bg-center"
                  style={{
                    backgroundImage: foto ? `url(${foto})` : undefined,
                    background: foto ? undefined : "var(--crema-200, #ECE4D6)",
                    minHeight: 96,
                  }}
                >
                  {!foto && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-7 h-7" style={{ color: "var(--antracita-300)" }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--antracita-900)" }}>
                        {p.titulo}
                      </p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold flex items-center gap-1"
                        style={{
                          background: p.publicada ? "rgba(27,67,50,0.08)" : "var(--crema-200)",
                          color: p.publicada ? "var(--brand-primary, #1B4332)" : "var(--antracita-400)",
                        }}
                      >
                        {p.publicada ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                        {p.publicada ? "Publicada" : "Oculta"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3 shrink-0" style={{ color: "var(--antracita-300)" }} />
                      <p className="text-xs truncate" style={{ color: "var(--antracita-400)" }}>{p.direccion}</p>
                    </div>
                    {p.atributos?.habitaciones && (
                      <p className="text-xs mt-1" style={{ color: "var(--antracita-400)" }}>
                        {p.atributos.habitaciones} amb.
                        {p.atributos.superficieCubierta ? ` · ${p.atributos.superficieCubierta} m²` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-semibold mono" style={{ color: "var(--terracota-600)" }}>
                      {p.moneda === "USD" ? "US$ " : "$ "}
                      {Number(p.precio).toLocaleString("es-AR")}
                    </span>
                    <Link
                      href={`/propiedades/${p.id}/${p.slug}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: "var(--terracota-500)" }}
                    >
                      Ver en marketplace →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
