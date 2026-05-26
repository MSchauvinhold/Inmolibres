import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.rol !== "SUPERADMIN") redirect("/login");

  const email = session.user.email ?? "";

  return (
    <div
      className="light-portal h-screen overflow-hidden grid grid-cols-1 grid-rows-[56px_1fr] lg:grid-cols-[256px_1fr]"
      style={{ background: "var(--crema-50, #FBF8F2)" }}
    >
      {/* Sidebar — col 1, rows 1-2 */}
      <div className="hidden lg:block lg:row-span-2">
        <AdminSidebar email={email} className="h-full" />
      </div>

      {/* Topbar — col 2, row 1 */}
      <AdminTopBar email={email} />

      {/* Content — col 2, row 2 */}
      <main className="overflow-y-auto p-4 sm:p-6 w-full">{children}</main>
    </div>
  );
}
