import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Calendar, MessageSquare, FileText } from "lucide-react";
import { ESTADO_PIPELINE_LABELS, PIPELINE_COLORS, ORIGEN_LEAD_LABELS, formatDate, formatFechaCalendario, formatMonto, buildWhatsAppLink, telefonosCoinciden } from "@/lib/utils";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { DocumentosExpediente } from "@/components/clientes/DocumentosExpediente";
import type { ClienteInput } from "@/lib/validations/client";

export const metadata = { title: "Detalle Cliente" };

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const { id } = await params;

  const [cliente, documentos] = await Promise.all([
    db.cliente.findUnique({
      where: { id },
      include: {
        agente: { select: { id: true, nombre: true } },
        visitas: {
          orderBy: { fechaHora: "desc" },
          take: 5,
          include: { propiedad: { select: { titulo: true } } },
        },
        propiedades: {
          include: { propiedad: { select: { id: true, titulo: true, slug: true } } },
        },
      },
    }),
    db.documentoCliente.findMany({
      where: { clienteId: id, inmobiliariaId: session.user.inmobiliariaId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!cliente || cliente.inmobiliariaId !== session.user.inmobiliariaId) notFound();

  // ── Operaciones cerradas del cliente (relación real vía OperacionCerrada.clienteId) ──
  // Nota: OperacionCerrada.propiedadId no tiene relación formal en el schema (se
  // conserva el histórico financiero aunque la propiedad se borre), así que el
  // título se busca aparte.
  const operacionesRaw = await db.operacionCerrada.findMany({
    where: { clienteId: cliente.id },
    orderBy: { fechaCierre: "desc" },
  });
  const propiedadesDeOperaciones = await db.propiedad.findMany({
    where: { id: { in: operacionesRaw.map((o) => o.propiedadId).filter((id): id is string => !!id) } },
    select: { id: true, titulo: true },
  });
  const tituloPorPropiedadId = new Map(propiedadesDeOperaciones.map((p) => [p.id, p.titulo]));
  const operaciones = operacionesRaw.map((o) => ({
    ...o,
    propiedadTitulo: o.propiedadId ? (tituloPorPropiedadId.get(o.propiedadId) ?? "—") : "—",
  }));

  // ── Consultas del marketplace: no hay relación formal con Cliente (las consultas
  // llegan sin login), así que cruzamos por teléfono como mejor esfuerzo. ──
  const consultasInmobiliaria = await db.consulta.findMany({
    where: { inmobiliariaId: session.user.inmobiliariaId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { propiedad: { select: { titulo: true } } },
  });
  const consultasRelacionadas = consultasInmobiliaria.filter((c) =>
    telefonosCoinciden(c.telefono, cliente.telefono)
  );

  const defaultValues: Partial<ClienteInput> = {
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    email: cliente.email ?? "",
    origen: cliente.origen,
    estadoPipeline: cliente.estadoPipeline,
    agenteId: cliente.agenteId ?? "",
    notas: cliente.notas ?? "",
  };

  const serializedDocumentos = documentos.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="w-full max-w-[860px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="p-2 rounded-lg hover:bg-surface-raised text-text-muted">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{cliente.nombre}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PIPELINE_COLORS[cliente.estadoPipeline]}`}>
            {ESTADO_PIPELINE_LABELS[cliente.estadoPipeline]}
          </span>
        </div>
      </div>

      {/* Contact */}
      <div className="card p-4 flex flex-wrap gap-4">
        <a href={buildWhatsAppLink(cliente.telefono)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-brand-primary hover:underline">
          <Phone className="w-4 h-4" /> {cliente.telefono}
        </a>
        {cliente.email && (
          <a href={`mailto:${cliente.email}`} className="flex items-center gap-2 text-sm text-info hover:underline">
            <Mail className="w-4 h-4" /> {cliente.email}
          </a>
        )}
        <span className="flex items-center gap-2 text-sm text-text-muted">
          <Calendar className="w-4 h-4" /> Desde {formatDate(cliente.createdAt)}
        </span>
        <span className="text-sm text-text-muted">Origen: {ORIGEN_LEAD_LABELS[cliente.origen]}</span>
      </div>

      {/* Visitas */}
      {cliente.visitas.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-text-primary mb-3">Historial de visitas</h2>
          <div className="space-y-2">
            {cliente.visitas.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="text-text-primary">{v.propiedad.titulo}</span>
                <span className="text-text-muted">{formatDate(v.fechaHora)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operaciones / contratos */}
      {operaciones.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-muted" />
            Operaciones y contratos
          </h2>
          <div className="space-y-2">
            {operaciones.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <span className="text-text-primary">{o.tipo === "VENTA" ? "Venta" : "Alquiler"} · {o.propiedadTitulo}</span>
                  <span className="block text-xs text-text-muted">{formatFechaCalendario(o.fechaCierre)}</span>
                </div>
                <span className="text-text-primary font-medium shrink-0 ml-3">
                  {formatMonto(Number(o.precioOperacion), o.moneda)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultas relacionadas (por teléfono — el cliente no queda vinculado
          formalmente a la consulta porque ésta llega sin login) */}
      {consultasRelacionadas.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-text-primary mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-text-muted" />
            Consultas relacionadas
          </h2>
          <p className="text-xs text-text-muted mb-3">Cruzadas por número de teléfono.</p>
          <div className="space-y-2">
            {consultasRelacionadas.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="text-text-primary">{c.propiedad?.titulo ?? "Consulta general"}</span>
                <span className="text-text-muted">{formatDate(c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      <div className="card p-5">
        <h2 className="font-semibold text-text-primary mb-4">
          Expediente digital
          <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-surface-raised text-text-muted">
            {serializedDocumentos.length} doc{serializedDocumentos.length !== 1 ? "s" : ""}
          </span>
        </h2>
        <DocumentosExpediente
          clienteId={id}
          initialDocumentos={serializedDocumentos}
        />
      </div>

      {/* Edit form */}
      <div className="card p-5">
        <h2 className="font-semibold text-text-primary mb-4">Editar datos</h2>
        <ClienteForm clienteId={id} defaultValues={defaultValues} />
      </div>
    </div>
  );
}
