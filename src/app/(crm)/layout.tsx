import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/crm/Sidebar";
import { TopBar } from "@/components/crm/TopBar";
import type { SessionUser } from "@/types";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;

  return (
    <div
      className="light-portal h-screen overflow-hidden grid grid-cols-1 grid-rows-[56px_1fr] lg:grid-cols-[256px_1fr]"
      style={{ background: "#FAF8F5" }}
    >
      {/* Sidebar — col 1, rows 1-2 */}
      <div className="hidden lg:block lg:row-span-2">
        <Sidebar user={user} />
      </div>

      {/* Topbar — col 2, row 1 */}
      <TopBar user={user} />

      {/* Content — col 2, row 2 */}
      <main className="overflow-y-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
