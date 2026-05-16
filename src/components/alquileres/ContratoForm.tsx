"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { contratoSchema, type ContratoInput } from "@/lib/validations/rental";

interface SelectOption { id: string; label: string }

interface Props {
  propiedades: SelectOption[];
}

export function ContratoForm({ propiedades }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ContratoInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contratoSchema) as any,
    defaultValues: { moneda: "ARS", diaVencimientoPago: 10 },
  });

  async function onSubmit(data: ContratoInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/alquileres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al crear contrato");
        return;
      }
      toast.success("Contrato creado");
      router.push("/alquileres");
      router.refresh();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "input-base w-full";
  const labelCls = "block text-sm font-medium text-text-primary mb-1.5";
  const errorCls = "text-xs text-danger mt-1";

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5 w-full">
      <div>
        <label className={labelCls}>Propiedad *</label>
        <select {...register("propiedadId")} className={inputCls}>
          <option value="">Seleccioná una propiedad...</option>
          {propiedades.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {errors.propiedadId && <p className={errorCls}>{errors.propiedadId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nombre del inquilino *</label>
          <input {...register("inquilinoNombre")} className={inputCls} placeholder="Juan Pérez" />
          {errors.inquilinoNombre && <p className={errorCls}>{errors.inquilinoNombre.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Teléfono *</label>
          <input {...register("inquilinoTel")} className={inputCls} placeholder="+54 3772..." />
          {errors.inquilinoTel && <p className={errorCls}>{errors.inquilinoTel.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Precio mensual *</label>
          <input {...register("precioMensual", { valueAsNumber: true })} type="number" className={inputCls} />
          {errors.precioMensual && <p className={errorCls}>{errors.precioMensual.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Moneda</label>
          <select {...register("moneda")} className={inputCls}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Día de vencimiento del pago (1-28) *</label>
        <input {...register("diaVencimientoPago", { valueAsNumber: true })} type="number" min={1} max={28} className={inputCls} />
        {errors.diaVencimientoPago && <p className={errorCls}>{errors.diaVencimientoPago.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Inicio del contrato *</label>
          <input {...register("fechaInicio")} type="date" className={inputCls} />
          {errors.fechaInicio && <p className={errorCls}>{errors.fechaInicio.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Fin del contrato *</label>
          <input {...register("fechaFin")} type="date" className={inputCls} />
          {errors.fechaFin && <p className={errorCls}>{errors.fechaFin.message}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-outline">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear contrato
        </button>
      </div>
    </form>
  );
}
