import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--background-mp, #FBF8F2)" }}
    >
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--terracota-100, #FAE5D3)" }}
          >
            <MapPinOff className="w-9 h-9" style={{ color: "var(--terracota-500, #C1694F)" }} />
          </div>
        </div>

        <h1
          className="text-3xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            color: "var(--antracita-900, #14110E)",
            letterSpacing: "-0.025em",
          }}
        >
          Esta página no existe
        </h1>

        <p
          className="text-base leading-relaxed mb-8"
          style={{ color: "var(--antracita-500, #3A332C)", fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          El link que seguiste está roto o la dirección cambió. Probá volver al inicio.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm"
          style={{
            background: "var(--antracita-900, #14110E)",
            textDecoration: "none",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }}
        >
          Volver a InmoLibres
        </Link>
      </div>
    </div>
  );
}
