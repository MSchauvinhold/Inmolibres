import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default async function SuspendidoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const whatsapp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5437222000000";
  const waLink = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero renovar mi suscripción en InmoLibres.")}`;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--background-mp)" }}
    >
      <div className="max-w-md w-full text-center">
        {/* Casita con candado SVG */}
        <div className="flex justify-center mb-8">
          <svg
            width="120"
            height="130"
            viewBox="0 0 120 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* House wall */}
            <rect x="14" y="62" width="92" height="62" rx="4" fill="#FAE5D3" />
            {/* Roof shadow */}
            <polygon points="8,66 60,12 112,66" fill="#A05240" />
            {/* Roof */}
            <polygon points="6,62 58,8 110,62" fill="#C1694F" />
            {/* Left window */}
            <rect x="18" y="72" width="20" height="16" rx="3" fill="rgba(255,255,255,0.92)" />
            <rect x="18" y="72" width="20" height="16" rx="3" stroke="#DDD5C8" strokeWidth="1" />
            <line x1="28" y1="72" x2="28" y2="88" stroke="#DDD5C8" strokeWidth="1" />
            <line x1="18" y1="80" x2="38" y2="80" stroke="#DDD5C8" strokeWidth="1" />
            {/* Right window */}
            <rect x="82" y="72" width="20" height="16" rx="3" fill="rgba(255,255,255,0.92)" />
            <rect x="82" y="72" width="20" height="16" rx="3" stroke="#DDD5C8" strokeWidth="1" />
            <line x1="92" y1="72" x2="92" y2="88" stroke="#DDD5C8" strokeWidth="1" />
            <line x1="82" y1="80" x2="102" y2="80" stroke="#DDD5C8" strokeWidth="1" />
            {/* Door opening */}
            <rect x="44" y="94" width="32" height="30" rx="4" fill="#DDD5C8" />

            {/* Candado — centrado en la puerta */}
            {/* Cuerpo del candado */}
            <rect x="51" y="103" width="18" height="14" rx="3" fill="#C0392B" />
            {/* Arco del candado */}
            <path
              d="M54 103 L54 98 Q60 92 66 98 L66 103"
              stroke="#C0392B"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Ojito del candado */}
            <circle cx="60" cy="110" r="2.5" fill="rgba(255,255,255,0.85)" />
            <rect x="59" y="110" width="2" height="3" rx="1" fill="rgba(255,255,255,0.7)" />

            {/* Ground */}
            <rect x="0" y="122" width="120" height="5" rx="2.5" fill="#DEB887" />
          </svg>
        </div>

        <h1
          className="text-3xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-fraunces)",
            color: "var(--antracite)",
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
          }}
        >
          Tu suscripción ha vencido
        </h1>

        <p
          className="text-base leading-relaxed mb-2"
          style={{
            color: "var(--antracite-mid)",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          El acceso de{" "}
          <strong style={{ color: "var(--antracite)" }}>
            {session.user.inmobiliariaNombre ?? "tu inmobiliaria"}
          </strong>{" "}
          está suspendido. Tus publicaciones fueron pausadas hasta renovar.
        </p>

        <p
          className="text-sm mb-8"
          style={{
            color: "var(--antracite-light)",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          Contactanos por WhatsApp para reactivar tu cuenta en minutos.
        </p>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl font-semibold text-white text-base transition-opacity hover:opacity-90"
          style={{
            background: "#25D366",
            fontFamily: "var(--font-jakarta)",
            boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
            textDecoration: "none",
          }}
        >
          <MessageCircle className="w-5 h-5" />
          Contactar a InmoLibres
        </a>

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm transition-opacity hover:opacity-60"
            style={{
              color: "var(--antracite-light)",
              fontFamily: "var(--font-jakarta)",
              textDecoration: "none",
            }}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
