"use client";

import { signOut } from "next-auth/react";
import type { CSSProperties, ReactNode } from "react";

interface SignOutLinkProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Un link con pinta de link que en realidad cierra la sesión antes de ir a /login.
 * Necesario en pantallas como /suspendido: si solo navegás a /login con la sesión
 * todavía activa (y suspendida), el middleware te rebota de nuevo a /suspendido — un loop.
 */
export function SignOutLink({ children, className, style }: SignOutLinkProps) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
    >
      {children}
    </button>
  );
}
