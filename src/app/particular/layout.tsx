import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, MessageSquare, LogOut } from "lucide-react";
import { Logo } from "@/components/crm/Logo";
import { SignOutButton } from "@/components/particular/SignOutButton";

export default async function ParticularLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.rol !== "PARTICULAR") redirect("/login");

  const user = session.user;
  const initial = user.nombre?.[0]?.toUpperCase() ?? "U";

  return (
    <div
      className="h-screen overflow-hidden flex"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      {/* Sidebar simplificado */}
      <aside
        className="w-60 h-full flex flex-col shrink-0 border-r"
        style={{ background: "var(--crema-100, #F5EFE5)", borderColor: "var(--border, #E8DFD0)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border, #E8DFD0)" }}>
          <Logo variant="compact" size={20} showSubtitle />
          <p
            className="mt-3 text-[10px] uppercase tracking-[0.12em] font-semibold"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: "var(--antracita-300, #6F665C)",
            }}
          >
            Portal particular
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/particular/propiedades"
            className="sidebar-item group"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <Building2 className="w-[15px] h-[15px] shrink-0" style={{ color: "var(--antracita-300)" }} />
            <span className="text-[13px]">Mis propiedades</span>
          </Link>
          <Link
            href="/particular/consultas"
            className="sidebar-item group"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <MessageSquare className="w-[15px] h-[15px] shrink-0" style={{ color: "var(--antracita-300)" }} />
            <span className="text-[13px]">Consultas</span>
          </Link>
        </nav>

        {/* Bloque usuario */}
        <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border, #E8DFD0)" }}>
          <div
            className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-2"
            style={{ background: "rgba(193,105,79,0.06)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "var(--antracita-700, #221E19)" }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate leading-tight" style={{ color: "var(--antracita-900)" }}>
                {user.nombre}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--antracita-300)" }}>
                Particular
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
