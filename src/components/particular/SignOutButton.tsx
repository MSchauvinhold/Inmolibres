"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        // No usar callbackUrl: next-auth resuelve la URL absoluta contra
        // AUTH_URL/NEXTAUTH_URL (hardcodeado a localhost en .env de desarrollo),
        // no contra el dominio real. Mismo patrón que Sidebar/AdminSidebar.
        await signOut({ redirect: false });
        window.location.href = "/login";
      }}
      className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
      style={{ color: "#6B6560" }}
    >
      <LogOut className="w-3.5 h-3.5" />
      Salir
    </button>
  );
}
