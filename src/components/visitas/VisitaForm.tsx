"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { visitaSchema, type VisitaInput } from "@/lib/validations/visit";

interface SelectOption { id: string; label: string }

interface Props {
  propiedades: SelectOption[];
  clientes: SelectOption[];
  agentes: SelectOption[];
}

export function VisitaForm({ propiedades, clientes, agentes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<VisitaInput>({
    resolver: zodResolver(visitaSchema),
    defaultValues: { tipo: "VISITA_COMPRADOR" },
  });

  /** Formatea la fecha actual como "YYYY-MM-DDTHH:MM" en hora LOCAL del cliente.
   *  Necesario para el atributo `min` de <input type="datetime-local">,
   *  que compara contra la hora local (no UTC). */
  function localNow(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function onSubmit(data: VisitaInput) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        // new Date(data.fechaHora) en el browser interpreta el string sin zona
        // como hora LOCAL → .toISOString() lo convierte correctamente a UTC
        fechaHora: new Date(data.fechaHora).toISOString(),
      };
      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al agendar");
        return;
      }
      toast.success("Visita agendada");
      router.push("/visitas");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 w-full">
      <div>
        <label className={labelCls}>Propiedad *</label>
        <select {...register("propiedadId")} className={inputCls}>
          <option value="">Seleccioná una propiedad...</option>
          {propiedades.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {errors.propiedadId && <p className={errorCls}>{errors.propiedadId.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Cliente *</label>
        <select {...register("clienteId")} className={inputCls}>
          <option value="">Seleccioná un cliente...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {errors.clienteId && <p className={errorCls}>{errors.clienteId.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Agente asignado *</label>
        <select {...register("agenteId")} className={inputCls}>
          <option value="">Seleccioná un agente...</option>
          {agentes.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        {errors.agenteId && <p className={errorCls}>{errors.agenteId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Fecha y hora *</label>
          <input
            {...register("fechaHora")}
            type="datetime-local"
            className={inputCls}
            min={localNow()}
          />
          {errors.fechaHora && <p className={errorCls}>{errors.fechaHora.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Tipo de visita</label>
          <select {...register("tipo")} className={inputCls}>
            <option value="VISITA_COMPRADOR">Visita comprador</option>
            <option value="VISITA_VENDEDOR">Visita vendedor</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-outline">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Agendar visita
        </button>
      </div>
    </form>
  );
}
