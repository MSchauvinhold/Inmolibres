"use client";

import { useRouter, usePathname } from "next/navigation";
import { List, CalendarDays } from "lucide-react";

interface Props {
  vista: "lista" | "calendario";
}

export function VisitasToggle({ vista }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-surface-raised">
      <button
        onClick={() => router.push(pathname)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          vista === "lista" ? "bg-white shadow-sm text-text-primary" : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <List className="w-3.5 h-3.5" />
        Lista
      </button>
      <button
        onClick={() => router.push(`${pathname}?vista=calendario`)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          vista === "calendario" ? "bg-white shadow-sm text-text-primary" : "text-text-muted hover:text-text-secondary"
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5" />
        Calendario
      </button>
    </div>
  );
}
