import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

/** Borra logs de sistema con más de `days` días (default 30) para que la tabla no crezca sin límite. */
export async function DELETE(request: NextRequest) {
  const check = await requireSuperAdmin();
  if (isNextResponse(check)) return check;

  const days = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const limite = new Date(Date.now() - (Number.isFinite(days) ? days : 30) * 24 * 60 * 60 * 1000);

  try {
    const { count } = await db.systemLog.deleteMany({
      where: { createdAt: { lt: limite } },
    });
    return NextResponse.json({ data: { eliminados: count } });
  } catch (e) {
    console.error("[DELETE /api/admin/monitoreo]", e);
    return NextResponse.json({ error: "Error al limpiar los logs" }, { status: 500 });
  }
}
