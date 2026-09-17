"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildWhatsAppLink, formatRelativeTime } from "@/lib/utils";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { KanbanBoard, KanbanCardBadge, type KanbanColumna } from "@/components/ui/kanban-board";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROL_CFG } from "@/components/contactos/ContactosClient";
import type { EstadoPipeline, OrigenLead, RolContacto, TipoOperacion } from "@prisma/client";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  estadoPipeline: EstadoPipeline;
  ultimaActividad: string;
  origen: OrigenLead;
  notas?: string | null;
  agente?: { nombre: string } | null;
  /** Operaciones de las propiedades que le interesan (para sugerir el rol del contacto) */
  operacionesInteres?: TipoOperacion[];
}

function rolesSugeridos(c: Cliente): RolContacto[] {
  const ops = c.operacionesInteres ?? [];
  const roles: RolContacto[] = [];
  if (ops.includes("VENTA")) roles.push("COMPRADOR");
  if (ops.some((o) => o !== "VENTA")) roles.push("INQUILINO");
  return roles;
}

const COLUMNAS: KanbanColumna<EstadoPipeline>[] = [
  { key: "NUEVO",           label: "Nuevo",           tone: "info" },
  { key: "CONTACTADO",      label: "Contactado",      tone: "neutral" },
  { key: "VISITA_AGENDADA", label: "Visita agendada", tone: "warning" },
  { key: "SEGUNDA_VISITA",  label: "Propuesta",       tone: "accent" },
  { key: "CERRADO",         label: "Cerrado",         tone: "success" },
  { key: "PERDIDO",         label: "Perdido",         tone: "danger" },
];

const ORIGEN_LABELS: Record<OrigenLead, string> = {
  INSTAGRAM:     "Instagram",
  WHATSAPP:      "WhatsApp",
  CONSULTA_LOCAL:"Consulta",
  REFERIDO:      "Referido",
  PORTAL:        "Portal",
  OTRO:          "Otro",
};

const FRIO_ESTADOS: EstadoPipeline[] = ["NUEVO", "CONTACTADO"];
const FRIO_HS = 48;

function esLeadFrio(cliente: Cliente): boolean {
  if (!FRIO_ESTADOS.includes(cliente.estadoPipeline)) return false;
  const diffMs = Date.now() - new Date(cliente.ultimaActividad).getTime();
  return diffMs > FRIO_HS * 3_600_000;
}

interface Props {
  clientes: Cliente[];
  onUpdate?: () => void;
  /** Contactos es módulo Pro de inmobiliaria: sin esto no se muestra "→ Contacto" */
  puedeConvertirEnContacto?: boolean;
}

export function PipelineKanban({ clientes, onUpdate, puedeConvertirEnContacto = false }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(clientes);
  const [moving, setMoving] = useState<string | null>(null);
  const [convirtiendo, setConvirtiendo] = useState<{ cliente: Cliente; roles: RolContacto[] } | null>(null);
  const [savingContacto, setSavingContacto] = useState(false);

  // Mismo patrón que Consulta → Prospecto (ConsultasClient): se reusa el POST existente
  // del módulo destino y se navega al registro creado. Si ya hay un contacto con ese
  // teléfono, la API responde 409 con su id y se abre ese en vez de duplicar.
  async function convertirEnContacto() {
    if (!convirtiendo) return;
    const { cliente, roles } = convirtiendo;
    if (roles.length === 0) {
      toast.error("Elegí al menos un rol");
      return;
    }
    setSavingContacto(true);
    try {
      const res = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email ?? undefined,
          notas: `Convertido desde prospecto (origen: ${ORIGEN_LABELS[cliente.origen] ?? cliente.origen}).${cliente.notas ? ` Notas: ${cliente.notas}` : ""}`,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { id: string }; error?: string; existenteId?: string };
      if (res.status === 409 && json.existenteId) {
        toast.info(json.error ?? "Ya existe un contacto con ese teléfono");
        setConvirtiendo(null);
        router.push(`/contactos/${json.existenteId}`);
        return;
      }
      if (!res.ok || !json.data) throw new Error(json.error ?? "Error al crear el contacto");
      toast.success(`${cliente.nombre} agregado a Contactos`);
      setConvirtiendo(null);
      router.push(`/contactos/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el contacto");
    } finally {
      setSavingContacto(false);
    }
  }

  // Sincronizar cuando el Server Component re-renderiza con nuevos datos
  // (ej: al agregar un prospecto y volver a esta página)
  useEffect(() => {
    setItems(clientes);
  }, [clientes]);

  async function moverCliente(id: string, nuevoEstado: EstadoPipeline) {
    setMoving(id);
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estadoPipeline: nuevoEstado }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al mover el prospecto");
      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, estadoPipeline: nuevoEstado, ultimaActividad: new Date().toISOString() }
            : c
        )
      );
      onUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar estado");
    } finally {
      setMoving(null);
    }
  }

  const frios = items.filter(esLeadFrio);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Alerta leads fríos ── */}
      {frios.length > 0 && (
        <div
          className="il-card"
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderLeft: "3px solid var(--warning-500, #F59E0B)",
          }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: "var(--warning-500, #F59E0B)",
              flexShrink: 0,
            }}
          />
          <p style={{ fontSize: 12.5, color: "var(--antracita-800, #2C2820)", fontWeight: 500, margin: 0 }}>
            <strong>{frios.length}</strong>{" "}
            contacto{frios.length > 1 ? "s" : ""} sin actividad por más de 48 h:{" "}
            <span style={{ color: "var(--antracita-500)" }}>
              {frios.map((c) => c.nombre).join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* ── Kanban ── */}
      <KanbanBoard
        columnas={COLUMNAS}
        items={items}
        getId={(c) => c.id}
        getColumna={(c) => c.estadoPipeline}
        vacio="Sin prospectos"
        onMover={(c, destino) => moverCliente(c.id, destino)}
        moviendoId={moving}
        renderCard={(cliente) => {
          const frio = esLeadFrio(cliente);
          const avatarBg =
            cliente.estadoPipeline === "NUEVO"
              ? "var(--terracota-500, #C1694F)"
              : "var(--antracita-300, #A09890)";

          return (
            <>
              {/* Cold badge */}
              {frio && (
                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>
                  🥶
                </span>
              )}

              {/* Avatar + name */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <AvatarInitials name={cliente.nombre} size={26} bg={avatarBg} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5, fontWeight: 600,
                      color: "var(--antracita-900)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {cliente.nombre}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--antracita-300)" }}
                  >
                    {cliente.telefono}
                  </div>
                </div>
                {moving === cliente.id && (
                  <div
                    style={{
                      width: 12, height: 12,
                      border: "2px solid var(--terracota-400)",
                      borderTopColor: "transparent",
                      borderRadius: 999,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {/* Notas */}
              {cliente.notas && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--accent-deep, #1B3149)",
                    padding: "4px 8px",
                    background: "var(--accent-soft, #DEE5ED)",
                    borderRadius: 6,
                    marginBottom: 8,
                    fontStyle: "italic",
                    lineHeight: 1.4,
                  }}
                >
                  {cliente.notas}
                </div>
              )}

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border)",
                  marginTop: 4,
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: "var(--antracita-400)" }}>
                  {cliente.agente?.nombre ?? "Sin asignar"}
                </span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ fontSize: 9.5, color: "var(--antracita-400)" }}>
                    {formatRelativeTime(cliente.ultimaActividad)}
                  </span>
                  <a
                    href={buildWhatsAppLink(cliente.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      padding: "2px 6px",
                      borderRadius: 5,
                      background: "rgba(37,211,102,0.14)",
                      color: "#25D366",
                      fontSize: 9.5,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    WA
                  </a>
                  {puedeConvertirEnContacto && (
                    <button
                      type="button"
                      onClick={() => setConvirtiendo({ cliente, roles: rolesSugeridos(cliente) })}
                      title="Convertir en contacto"
                      style={{
                        display: "inline-flex",
                        padding: "2px 6px",
                        borderRadius: 5,
                        border: "none",
                        background: "var(--terracota-50)",
                        color: "var(--terracota-600)",
                        fontSize: 9.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      → Contacto
                    </button>
                  )}
                </div>
              </div>

              {/* Source badge */}
              <KanbanCardBadge>{ORIGEN_LABELS[cliente.origen] ?? cliente.origen}</KanbanCardBadge>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={convirtiendo !== null}
        onOpenChange={(o) => { if (!o) setConvirtiendo(null); }}
        title="Convertir en contacto"
        confirmLabel="Crear contacto"
        loading={savingContacto}
        onConfirm={convertirEnContacto}
        description={convirtiendo && (
          <>
            <p>
              Se crea <strong>{convirtiendo.cliente.nombre}</strong> en Contactos con su teléfono
              {convirtiendo.cliente.email ? " y email" : ""}. El prospecto no se modifica.
            </p>
            <p style={{ marginBottom: 4 }}>Rol en la operación:</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["COMPRADOR", "INQUILINO", "PROPIETARIO"] as RolContacto[]).map((r) => {
                const activo = convirtiendo.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setConvirtiendo((prev) => prev && {
                      ...prev,
                      roles: activo ? prev.roles.filter((x) => x !== r) : [...prev.roles, r],
                    })}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                    style={{
                      background: activo ? ROL_CFG[r].bg : "#FAFAF8",
                      color: activo ? ROL_CFG[r].text : "#6a6a6a",
                      borderColor: activo ? ROL_CFG[r].text : "#D4D0CB",
                    }}
                  >
                    {ROL_CFG[r].label}
                  </button>
                );
              })}
            </div>
            {rolesSugeridos(convirtiendo.cliente).length > 0 && (
              <p style={{ fontSize: 11.5 }}>Sugerido según las propiedades que le interesan.</p>
            )}
          </>
        )}
      />
    </div>
  );
}
