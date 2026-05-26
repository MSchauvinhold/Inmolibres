"use client";

import { useRouter, usePathname } from "next/navigation";
import { List, CalendarDays, CalendarRange } from "lucide-react";

type Vista = "lista" | "semana" | "calendario";

interface Props {
  vista: Vista;
}

const TABS: { key: Vista; label: string; icon: typeof List }[] = [
  { key: "lista",      label: "Lista",      icon: List },
  { key: "semana",     label: "Semana",     icon: CalendarRange },
  { key: "calendario", label: "Mes",        icon: CalendarDays },
];

export function VisitasToggle({ vista }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const navigate = (key: Vista) => {
    if (key === "lista")      router.push(pathname);
    else                      router.push(`${pathname}?vista=${key}`);
  };

  return (
    <div
      style={{
        display: "flex",
        background: "var(--crema-100, #F0E9DC)",
        borderRadius: 10,
        padding: 3,
        border: "1px solid var(--border)",
        gap: 2,
      }}
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = vista === key;
        return (
          <button
            key={key}
            onClick={() => navigate(key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 13px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              cursor: "pointer",
              background: active ? "#fff" : "transparent",
              color: active ? "var(--antracita-900)" : "var(--antracita-500)",
              border: active ? "1px solid var(--border)" : "1px solid transparent",
              boxShadow: active ? "0 1px 4px rgba(58,35,18,0.08)" : "none",
              transition: "all 120ms",
            }}
          >
            <Icon
              size={13}
              style={{ color: active ? "var(--terracota-500)" : "var(--antracita-300)" }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
