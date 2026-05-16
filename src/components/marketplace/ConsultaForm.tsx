"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { consultaPublicaSchema, type ConsultaPublicaInput } from "@/lib/validations/rental";

interface Props {
  propiedadId: string;
  propiedadTitulo: string;
}

export function ConsultaForm({ propiedadId, propiedadTitulo }: Props) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConsultaPublicaInput>({
    resolver: zodResolver(consultaPublicaSchema),
    defaultValues: {
      propiedadId,
      mensaje: `Hola, me interesa "${propiedadTitulo}". ¿Podrían darme más información?`,
    },
  });

  async function onSubmit(data: ConsultaPublicaInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al enviar. Intentá de nuevo.");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Error al enviar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6 space-y-3">
        <div
          className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "var(--terra-pale)" }}
        >
          <CheckCircle2 className="w-7 h-7" style={{ color: "var(--terra-mid)" }} />
        </div>
        <div>
          <p
            className="font-semibold text-sm"
            style={{ fontFamily: "var(--font-fraunces)", color: "var(--antracite)" }}
          >
            ¡Consulta enviada!
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--antracite-light)", fontFamily: "var(--font-jakarta)" }}
          >
            Te contactaremos a la brevedad.
          </p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all placeholder:text-gray-400";
  const inputStyle = {
    background: "var(--cream-bg, #F7F5F2)",
    border: "1px solid var(--cream-border, #E5E0D8)",
    color: "var(--antracite)",
    fontFamily: "var(--font-jakarta)",
  } as React.CSSProperties;
  const labelCls = "block text-xs font-medium mb-1.5";
  const labelStyle = { color: "var(--antracite-mid)", fontFamily: "var(--font-jakarta)" } as React.CSSProperties;
  const errorCls = "text-xs mt-1";
  const errorStyle = { color: "var(--terra-mid)" } as React.CSSProperties;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <input {...register("propiedadId")} type="hidden" />

      <div>
        <label className={labelCls} style={labelStyle}>Tu nombre *</label>
        <input {...register("nombreVisitante")} className={inputCls} style={inputStyle} placeholder="Juan Pérez" />
        {errors.nombreVisitante && <p className={errorCls} style={errorStyle}>{errors.nombreVisitante.message}</p>}
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Teléfono *</label>
        <input {...register("telefono")} className={inputCls} style={inputStyle} placeholder="+54 3772 000000" />
        {errors.telefono && <p className={errorCls} style={errorStyle}>{errors.telefono.message}</p>}
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Email <span style={{ color: "var(--antracite-light)" }}>(opcional)</span></label>
        <input {...register("email")} type="email" className={inputCls} style={inputStyle} placeholder="juan@ejemplo.com" />
        {errors.email && <p className={errorCls} style={errorStyle}>{errors.email.message}</p>}
      </div>

      <div>
        <label className={labelCls} style={labelStyle}>Mensaje</label>
        <textarea {...register("mensaje")} rows={3} className={inputCls} style={{ ...inputStyle, resize: "none" }} />
        {errors.mensaje && <p className={errorCls} style={errorStyle}>{errors.mensaje.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--terra-mid, #C1694F)", color: "white", fontFamily: "var(--font-jakarta)" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? "Enviando..." : "Enviar consulta"}
      </button>
    </form>
  );
}
