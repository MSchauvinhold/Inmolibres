import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { ContratoForm } from "@/components/alquileres/ContratoForm";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = { title: "Alquileres" };

export default async function AlquileresPage() {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) redirect("/login");

  const inmobiliariaId = session.user.inmobiliariaId;
  const hoy = new Date();

  const [contratos, propiedadesDisponibles] = await Promise.all([
    db.contratoAlquiler.findMany({
      where: { inmobiliariaId, fechaFin: { gte: hoy } },
      orderBy: { fechaFin: "asc" },
      include: { propiedad: { select: { id: true, titulo: true, direccion: true } } },
    }),
    db.propiedad.findMany({
      where: { inmobiliariaId, estado: { in: ["DISPONIBLE", "RESERVADA"] } },
      select: { id: true, titulo: true },
      orderBy: { titulo: "asc" },
    }),
  ]);

  const PAGO_COLORS = { AL_DIA: "bg-green-100 text-green-800", ATRASADO: "bg-red-100 text-red-800" } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Alquileres</h1>
        <p className="text-sm text-text-muted">{contratos.length} contratos activos</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {contratos.length === 0 ? (
            <div className="card p-8 text-center">
              <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted">Sin contratos activos</p>
            </div>
          ) : (
            contratos.map((c) => {
              const diasRestantes = Math.ceil((c.fechaFin.getTime() - hoy.getTime()) / 86_400_000);
              return (
                <div key={c.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">{c.propiedad.titulo}</p>
                      <p className="text-xs text-text-muted mt-0.5">{c.propiedad.direccion}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${PAGO_COLORS[c.estadoPago]}`}>
                      {c.estadoPago === "AL_DIA" ? "Al día" : "Atrasado"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-text-muted">Inquilino</p>
                      <p className="font-medium text-text-primary truncate">{c.inquilinoNombre}</p>
                      <p className="text-xs text-text-secondary">{c.inquilinoTel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Alquiler mensual</p>
                      <p className="font-price font-semibold text-brand-primary">{formatPrice(Number(c.precioMensual), c.moneda)}</p>
                      <p className="text-xs text-text-secondary">Vence día {c.diaVencimientoPago}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Fin de contrato</p>
                      <p className="font-medium text-text-primary">{formatDate(c.fechaFin)}</p>
                      <p className={`text-xs ${diasRestantes <= 30 ? "text-warning" : "text-text-secondary"}`}>
                        {diasRestantes} días restantes
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Form */}
        <div className="card p-5">
          <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo contrato
          </h2>
          <ContratoForm propiedades={propiedadesDisponibles.map((p) => ({ id: p.id, label: p.titulo }))} />
        </div>
      </div>
    </div>
  );
}
