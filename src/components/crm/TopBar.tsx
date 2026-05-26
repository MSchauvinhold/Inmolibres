"use client";

import { useState, useEffect } from "react";
import { Search, Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { SearchModal } from "./SearchModal";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import type { SessionUser } from "@/types";

interface TopBarProps {
  user: SessionUser;
}

export function TopBar({ user }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((p) => !p);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const initial = user.nombre?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <header
        className="h-16 px-5 flex items-center justify-between shrink-0 border-b"
        style={{
          background: "rgba(251,248,242,0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderColor: "var(--border, #E8DFD0)",
        }}
      >
        {/* Izquierda: hamburger (mobile) + búsqueda */}
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="lg:hidden p-2 rounded-xl transition-colors"
                style={{ color: "var(--antracita-500, #3A332C)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--crema-100, #F5EFE5)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="light-portal p-0 w-64">
              <Sidebar user={user} className="h-full" />
            </SheetContent>
          </Sheet>

          {/* Buscador */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 rounded-xl border transition-colors"
            style={{
              background: "var(--crema-100, #F5EFE5)",
              borderColor: "var(--border, #E8DFD0)",
              height: 38,
              width: "clamp(220px, 30vw, 380px)",
            }}
          >
            <Search
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "var(--antracita-300, #6F665C)" }}
            />
            <span
              className="flex-1 text-left text-[13px] hidden sm:block"
              style={{ color: "var(--antracita-300, #6F665C)" }}
            >
              Buscá propiedad, cliente, contrato…
            </span>
            <kbd
              className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-md border font-mono shrink-0"
              style={{
                background: "var(--surface, #fff)",
                borderColor: "var(--border, #E8DFD0)",
                color: "var(--antracita-300, #6F665C)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Derecha: notificaciones + usuario */}
        <div className="flex items-center gap-2.5">
          {/* Bell */}
          <NotificationBell />

          {/* Divisor */}
          <div
            className="hidden sm:block w-px h-5 shrink-0"
            style={{ background: "var(--border, #E8DFD0)" }}
          />

          {/* Pill de usuario */}
          <div
            className="hidden sm:flex items-center gap-2 pl-1 pr-3 rounded-full border"
            style={{
              background: "var(--crema-100, #F5EFE5)",
              borderColor: "var(--border, #E8DFD0)",
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "var(--antracita-700, #221E19)" }}
            >
              {initial}
            </div>
            <span
              className="text-[12.5px] font-medium leading-none"
              style={{ color: "var(--antracita-700, #221E19)" }}
            >
              {user.nombre?.split(" ")[0] ?? user.nombre}
            </span>
          </div>

          {/* Solo avatar en mobile */}
          <div
            className="sm:hidden w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "var(--antracita-700, #221E19)" }}
          >
            {initial}
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
