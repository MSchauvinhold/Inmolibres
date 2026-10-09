"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { tasacionSchema, type TasacionInput } from "@/lib/validations/tasacion";
import { TIPO_PROPIEDAD_LABELS, parseNumeroAR } from "@/lib/utils";

interface SelectOption { id: string; label: string }

interface Props {
  clientes: SelectOption[];
  /** Carga desde la ficha de una propiedad: precarga sus datos y deja la tasación vinculada */
  propiedad?: { id: string; direccion: string; tipo: TasacionInput["tipo"]; superficie: number | null };
  /** Modo edición: precarga la tasación y guarda con PATCH en vez de crear otra */
  editar?: { id: string; valores: Partial<TasacionInput> };
  onDone?: () => void;
  /** Formulario ancho (página de Tasaciones): campos en 3 columnas para que quede corto */
  ancho?: boolean;
}

export function TasacionForm({ clientes, propiedad, editar, onDone, ancho = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaults: Partial<TasacionInput> = editar?.valores ?? {
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
      const res = await fetch(editar ? `/api/tasaciones/${editar.id}` : "/api/tasaciones", {
        method: editar ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? (editar ? "Error al guardar los cambios" : "Error al cargar la tasación"));
        return;
      }
      toast.success(editar ? "Cambios guardados" : "Tasación cargada");
      if (!editar) reset({ clienteNombre: "", direccion: "", ...defaults });
      router.refresh();
      onDone?.();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "input-base w-full";
  const labelCls = "block text-sm font-medium text-text-primary mb-1.5";
  const errorCls = "text-xs text-danger mt-1";

  // En modo ancho cada campo ocupa N de 6 columnas desde md; en el form angosto van apilados
  const col = (n: 2 | 3 | 4 | 6) =>
    ancho ? { 2: "md:col-span-2", 3: "md:col-span-3", 4: "md:col-span-4", 6: "md:col-span-6" }[n] : "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={ancho ? "grid grid-cols-1 md:grid-cols-6 gap-4 w-full" : "space-y-4 w-full"}>
      <div className={col(2)}>
        <label className={labelCls}>Nombre del propietario *</label>
        <input {...register("clienteNombre")} className={inputCls} placeholder="Nombre y apellido" />
        {errors.clienteNombre && <p className={errorCls}>{errors.clienteNombre.message}</p>}
      </div>

      <div className={col(2)}>
        <label className={labelCls}>Teléfono</label>
        <input {...register("clienteTelefono")} className={inputCls} placeholder="Número de teléfono" />
        {errors.clienteTelefono && <p className={errorCls}>{errors.clienteTelefono.message}</p>}
      </div>

      {clientes.length > 0 && (
        <div className={col(2)}>
          <label className={labelCls}>Vincular a un prospecto</label>
          <select {...register("clienteId")} className={inputCls}>
            <option value="">Sin vincular</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      )}

      <div className={col(4)}>
        <label className={labelCls}>Dirección de la propiedad *</label>
        <input {...register("direccion")} className={inputCls} placeholder="Calle y número, localidad" />
        {errors.direccion && <p className={errorCls}>{errors.direccion.message}</p>}
      </div>

      <div className={col(2)}>
        <label className={labelCls}>Tipo</label>
        <select {...register("tipo")} className={inputCls}>
          {Object.entries(TIPO_PROPIEDAD_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className={ancho ? "md:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        <div>
          <label className={labelCls}>Superficie (m²)</label>
          <input {...register("superficie", { setValueAs: parseNumeroAR })} type="text" inputMode="decimal" className={inputCls} placeholder="120" />
        </div>
        <div>
          <label className={labelCls}>Valor estimado</label>
          <input {...register("valorEstimado", { setValueAs: parseNumeroAR })} type="text" inputMode="decimal" className={inputCls} placeholder="150000" />
        </div>
        <div>
          <label className={labelCls}>Moneda</label>
          <select {...register("moneda")} className={inputCls}>
            <option value="USD">U$S</option>
            <option value="ARS">$</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Fecha de la tasación</label>
          <input {...register("fechaTasacion")} type="date" className={inputCls} />
        </div>
      </div>

      <div className={col(6)}>
        <label className={labelCls}>Notas</label>
        <textarea {...register("notas")} className={inputCls} rows={ancho ? 2 : 3} placeholder="Estado del inmueble, expectativa del propietario, etc." />
        {errors.notas && <p className={errorCls}>{errors.notas.message}</p>}
      </div>

      <div className={`flex gap-2 ${col(6)}`}>
        {editar && onDone && (
          <button type="button" onClick={onDone} disabled={loading} className="il-btn il-btn--ghost" style={{ height: 40 }}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 flex-1 justify-center">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {editar ? "Guardar cambios" : "Cargar tasación"}
        </button>
      </div>
    </form>
  );
}
