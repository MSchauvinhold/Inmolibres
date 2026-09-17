import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { toPlanKey } from "@/lib/planes";
import { PropiedadForm, type PropiedadParaEditar } from "@/components/propiedades/PropiedadForm";
import { GastosPropiedad } from "@/components/propiedades/GastosPropiedad";
import { TasacionForm } from "@/components/tasaciones/TasacionForm";
import { TasacionListClient } from "@/components/tasaciones/TasacionListClient";

export const metadata = { title: "Editar Propiedad" };

export default async function EditarPropiedadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isParticular = session.user.rol === "PARTICULAR";
  if (!isParticular && !session.user.inmobiliariaId) redirect("/login");

  const { id } = await params;

  const propiedad = await db.propiedad.findUnique({
    where: { id },
    include: { atributos: true, fotos: { orderBy: { orden: "asc" } } },
  });

  const esPropia = isParticular
    ? propiedad?.agenteId === session.user.id
    : propiedad?.inmobiliariaId === session.user.inmobiliariaId;

  if (!propiedad || !esPropia) notFound();

  // Serializar: Prisma Decimal → number (no es transferible Server→Client)
  const serialized: PropiedadParaEditar = {
    id: propiedad.id,
    titulo: propiedad.titulo,
    tipo: propiedad.tipo,
    operacion: propiedad.operacion,
    precio: Number(propiedad.precio),
    moneda: propiedad.moneda,
    direccion: propiedad.direccion,
    latitud: propiedad.latitud,
    longitud: propiedad.longitud,
    poligonoJson: (propiedad.poligonoJson as [number, number][] | null) ?? null,
    descripcion: propiedad.descripcion,
    videoUrl: propiedad.videoUrl,
    publicada: propiedad.publicada,
    estado: propiedad.estado,
    agenteId: propiedad.agenteId,
    atributos: propiedad.atributos
      ? {
          superficieCubierta: propiedad.atributos.superficieCubierta,
          superficieTotal: propiedad.atributos.superficieTotal,
          habitaciones: propiedad.atributos.habitaciones,
          banos: propiedad.atributos.banos,
          garage: propiedad.atributos.garage,
          pileta: propiedad.atributos.pileta,
          quincho: propiedad.atributos.quincho,
          balcon: propiedad.atributos.balcon,
          amueblado: propiedad.atributos.amueblado,
          cantidadPisos: propiedad.atributos.cantidadPisos,
          numeroPiso: propiedad.atributos.numeroPiso,
          mostrarPrecioPorM2: propiedad.atributos.mostrarPrecioPorM2,
          precioPorDia: propiedad.atributos.precioPorDia != null ? Number(propiedad.atributos.precioPorDia) : null,
          precioSemana: propiedad.atributos.precioSemana != null ? Number(propiedad.atributos.precioSemana) : null,
          precioQuincena: propiedad.atributos.precioQuincena != null ? Number(propiedad.atributos.precioQuincena) : null,
          diasMinimos: propiedad.atributos.diasMinimos,
          diasMaximos: propiedad.atributos.diasMaximos,
          anchoMetros: propiedad.atributos.anchoMetros,
          largoMetros: propiedad.atributos.largoMetros,
          alturaInterna: propiedad.atributos.alturaInterna,
          serviciosAgua: propiedad.atributos.serviciosAgua,
          serviciosLuz: propiedad.atributos.serviciosLuz,
          serviciosGas: propiedad.atributos.serviciosGas,
          serviciosCloaca: propiedad.atributos.serviciosCloaca,
          caracteristicasCustom: propiedad.atributos.caracteristicasCustom,
        }
      : null,
    fotos: propiedad.fotos.map((f) => ({
      urlCloudinary: f.urlCloudinary,
      orden: f.orden,
      esPortada: f.esPortada,
    })),
  };

  // Solo el ADMIN puede reasignar el asesor
  const agentes = session.user.rol === "ADMIN" && session.user.inmobiliariaId
    ? await db.usuario.findMany({
        where: {
          inmobiliariaId: session.user.inmobiliariaId,
          activo: true,
          rol: { in: ["ADMIN", "AGENTE"] },
        },
        select: { id: true, nombre: true, rol: true },
        orderBy: { nombre: "asc" },
      })
    : [];

  // ── Historial de tasaciones y gastos de mantenimiento (no aplica a PARTICULAR) ──
  // Mismos criterios que /tasaciones y /finanzas: permiso del agente, el agente solo
  // ve sus propias tasaciones, y los gastos (egresos) son del plan Pro.
  const inmobiliariaId = session.user.inmobiliariaId;
  const esAgente = session.user.rol === "AGENTE";
  const permisos = esAgente
    ? await db.permisosAgente.findUnique({ where: { usuarioId: session.user.id } })
    : null;
  const verTasaciones = !isParticular && !!inmobiliariaId && permisos?.verTasaciones !== false;
  const verGastos = !isParticular && !!inmobiliariaId
    && toPlanKey(session.user.plan) === "PRO" && permisos?.verFinanzas !== false;

  const [tasaciones, clientes, gastos] = await Promise.all([
    verTasaciones
      ? db.tasacion.findMany({
          where: { inmobiliariaId: inmobiliariaId!, propiedadId: id, ...(esAgente ? { agenteId: session.user.id } : {}) },
          orderBy: { createdAt: "desc" },
          include: { agente: { select: { nombre: true } } },
        })
      : [],
    verTasaciones
      ? db.cliente.findMany({
          where: { inmobiliariaId: inmobiliariaId! },
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : [],
    verGastos
      ? db.egresoInmobiliaria.findMany({
          where: { inmobiliariaId: inmobiliariaId!, propiedadId: id },
          orderBy: { fecha: "desc" },
        })
      : [],
  ]);

  return (
    <div className="w-full max-w-[800px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Editar propiedad</h1>
        <p className="text-sm text-text-muted mt-0.5 truncate">{propiedad.titulo}</p>
      </div>
      <PropiedadForm propiedad={serialized} agentes={agentes} currentUserId={session.user.id} />

      {verTasaciones && (
        <section className="il-card" style={{ padding: 18 }}>
          <h2 className="display" style={{ fontSize: 16, margin: "0 0 14px", color: "var(--antracita-900)" }}>
            Historial de tasaciones
          </h2>
          <TasacionListClient
            tasaciones={tasaciones.map((t) => ({
              id: t.id,
              clienteNombre: t.clienteNombre,
              clienteTelefono: t.clienteTelefono,
              direccion: t.direccion,
              tipo: t.tipo,
              superficie: t.superficie,
              valorEstimado: t.valorEstimado != null ? Number(t.valorEstimado) : null,
              moneda: t.moneda,
              estado: t.estado,
              fechaTasacion: t.fechaTasacion ? t.fechaTasacion.toISOString() : null,
              notas: t.notas,
              agente: t.agente,
              createdAt: t.createdAt.toISOString(),
            }))}
          />
          <details style={{ marginTop: 14 }}>
            <summary className="il-btn il-btn--ghost" style={{ height: 34, fontSize: 12.5, gap: 6, display: "inline-flex", listStyle: "none", cursor: "pointer" }}>
              <Plus size={13} /> Agregar tasación
            </summary>
            <div style={{ marginTop: 14, padding: 16, background: "var(--crema-100, #F0E9DC)", borderRadius: 12 }}>
              <TasacionForm
                clientes={clientes.map((c) => ({ id: c.id, label: c.nombre }))}
                propiedad={{
                  id: propiedad.id,
                  direccion: propiedad.direccion,
                  tipo: propiedad.tipo,
                  superficie: propiedad.atributos?.superficieTotal ?? propiedad.atributos?.superficieCubierta ?? null,
                }}
              />
            </div>
          </details>
        </section>
      )}

      {verGastos && (
        <GastosPropiedad
          propiedadId={propiedad.id}
          isAdmin={session.user.rol === "ADMIN"}
          egresos={gastos.map((e) => ({
            id: e.id,
            concepto: e.concepto,
            monto: Number(e.monto),
            moneda: e.moneda,
            fecha: e.fecha.toISOString(),
            categoria: e.categoria,
          }))}
        />
      )}
    </div>
  );
}
