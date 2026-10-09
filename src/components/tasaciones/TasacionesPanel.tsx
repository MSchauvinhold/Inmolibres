"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { TasacionForm } from "@/components/tasaciones/TasacionForm";
import { TasacionListClient, type TasacionItem, valoresEdicion } from "@/components/tasaciones/TasacionListClient";

interface Props {
  tasaciones: TasacionItem[];
  clientes: { id: string; label: string }[];
}

// Página de Tasaciones: formulario ancho a la izquierda (queda corto en vez de largo
// hacia abajo) y las tarjetas en una columna angosta a la derecha. "Editar" en una
// tarjeta carga esa tasación en el mismo formulario.
export function TasacionesPanel({ tasaciones, clientes }: Props) {
  const [editando, setEditando] = useState<TasacionItem | null>(null);

  return (
    <div className="rg-2col rg-2col--c" style={{ gap: 18, alignItems: "start" }}>
      <div
        id="nueva"
        className="il-card"
        style={{
          padding: 20,
          background: editando ? "var(--terracota-50, #FBF1EC)" : "var(--crema-100, #F0E9DC)",
          position: "sticky",
          top: 16,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16 }}>
          {editando ? <Pencil size={14} style={{ color: "var(--terracota-500)" }} /> : <Plus size={14} style={{ color: "var(--terracota-500)" }} />}
          <h2 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>
            {editando ? `Editar tasación · ${editando.clienteNombre}` : "Nueva tasación"}
          </h2>
        </div>
        <TasacionForm
          // Remonta el form al cambiar de tasación: react-hook-form toma los valores iniciales una sola vez
          key={editando?.id ?? "nueva"}
          clientes={clientes}
          ancho
          editar={editando ? { id: editando.id, valores: valoresEdicion(editando) } : undefined}
          onDone={editando ? () => setEditando(null) : undefined}
        />
      </div>

      <TasacionListClient
        tasaciones={tasaciones}
        clientes={clientes}
        compacta
        editandoId={editando?.id ?? null}
        onEditar={(t) => {
          setEditando(t);
          document.getElementById("nueva")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    </div>
  );
}
