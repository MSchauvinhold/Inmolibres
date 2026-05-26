"use client";

import { Menu, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

interface AdminTopBarProps {
  email: string;
}

export function AdminTopBar({ email }: AdminTopBarProps) {
  return (
    <header
      className="h-14 border-b flex items-center px-4 gap-3 shrink-0"
      style={{
        background: "rgba(251,248,242,0.85)",
        backdropFilter: "blur(8px)",
        borderColor: "var(--border, #E8DFD0)",
      }}
    >
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: "var(--antracita-500, #3A332C)" }}
          >
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <AdminSidebar email={email} className="h-full" />
        </SheetContent>
      </Sheet>

      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{
          background: "var(--terracota-500, #C1694F)",
          color: "#fff",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        <ShieldCheck style={{ width: 9, height: 9 }} />
        SUPERADMIN
      </span>

      <div className="flex-1" />

      <span
        className="text-xs hidden sm:block truncate max-w-[200px]"
        style={{
          color: "var(--antracita-300, #6F665C)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        {email}
      </span>
    </header>
  );
}
