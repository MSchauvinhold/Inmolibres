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
      style={{ background: "#FFFFFF", borderColor: "#DDD5C8" }}
    >
      <Sheet>
        <SheetTrigger asChild>
          <button className="lg:hidden p-2 rounded-lg" style={{ color: "#5C5650" }}>
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="light-portal p-0 w-64">
          <AdminSidebar email={email} className="h-full" />
        </SheetContent>
      </Sheet>

      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{
          background: "rgba(139, 69, 19, 0.1)",
          color: "#8B4513",
          border: "1px solid rgba(139, 69, 19, 0.25)",
        }}
      >
        <ShieldCheck style={{ width: 9, height: 9 }} />
        SuperAdmin
      </span>

      <div className="flex-1" />

      <span className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: "#9C9590" }}>
        {email}
      </span>
    </header>
  );
}
