"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { EgresosTabla, NuevoEgresoModal, type Egreso } from "@/components/finanzas/Egresos";

interface Props {
  propiedadId: string;
  egresos: Egreso[];
  /** Alta y borrado de egresos: solo ADMIN, igual que en Finanzas */
  isAdmin: boolean;
}

export function GastosPropiedad({ propiedadId, egresos: initial, isAdmin }: Props) {
  const [egresos, setEgresos] = useState(initial);
  const [showNuevo, setShowNuevo] = useState(false);

  return (
    <section className="il-card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 className="display" style={{ fontSize: 16, margin: 0, color: "var(--antracita-900)" }}>Gastos de mantenimiento</h2>
          <p style={{ fontSize: 11.5, color: "var(--antracita-400)", marginTop: 2 }}>
            Se registran como egresos y cuentan en Finanzas.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowNuevo(true)}
            className="il-btn il-btn--primary"
            style={{ height: 34, fontSize: 12.5, gap: 6, flexShrink: 0 }}
          >
            <Plus size={13} color="#fff" /> Agregar gasto
          </button>
        )}
      </div>

      <EgresosTabla
        egresos={egresos}
        isAdmin={isAdmin}
        onDeleted={(id) => setEgresos((p) => p.filter((e) => e.id !== id))}
        vacio="Sin gastos registrados para esta propiedad"
      />

      {showNuevo && (
        <NuevoEgresoModal
          propiedadId={propiedadId}
          onClose={() => setShowNuevo(false)}
          onCreated={(e) => {
            setEgresos((p) => [e, ...p]);
            setShowNuevo(false);
            toast.success("Gasto registrado");
          }}
        />
      )}
    </section>
  );
}
