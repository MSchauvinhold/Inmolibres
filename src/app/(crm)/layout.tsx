import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/crm/Sidebar";
import { TopBar } from "@/components/crm/TopBar";
import type { SessionUser } from "@/types";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;

  // Inmobiliarias suspendidas no pueden acceder al CRM
  if (user.inmobiliariaEstado === "SUSPENDIDA") redirect("/suspendido");

  let permisos = null;
  if (user.rol === "AGENTE" && user.id) {
    permisos = await db.permisosAgente.findUnique({ where: { usuarioId: user.id } });
  }

  return (
    <div
      className="light-portal h-screen overflow-hidden grid grid-cols-1 grid-rows-[64px_1fr] lg:grid-cols-[256px_1fr]"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      <div className="hidden lg:block lg:row-span-2">
        <Sidebar user={user} permisos={permisos} />
      </div>
      <TopBar user={user} />
      <main className="overflow-y-auto p-4 sm:p-6 scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
