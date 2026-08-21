"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface PropiedadEditable {
  id: string;
  titulo: string;
  precio: number;
  moneda: string;
  descripcion: string | null;
  publicada: boolean;
  direccion: string;
  slug: string;
}

export function ParticularEditarClient({ propiedad }: { propiedad: PropiedadEditable }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(propiedad.titulo);
  const [precio, setPrecio] = useState(String(propiedad.precio));
  const [moneda, setMoneda] = useState(propiedad.moneda);
  const [descripcion, setDescripcion] = useState(propiedad.descripcion ?? "");
  const [saving, setSaving] = useState(false);

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    color: "var(--antracita-400)", display: "block", marginBottom: 6,
  };

  async function guardar() {
    const tituloTrim = titulo.trim();
    if (!tituloTrim) {
      toast.error("Ingresá un título");
      return;
    }
    const precioNum = Number(precio);
    if (!precioNum || precioNum <= 0) {
      toast.error("Ingresá un precio válido");
      return;
    }
    if (descripcion.length > 2000) {
      toast.error("La descripción no puede superar los 2000 caracteres");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/particular/propiedades/${propiedad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: tituloTrim,
          precio: precioNum,
          moneda,
          descripcion: descripcion || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al guardar");
      toast.success("Cambios guardados");
      router.push("/particular/propiedades");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link
          href="/particular/propiedades"
          className="inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: "var(--antracita-400)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a mis propiedades
        </Link>
        <h1
          className="text-2xl font-bold mt-3"
          style={{ fontFamily: "var(--font-fraunces-display), Georgia, serif", color: "var(--antracita-900)" }}
        >
          Editar propiedad
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--antracita-400)" }}>
          {propiedad.direccion}
        </p>
      </div>

      <div className="il-card p-5 space-y-4">
        <div>
          <label style={labelStyle}>Título</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={200}
            className="input-base w-full text-sm"
          />
        </div>

        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div>
            <label style={labelStyle}>Precio</label>
            <input
              type="number"
              min={0}
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="input-base w-full text-sm"
            />
          </div>
          <div>
            <label style={labelStyle}>Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              className="input-base w-full text-sm"
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={2000}
            rows={6}
            className="input-base w-full text-sm"
          />
          <p className="text-xs mt-1" style={{ color: "var(--antracita-300)" }}>
            {descripcion.length}/2000
          </p>
        </div>

        <p className="text-xs" style={{ color: "var(--antracita-400)" }}>
          Para cambiar dirección, fotos o ubicación en el mapa, contactate con InmoLibres por WhatsApp.
        </p>

        <div className="flex gap-3 justify-end pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/particular/propiedades" className="btn-outline text-sm">
            Cancelar
          </Link>
          <button onClick={guardar} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
