"use client";

import { useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { SearchModal } from "./SearchModal";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import type { SessionUser } from "@/types";

interface TopBarProps {
  user: SessionUser;
  title?: string;
}

export function TopBar({ user, title }: TopBarProps) {
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

  return (
    <>
      <header className="h-14 border-b flex items-center px-4 gap-3 shrink-0" style={{ background: "#FFFFFF", borderColor: "#DDD5C8" }}>
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="lg:hidden p-2 rounded-lg hover:bg-surface-raised">
              <Menu className="w-5 h-5 text-text-secondary" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="light-portal p-0 w-64">
            <Sidebar user={user} className="h-full" />
          </SheetContent>
        </Sheet>

        {title && (
          <h1 className="text-sm font-semibold text-text-primary hidden sm:block">{title}</h1>
        )}

        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-border transition-colors text-text-muted text-sm flex-1 max-w-xs"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline text-xs">Buscar...</span>
          <kbd className="ml-auto text-[10px] border border-border rounded px-1.5 py-0.5 font-mono hidden sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        <NotificationBell />

        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--brand-primary)" }}>
            {user.nombre?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span className="text-sm font-medium text-text-primary hidden sm:block">{user.nombre}</span>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
