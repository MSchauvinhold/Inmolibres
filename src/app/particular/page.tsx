import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Building2, MapPin, DollarSign, LogOut, Home } from "lucide-react";
import { SignOutButton } from "@/components/particular/SignOutButton";

export const metadata = { title: "Mi Portal — InmoLibres" };

export default async function ParticularPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const userId = session.user.id;

  const propiedades = await db.propiedad.findMany({
    where: { agenteId: userId },
    include: {
      fotos: { where: { esPortada: true }, take: 1 },
      atributos: { select: { superficieCubierta: true, superficieTotal: true, habitaciones: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const MAX_PROPIEDADES = 4;
  const puedeAgregar = propiedades.length < MAX_PROPIEDADES;

  return (
    <div className="min-h-screen" style={{ background: "#FAF8F5" }}>
      {/* Header */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ background: "white", borderColor: "#E8E0D5" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#1B4332" }}
          >
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "#1B4332" }}>
            InmoLibres
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "#6B6560" }}>
            {session.user.nombre}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1A1612" }}>
            Tus propiedades
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B6560" }}>
            Podés publicar hasta {MAX_PROPIEDADES} propiedades en el marketplace.{" "}
            <span style={{ color: "#1B4332", fontWeight: 600 }}>
              {propiedades.length}/{MAX_PROPIEDADES} usadas
            </span>
          </p>
        </div>

        {/* Propiedades */}
        {propiedades.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
            style={{ borderColor: "#D4A853", background: "rgba(212,168,83,0.05)" }}
          >
            <Building2 className="w-10 h-10" style={{ color: "#D4A853" }} />
            <p className="font-medium" style={{ color: "#1A1612" }}>
              Todavía no tenés propiedades publicadas
            </p>
            <p className="text-sm" style={{ color: "#6B6560" }}>
              Contactate con InmoLibres para publicar tu primera propiedad
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {propiedades.map((p) => {
              const foto = p.fotos[0]?.urlCloudinary;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border overflow-hidden flex"
                  style={{ background: "white", borderColor: "#E8E0D5" }}
                >
                  {/* Foto */}
                  <div
                    className="w-32 shrink-0 bg-cover bg-center"
                    style={{
                      backgroundImage: foto ? `url(${foto})` : undefined,
                      background: foto ? undefined : "#F0EDE8",
                    }}
                  >
                    {!foto && (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-8 h-8" style={{ color: "#C4B99A" }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold text-sm leading-tight" style={{ color: "#1A1612" }}>
                          {p.titulo}
                        </h2>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: p.publicada ? "rgba(27,67,50,0.1)" : "rgba(180,180,180,0.15)",
                            color: p.publicada ? "#1B4332" : "#888",
                          }}
                        >
                          {p.publicada ? "Publicada" : "Oculta"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" style={{ color: "#6B6560" }} />
                        <p className="text-xs truncate" style={{ color: "#6B6560" }}>
                          {p.direccion}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" style={{ color: "#D4A853" }} />
                        <span className="text-sm font-semibold" style={{ color: "#1A1612" }}>
                          {p.moneda === "USD" ? "US$ " : "$ "}
                          {Number(p.precio).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <Link
                        href={`/propiedades/${p.id}/${p.slug}`}
                        className="text-xs font-medium hover:underline"
                        style={{ color: "#1B4332" }}
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

        {/* CTA agregar */}
        {puedeAgregar ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(27,67,50,0.06)", border: "1px solid rgba(27,67,50,0.15)" }}
          >
            <p className="text-sm font-medium" style={{ color: "#1B4332" }}>
              ¿Querés publicar una propiedad?
            </p>
            <p className="text-xs mt-1" style={{ color: "#6B6560" }}>
              Contactate con InmoLibres y te ayudamos a cargarla.
            </p>
            <a
              href="https://wa.me/543772100001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#1B4332" }}
            >
              Contactar por WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-center text-sm" style={{ color: "#6B6560" }}>
            Alcanzaste el límite de {MAX_PROPIEDADES} propiedades activas.
          </p>
        )}

        <div className="text-center">
          <Link href="/" className="text-sm hover:underline" style={{ color: "#6B6560" }}>
            ← Ir al marketplace
          </Link>
        </div>
      </main>
    </div>
  );
}
