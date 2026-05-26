import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MessageSquare, Phone } from "lucide-react";
import { buildWhatsAppLink, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Consultas — InmoLibres" };

export default async function ParticularConsultasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const userId = session.user.id;

  // Obtener propiedades del usuario
  const propiedades = await db.propiedad.findMany({
    where: { agenteId: userId },
    select: { id: true },
  });

  const propiedadIds = propiedades.map((p) => p.id);

  // Obtener consultas de sus propiedades
  const consultas = await db.consulta.findMany({
    where: { propiedadId: { in: propiedadIds } },
    include: { propiedad: { select: { titulo: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const noLeidas = consultas.filter((c) => !c.leida).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900)" }}
        >
          Consultas
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--antracita-400)" }}>
          {noLeidas > 0
            ? <><span style={{ color: "var(--terracota-600)", fontWeight: 600 }}>{noLeidas} sin leer</span> de {consultas.length} consultas</>
            : `${consultas.length} consulta${consultas.length !== 1 ? "s" : ""} recibida${consultas.length !== 1 ? "s" : ""}`
          }
        </p>
      </div>

      {/* Lista */}
      {consultas.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: "var(--antracita-200, #C5BDB4)", background: "var(--crema-100)" }}
        >
          <MessageSquare className="w-10 h-10" style={{ color: "var(--antracita-200)" }} />
          <p className="font-medium text-sm" style={{ color: "var(--antracita-700)" }}>
            Sin consultas todavía
          </p>
          <p className="text-xs" style={{ color: "var(--antracita-400)" }}>
            Cuando alguien consulte por tus propiedades, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultas.map((c) => (
            <div
              key={c.id}
              className="il-card"
              style={{
                padding: "16px 20px",
                background: !c.leida ? "var(--terracota-50, #FBF1EC)" : "#fff",
                borderLeft: !c.leida ? "3px solid var(--terracota-400, #D4825E)" : "3px solid transparent",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Nombre + propiedad */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "var(--antracita-900)" }}>
                      {c.nombreVisitante}
                    </span>
                    {!c.leida && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--terracota-500)", color: "#fff" }}
                      >
                        Nueva
                      </span>
                    )}
                  </div>
                  {c.propiedad && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--antracita-400)" }}>
                      {c.propiedad.titulo}
                    </p>
                  )}

                  {/* Mensaje */}
                  <p
                    className="text-sm mt-2 line-clamp-3"
                    style={{ color: "var(--antracita-600, #5A5349)" }}
                  >
                    {c.mensaje}
                  </p>

                  {/* Hora */}
                  <p className="text-[11px] mt-2 mono" style={{ color: "var(--antracita-300)" }}>
                    {formatRelativeTime(c.createdAt.toISOString())}
                  </p>
                </div>

                {/* WhatsApp CTA */}
                {c.telefono && (
                  <a
                    href={buildWhatsAppLink(
                      c.telefono,
                      `Hola ${c.nombreVisitante}, recibí tu consulta por "${c.propiedad?.titulo ?? "mi propiedad"}" en InmoLibres. ¿En qué te puedo ayudar?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                    style={{ background: "#25D366", whiteSpace: "nowrap" }}
                    title={`Responder a ${c.nombreVisitante}`}
                  >
                    <Phone className="w-3 h-3" />
                    Responder
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
