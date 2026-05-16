"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { clienteSchema, type ClienteInput } from "@/lib/validations/client";

interface Props {
  clienteId?: string;
  defaultValues?: Partial<ClienteInput>;
}

export function ClienteForm({ clienteId, defaultValues }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!clienteId;

  const { register, handleSubmit, formState: { errors } } = useForm<ClienteInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clienteSchema) as any,
    defaultValues: { origen: "OTRO", estadoPipeline: "NUEVO", ...defaultValues },
  });

  async function onSubmit(data: ClienteInput) {
    setLoading(true);
    try {
      const url = isEdit ? `/api/clientes/${clienteId}` : "/api/clientes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Error al guardar");
        return;
      }
      toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
      router.push("/clientes");
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Nombre completo *</label>
          <input {...register("nombre")} className={inputCls} placeholder="Juan Pérez" />
          {errors.nombre && <p className={errorCls}>{errors.nombre.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Teléfono *</label>
          <input {...register("telefono")} className={inputCls} placeholder="+54 3772 000000" />
          {errors.telefono && <p className={errorCls}>{errors.telefono.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input {...register("email")} type="email" className={inputCls} placeholder="juan@email.com" />
        {errors.email && <p className={errorCls}>{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Origen del lead</label>
          <select {...register("origen")} className={inputCls}>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="CONSULTA_LOCAL">Consulta Local</option>
            <option value="REFERIDO">Referido</option>
            <option value="PORTAL">Portal</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Estado pipeline</label>
          <select {...register("estadoPipeline")} className={inputCls}>
            <option value="NUEVO">Nuevo</option>
            <option value="CONTACTADO">Contactado</option>
            <option value="VISITA_AGENDADA">Visita Agendada</option>
            <option value="SEGUNDA_VISITA">2da Visita</option>
            <option value="CERRADO">Cerrado</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Notas internas</label>
        <textarea {...register("notas")} rows={3} className={inputCls} placeholder="Observaciones, preferencias..." />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-outline">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
