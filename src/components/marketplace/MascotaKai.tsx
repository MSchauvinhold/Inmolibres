"use client";

import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Minus, X } from "lucide-react";
import {
  cargarMemoria, guardarMemoria, registrarVisita, getSaludo,
} from "@/lib/kai-memoria";

// ─── Types ────────────────────────────────────────────────────────────────────


type ChatEstado =
  | "cerrado" | "menu" | "busqueda_operacion" | "busqueda_tipo"
  | "busqueda_dormitorios" | "busqueda_resultado"
  | "faq" | "faq_respuesta" | "contacto" | "contacto_enviado";

type Mensaje = {
  id: string; tipo: "kai" | "usuario";
  texto: string; opciones?: Opcion[];
};

type Opcion = { label: string; action: string; destacado?: boolean };

type BusquedaState = { operacion?: string; tipo?: string; dormitorios?: string };

// ─── Constants ────────────────────────────────────────────────────────────────

// All positioning is relative — Kai is always anchored fixed bottom-right
const HOUSE_RIGHT   = 16;   // px from right edge of viewport
const HOUSE_W_DESK  = 90;   // house SVG width desktop
const HOUSE_W_MOB   = 63;   // house SVG width mobile

// Kai sits immediately to the left of the house
const KAI_RIGHT_DESK = HOUSE_RIGHT + HOUSE_W_DESK; // 106
const KAI_RIGHT_MOB  = HOUSE_RIGHT + HOUSE_W_MOB;  //  79

const FAQS: Record<string, { pregunta: string; respuesta: string; opciones: Opcion[] }> = {
  publicar: {
    pregunta: "¿Cómo publico mi propiedad?",
    respuesta: "Para publicar tu propiedad en InmoLibres podés contactarnos directamente. Nos encargamos de cargar todo por vos. ¿Querés que te contactemos?",
    opciones: [
      { label: "📞 Sí, quiero publicar", action: "ir_contacto" },
      { label: "← Volver", action: "volver_faq" },
    ],
  },
  costo: {
    pregunta: "¿Cuánto cuesta publicar?",
    respuesta: "Las inmobiliarias tienen planes mensuales accesibles. Si sos particular con una propiedad propia, tenemos opciones especiales para vos.",
    opciones: [
      { label: "📞 Quiero más información", action: "ir_contacto" },
      { label: "← Volver", action: "volver_faq" },
    ],
  },
  verificadas: {
    pregunta: "¿Las publicaciones son verificadas?",
    respuesta: "Sí 🐾 Todas las propiedades son publicadas por inmobiliarias y particulares verificados de Paso de los Libres.",
    opciones: [{ label: "← Volver", action: "volver_faq" }],
  },
  mapa: {
    pregunta: "¿Puedo ver propiedades en el mapa?",
    respuesta: "¡Sí! Tenemos un mapa interactivo donde podés ver todas las propiedades disponibles con sus precios. ¿Lo vemos?",
    opciones: [
      { label: "🗺️ Ver el mapa", action: "ir_mapa" },
      { label: "← Volver", action: "volver_faq" },
    ],
  },
  alquilar: {
    pregunta: "¿Qué necesito para alquilar?",
    respuesta: "Generalmente necesitás: DNI, recibos de sueldo o garantía, y en algunos casos un garante. Cada inmobiliaria puede tener requisitos distintos.",
    opciones: [
      { label: "🔑 Ver alquileres", action: "ir_alquileres" },
      { label: "← Volver", action: "volver_faq" },
    ],
  },
  comision: {
    pregunta: "¿Cuánto es la comisión?",
    respuesta: "La comisión varía según la inmobiliaria. En general es entre el 3% y 4% para ventas, y un mes de alquiler para locaciones.",
    opciones: [{ label: "← Volver", action: "volver_faq" }],
  },
};

const MENU_OPCIONES: Opcion[] = [
  { label: "🔍 Busco una propiedad", action: "buscar" },
  { label: "❓ Tengo una pregunta", action: "faq" },
  { label: "📞 Quiero contactarlos", action: "contacto" },
];

const FAQ_OPCIONES: Opcion[] = [
  { label: "📋 ¿Cómo publico mi propiedad?", action: "faq_publicar" },
  { label: "💰 ¿Cuánto cuesta publicar?", action: "faq_costo" },
  { label: "✅ ¿Las publicaciones son verificadas?", action: "faq_verificadas" },
  { label: "📍 ¿Puedo ver propiedades en el mapa?", action: "faq_mapa" },
  { label: "📄 ¿Qué necesito para alquilar?", action: "faq_alquilar" },
  { label: "💸 ¿Cuánto es la comisión?", action: "faq_comision" },
  { label: "← Volver", action: "menu" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CasitaSVG({ small = false }: { small?: boolean }) {
  const s = small ? 0.7 : 1;
  return (
    <svg width={90 * s} height={80 * s} viewBox="0 0 90 80" fill="none" style={{ display: "block" }}>
      <polygon points="45,4 86,38 4,38" fill="#C1694F" />
      <rect x="62" y="14" width="9" height="20" rx="1" fill="#8B4513" />
      <rect x="8" y="38" width="74" height="40" rx="2" fill="#FAE5D3" />
      <rect x="34" y="52" width="22" height="26" rx="11" fill="#C1694F" />
      <circle cx="43" cy="67" r="2" fill="#8B4513" />
      <rect x="12" y="46" width="16" height="12" rx="3" fill="rgba(186,215,242,0.85)" />
      <line x1="20" y1="46" x2="20" y2="58" stroke="white" strokeWidth="1" />
      <line x1="12" y1="52" x2="28" y2="52" stroke="white" strokeWidth="1" />
      <rect x="62" y="46" width="16" height="12" rx="3" fill="rgba(186,215,242,0.85)" />
      <line x1="70" y1="46" x2="70" y2="58" stroke="white" strokeWidth="1" />
      <line x1="62" y1="52" x2="78" y2="52" stroke="white" strokeWidth="1" />
      <rect x="0" y="77" width="90" height="3" rx="1.5" fill="#DEB887" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 7, height: 7, borderRadius: "50%", background: "#C1694F" }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MascotaKai() {
  const router = useRouter();

  // Kai state
  const [kaiVisible, setKaiVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Chat state
  const [chatEstado, setChatEstado] = useState<ChatEstado>("cerrado");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [typing, setTyping] = useState(false);
  const [busqueda, setBusqueda] = useState<BusquedaState>({});

  // Welcome bubble
  const [showBubble, setShowBubble] = useState(false);

  // Contact form
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTel, setContactoTel] = useState("");
  const [contactoMsg, setContactoMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const kaiSize    = isMobile ? 60 : 90;
  const kaiRight   = isMobile ? KAI_RIGHT_MOB : KAI_RIGHT_DESK;
  const chatRight  = HOUSE_RIGHT;
  const chatBottom = kaiSize + 14;
  // Horizontal offset so the tail tip sits above Kai's head center
  const tailRight  = kaiRight + Math.round(kaiSize / 2) - chatRight;

  // Responsive mobile detection (re-checks on resize)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, typing]);

  // Register visit and show welcome bubble after short delay
  useEffect(() => {
    registrarVisita();
    const t = setTimeout(() => setShowBubble(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // ── Message helpers ──

  const uid = () => Math.random().toString(36).slice(2);

  const addKaiMsg = useCallback((texto: string, opciones?: Opcion[], delay = 850) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMensajes((prev) => [...prev, { id: uid(), tipo: "kai", texto, opciones }]);
    }, delay);
  }, []);

  const addUserMsg = useCallback((texto: string) => {
    setMensajes((prev) => [...prev, { id: uid(), tipo: "usuario", texto }]);
  }, []);

  // ── Chat open/close ──

  const abrirChat = useCallback(() => {
    if (chatEstado !== "cerrado") return;
    setShowBubble(false);
    setChatEstado("menu");
    const mem = cargarMemoria();
    setMensajes([]);
    addKaiMsg(getSaludo(mem), MENU_OPCIONES, 600);
  }, [chatEstado, addKaiMsg]);

  const cerrarChat = useCallback(() => {
    setChatEstado("cerrado");
    setMensajes([]);
    setBusqueda({});
  }, []);

  const handleEsconder = useCallback(() => {
    cerrarChat();
    setKaiVisible(false);
  }, [cerrarChat]);

  const handleLlamarKai = useCallback(() => {
    setKaiVisible(true);
  }, []);

  // ── Option handler ──

  const handleOpcion = useCallback((action: string, label: string) => {
    addUserMsg(label);

    if (action === "ir_mapa") { window.location.href = "/"; return; }
    if (action === "ir_alquileres") { window.location.href = "/?operacion=ALQUILER"; return; }
    if (action === "ir_contacto") {
      setTimeout(() => {
        setChatEstado("contacto");
        addKaiMsg("¡Con gusto! Dejame tus datos y te contactamos a la brevedad 🐾");
      }, 200);
      return;
    }

    switch (action) {
      case "menu":
        setTimeout(() => {
          setChatEstado("menu");
          addKaiMsg("¿En qué más te puedo ayudar?", MENU_OPCIONES);
        }, 200);
        break;

      case "buscar":
        setChatEstado("busqueda_operacion");
        addKaiMsg("¡Genial! ¿Qué estás buscando?", [
          { label: "🏠 Comprar", action: "op_VENTA" },
          { label: "🔑 Alquilar", action: "op_ALQUILER" },
          { label: "🏖️ Alquiler temporario", action: "op_ALQUILER_TEMPORARIO" },
        ]);
        break;

      case "faq":
        setChatEstado("faq");
        addKaiMsg("¡Claro! ¿Sobre qué querés saber?", FAQ_OPCIONES);
        break;

      case "contacto":
        setChatEstado("contacto");
        addKaiMsg("¡Con gusto! Dejame tus datos y te contactamos a la brevedad 🐾");
        break;

      case "op_VENTA":
      case "op_ALQUILER":
      case "op_ALQUILER_TEMPORARIO": {
        const op = action.replace("op_", "");
        setBusqueda((b) => ({ ...b, operacion: op }));
        setChatEstado("busqueda_tipo");
        addKaiMsg("¿Qué tipo de propiedad?", [
          { label: "🏡 Casa", action: "tipo_CASA" },
          { label: "🏢 Departamento", action: "tipo_DEPARTAMENTO" },
          { label: "🌿 Terreno", action: "tipo_TERRENO" },
          { label: "🏪 Local o Galpón", action: "tipo_LOCAL" },
          { label: "🏙️ Cualquiera", action: "tipo_ANY" },
        ]);
        break;
      }

      case "tipo_CASA":
      case "tipo_DEPARTAMENTO":
      case "tipo_TERRENO":
      case "tipo_LOCAL":
      case "tipo_ANY": {
        const tipo = action === "tipo_ANY" ? undefined : action.replace("tipo_", "");
        setBusqueda((b) => ({ ...b, tipo }));
        if (action === "tipo_CASA" || action === "tipo_DEPARTAMENTO") {
          setChatEstado("busqueda_dormitorios");
          addKaiMsg("¿Cuántos dormitorios necesitás?", [
            { label: "1 dormitorio", action: "dorm_1" },
            { label: "2 dormitorios", action: "dorm_2" },
            { label: "3 dormitorios", action: "dorm_3" },
            { label: "4 o más", action: "dorm_4" },
            { label: "No importa", action: "dorm_any" },
          ]);
        } else {
          setChatEstado("busqueda_resultado");
          addKaiMsg(
            "¡Perfecto! Te muestro las propiedades disponibles 🐾",
            [{ label: "🔍 Ver propiedades", action: "ver_resultado", destacado: true },
             { label: "← Volver al inicio", action: "menu" }],
          );
        }
        break;
      }

      case "dorm_1": case "dorm_2": case "dorm_3": case "dorm_4": case "dorm_any": {
        const dorm = action === "dorm_any" ? undefined : action.replace("dorm_", "");
        setBusqueda((b) => ({ ...b, dormitorios: dorm }));
        setChatEstado("busqueda_resultado");
        addKaiMsg(
          "¡Perfecto! Te muestro las propiedades disponibles 🐾",
          [{ label: "🔍 Ver propiedades", action: "ver_resultado", destacado: true },
           { label: "← Volver al inicio", action: "menu" }],
        );
        break;
      }

      case "ver_resultado": {
        const params = new URLSearchParams();
        if (busqueda.operacion) params.set("operacion", busqueda.operacion);
        if (busqueda.tipo && busqueda.tipo !== "ANY") params.set("tipo", busqueda.tipo);
        if (busqueda.dormitorios) params.set("dormitorios", busqueda.dormitorios);
        params.set("kai", "1");
        const mem = cargarMemoria();
        guardarMemoria({ ...mem, ultimaBusqueda: busqueda });
        router.push(`/?${params.toString()}`);
        cerrarChat();
        break;
      }

      default: {
        if (action.startsWith("faq_")) {
          const key = action.replace("faq_", "");
          const faq = FAQS[key];
          if (faq) {
            setChatEstado("faq_respuesta");
            addKaiMsg(faq.respuesta, faq.opciones);
          }
        } else if (action === "volver_faq") {
          setChatEstado("faq");
          addKaiMsg("¿Sobre qué más querés saber?", FAQ_OPCIONES);
        }
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addKaiMsg, addUserMsg, cerrarChat, router]);

  // ── Contact submit ──

  const handleContactoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactoNombre.trim() || !contactoTel.trim()) return;
    setEnviando(true);
    try {
      await fetch("/api/consultas-kai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: contactoNombre.trim(),
          telefono: contactoTel.trim(),
          mensaje: contactoMsg.trim() || undefined,
        }),
      });
      const mem = cargarMemoria();
      guardarMemoria({ ...mem, nombreUsuario: contactoNombre.trim() });
      setChatEstado("contacto_enviado");
      addKaiMsg(
        `¡Listo ${contactoNombre.split(" ")[0]}! 🐾 Te vamos a contactar pronto por WhatsApp. Mientras tanto podés seguir explorando las propiedades.`,
        [{ label: "🏠 Ver propiedades", action: "ver_todas" },
         { label: "✕ Cerrar", action: "cerrar" }],
      );
    } catch {
      // silent fail
    } finally {
      setEnviando(false);
    }
  }, [contactoNombre, contactoTel, contactoMsg, addKaiMsg]);

  const handleExtra = useCallback((action: string, label: string) => {
    if (action === "ver_todas") { router.push("/"); cerrarChat(); return; }
    if (action === "cerrar") { cerrarChat(); return; }
    handleOpcion(action, label);
  }, [router, cerrarChat, handleOpcion]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .kai-chat-scroll::-webkit-scrollbar { width: 3px; }
        .kai-chat-scroll::-webkit-scrollbar-thumb { background: rgba(193,105,79,0.3); border-radius: 4px; }
        .kai-option:hover { background: var(--terra-pale) !important; border-color: var(--terra-mid) !important; }
        .kai-option-dest { background: #C1694F !important; color: white !important; border-color: #C1694F !important; }
        .kai-option-dest:hover { background: #a8563f !important; }
      `}</style>

      {/* Static house — always fixed bottom-right */}
      <div
        className="fixed bottom-0 z-20"
        style={{
          right: HOUSE_RIGHT,
          opacity: kaiVisible ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      >
        <CasitaSVG small={isMobile} />
      </div>

      {/* Welcome bubble — shows before first click */}
      <AnimatePresence>
        {showBubble && chatEstado === "cerrado" && kaiVisible && (
          <motion.div
            key="welcome-bubble"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            onClick={abrirChat}
            style={{
              position: "fixed",
              bottom: kaiSize + 14,
              right: kaiRight - 10,
              zIndex: 45,
              background: "white",
              borderRadius: "14px 14px 4px 14px",
              padding: "10px 14px 10px 12px",
              boxShadow: "0 4px 24px rgba(139,69,19,0.12), 0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid #EDE8E1",
              maxWidth: isMobile ? 160 : 190,
              cursor: "pointer",
            }}
          >
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
              style={{
                position: "absolute", top: 6, right: 7,
                width: 16, height: 16, borderRadius: "50%",
                background: "rgba(0,0,0,0.07)", border: "none",
                cursor: "pointer", fontSize: 10, lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#888",
              }}
            >
              ✕
            </button>
            <p style={{
              fontSize: isMobile ? 11 : 12,
              color: "#2A2A2A",
              margin: 0,
              lineHeight: 1.5,
              fontWeight: 500,
              paddingRight: 10,
              fontFamily: "var(--font-jakarta, system-ui)",
            }}>
              ¡Hola! Soy <strong style={{ color: "#C1694F" }}>Kai</strong> 🐾<br />
              Estoy aquí para ayudarte a encontrar tu propiedad ideal.
            </p>
            <p style={{
              fontSize: 10, color: "#C1694F", fontWeight: 700,
              margin: "6px 0 0", fontFamily: "var(--font-jakarta, system-ui)",
            }}>
              Tocá para chatear →
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Llamar a Kai" pill — shown when hidden */}
      <AnimatePresence>
        {!kaiVisible && (
          <motion.button
            key="llamar"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleLlamarKai}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: "#C1694F", color: "#FFFFFF",
              fontFamily: "var(--font-jakarta)",
              boxShadow: "0 4px 20px rgba(193,105,79,0.35), 0 0 0 1.5px #D4A853",
              border: "none", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 15 }}>🐾</span>
            <span>Llamar a Kai</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {chatEstado !== "cerrado" && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              position: "fixed",
              bottom: chatBottom,
              right: chatRight,
              width: isMobile ? 260 : 288,
              zIndex: 50,
              fontFamily: "var(--font-jakarta, system-ui)",
              transformOrigin: "bottom right",
            }}
          >
            {/* Speech bubble tail — rotated square, tip points toward Kai */}
            <div style={{
              position: "absolute",
              bottom: -6,
              right: tailRight - 6,
              width: 12,
              height: 12,
              background: "#FFFFFF",
              transform: "rotate(45deg)",
              boxShadow: "2px 2px 4px rgba(139,69,19,0.10)",
              zIndex: 0,
            }} />
            {/* Panel — sits above tail via zIndex */}
            <div style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(139,69,19,0.14), 0 2px 8px rgba(0,0,0,0.08)",
              background: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? 380 : 460,
            }}>
            {/* Header */}
            <div style={{
              background: "#FAF8F5", padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid #DDD5C8",
            }}>
              <Image
                src="/mascota-kai.svg" alt="Kai"
                width={26} height={26}
                style={{ borderRadius: "50%", objectFit: "contain", background: "rgba(193,105,79,0.08)", padding: 2 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1A1612", lineHeight: 1, margin: 0 }}>Kai</p>
                <p style={{ fontSize: 10, color: "#9C9590", margin: 0, lineHeight: 1.4 }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4ade80", marginRight: 4, verticalAlign: "middle" }} />
                  InmoLibres · En línea
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={handleEsconder}
                  title="Esconder Kai"
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "rgba(0,0,0,0.06)", border: "none",
                    color: "#5C5650", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                ><Minus size={13} strokeWidth={2.5} /></button>
                <button
                  onClick={cerrarChat}
                  title="Cerrar"
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "rgba(0,0,0,0.06)", border: "none",
                    color: "#5C5650", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                ><X size={13} strokeWidth={2.5} /></button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="kai-chat-scroll"
              style={{ flex: 1, overflowY: "auto", padding: "12px 10px 6px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <AnimatePresence initial={false}>
                {mensajes.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, x: msg.tipo === "kai" ? -6 : 6 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    {msg.tipo === "kai" ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                        <div style={{ maxWidth: "88%" }}>
                          <div style={{
                            background: "#FAE5D3", borderRadius: "12px 12px 12px 3px",
                            padding: "8px 11px", fontSize: 12.5, color: "#2A2A2A",
                            lineHeight: 1.5, fontWeight: 500,
                          }}>
                            {msg.texto}
                          </div>
                          {msg.opciones && msg.opciones.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.35 }}
                              style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}
                            >
                              {msg.opciones.map((op) => (
                                <button
                                  key={op.action}
                                  className={`kai-option${op.destacado ? " kai-option-dest" : ""}`}
                                  onClick={() => handleExtra(op.action, op.label)}
                                  style={{
                                    textAlign: "left", border: "1px solid #DDD5C8",
                                    borderRadius: 8, padding: "6px 10px",
                                    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                                    background: "white", color: "#2A2A2A",
                                    transition: "all 0.15s", width: "100%",
                                  }}
                                >
                                  {op.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          background: "#C1694F", borderRadius: "12px 12px 3px 12px",
                          padding: "8px 11px", fontSize: 12.5, color: "white",
                          lineHeight: 1.5, fontWeight: 500, maxWidth: "80%",
                        }}>
                          {msg.texto}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}

                {typing && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "flex", gap: 6, alignItems: "flex-end" }}
                  >
                    <div style={{ background: "#FAE5D3", borderRadius: "12px 12px 12px 3px" }}>
                      <TypingIndicator />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline contact form */}
              <AnimatePresence>
                {chatEstado === "contacto" && !typing && (
                  <motion.form
                    key="contacto-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleContactoSubmit}
                    style={{
                      background: "#FFFFFF", borderRadius: 12, padding: "12px 10px",
                      display: "flex", flexDirection: "column", gap: 8,
                      border: "1px solid #DDD5C8",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: "#1A1612", fontFamily: "inherit" }}>
                        Nombre completo *
                      </label>
                      <input
                        value={contactoNombre}
                        onChange={(e) => setContactoNombre(e.target.value)}
                        placeholder="Ej: María González"
                        required
                        style={{
                          border: "1px solid #DDD5C8", borderRadius: 8,
                          padding: "7px 10px", fontSize: 12, outline: "none",
                          fontFamily: "inherit", background: "white",
                          color: "#1A1612",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: "#1A1612", fontFamily: "inherit" }}>
                        Teléfono (WhatsApp) *
                      </label>
                      <input
                        value={contactoTel}
                        onChange={(e) => setContactoTel(e.target.value)}
                        placeholder="Ej: +54 3772 123456"
                        required
                        style={{
                          border: "1px solid #DDD5C8", borderRadius: 8,
                          padding: "7px 10px", fontSize: 12, outline: "none",
                          fontFamily: "inherit", background: "white",
                          color: "#1A1612",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: "#1A1612", fontFamily: "inherit" }}>
                        ¿En qué te podemos ayudar?
                      </label>
                      <textarea
                        value={contactoMsg}
                        onChange={(e) => setContactoMsg(e.target.value)}
                        placeholder="Contanos brevemente tu consulta…"
                        rows={2}
                        style={{
                          border: "1px solid #DDD5C8", borderRadius: 8,
                          padding: "7px 10px", fontSize: 12, outline: "none",
                          fontFamily: "inherit", resize: "none", background: "white",
                          color: "#1A1612",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => { setChatEstado("menu"); addKaiMsg("¿En qué más te puedo ayudar?", MENU_OPCIONES); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #DDD5C8",
                          background: "white", fontSize: 11, cursor: "pointer", fontWeight: 600, color: "#5C5650",
                        }}
                      >← Volver</button>
                      <button
                        type="submit"
                        disabled={enviando}
                        style={{
                          flex: 2, padding: "7px 0", borderRadius: 8, border: "none",
                          background: enviando ? "#999" : "#C1694F",
                          color: "white", fontSize: 11.5, cursor: enviando ? "not-allowed" : "pointer",
                          fontWeight: 700,
                        }}
                      >{enviando ? "Enviando…" : "📨 Enviar consulta"}</button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
            </div>{/* /panel */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kai mascot — fixed bottom-right, static ── */}
      <div
        className="fixed bottom-0 z-30"
        style={{
          right: kaiRight,
          width: kaiSize,
          opacity: kaiVisible ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: kaiVisible ? "auto" : "none",
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <div
            onClick={abrirChat}
            style={{ cursor: chatEstado === "cerrado" ? "pointer" : "default" }}
            title={chatEstado === "cerrado" ? "Hablar con Kai" : undefined}
          >
            <Image
              src="/mascota-kai.svg"
              alt="Kai"
              width={kaiSize}
              height={kaiSize}
              style={{ objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
