"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { tasacionSchema, type TasacionInput } from "@/lib/validations/tasacion";
import { TIPO_PROPIEDAD_LABELS } from "@/lib/utils";

interface SelectOption { id: string; label: string }

interface Props {
  clientes: SelectOption[];
  /** Carga desde la ficha de una propiedad: precarga sus datos y deja la tasación vinculada */
  propiedad?: { id: string; direccion: string; tipo: TasacionInput["tipo"]; superficie: number | null };
}

export function TasacionForm({ clientes, propiedad }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaults: Partial<TasacionInput> = {
    tipo: propiedad?.tipo ?? "CASA",
    moneda: "USD",
    estado: "PENDIENTE",
    ...(propiedad && {
      propiedadId: propiedad.id,
      direccion: propiedad.direccion,
      superficie: propiedad.superficie ?? undefined,
    }),
  };

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TasacionInput>({
    resolver: zodResolver(tasacionSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- mismo workaround que ClienteForm: z.default() rompe la inferencia del resolver
    defaultValues: defaults,
  });

  async function onSubmit(data: TasacionInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/tasaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Error al cargar la tasación");
        return;
      }
      toast.success("Tasación cargada");
      reset({ clienteNombre: "", direccion: "", ...defaults });
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      <div>
        <label className={labelCls}>Nombre del propietario *</label>
        <input {...register("clienteNombre")} className={inputCls} placeholder="Juan Pérez" />
        {errors.clienteNombre && <p className={errorCls}>{errors.clienteNombre.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Teléfono</label>
        <input {...register("clienteTelefono")} className={inputCls} placeholder="+54 3772 000000" />
        {errors.clienteTelefono && <p className={errorCls}>{errors.clienteTelefono.message}</p>}
      </div>

      {clientes.length > 0 && (
        <div>
          <label className={labelCls}>Vincular a un prospecto existente</label>
          <select {...register("clienteId")} className={inputCls}>
            <option value="">Sin vincular</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Dirección de la propiedad *</label>
        <input {...register("direccion")} className={inputCls} placeholder="Av. San Martín 123, Paso de los Libres" />
        {errors.direccion && <p className={errorCls}>{errors.direccion.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tipo</label>
          <select {...register("tipo")} className={inputCls}>
            {Object.entries(TIPO_PROPIEDAD_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Superficie (m²)</label>
          <input {...register("superficie")} type="number" step="0.01" className={inputCls} placeholder="120" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Valor estimado</label>
          <input {...register("valorEstimado")} type="number" step="0.01" className={inputCls} placeholder="150000" />
        </div>
        <div>
          <label className={labelCls}>Moneda</label>
          <select {...register("moneda")} className={inputCls}>
            <option value="USD">U$S</option>
            <option value="ARS">$</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Fecha de la tasación</label>
        <input {...register("fechaTasacion")} type="date" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Notas</label>
        <textarea {...register("notas")} className={inputCls} rows={3} placeholder="Estado del inmueble, expectativa del propietario, etc." />
        {errors.notas && <p className={errorCls}>{errors.notas.message}</p>}
      </div>

      <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 w-full justify-center">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Cargar tasación
      </button>
    </form>
  );
}
