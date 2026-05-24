import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.inmobiliariaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const inmobiliariaId = session.user.inmobiliariaId;
  const { searchParams } = new URL(req.url);
  const meses = Number(searchParams.get("meses") ?? "6");

  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses + 1);
  desde.setDate(1);
  desde.setHours(0, 0, 0, 0);

  const [operaciones, egresos] = await Promise.all([
    db.operacionCerrada.findMany({
      where: { inmobiliariaId, fechaCierre: { gte: desde } },
      include: { agente: { select: { id: true, nombre: true } } },
      orderBy: { fechaCierre: "desc" },
    }),
    db.egresoInmobiliaria.findMany({
      where: { inmobiliariaId, fecha: { gte: desde } },
      orderBy: { fecha: "desc" },
    }),
  ]);

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const opsMes = operaciones.filter((o) => o.fechaCierre >= inicioMes);
  const egresosMes = egresos.filter((e) => e.fecha >= inicioMes);

  const totalComisionesMes = opsMes.reduce((s, o) => s + Number(o.comisionInmob), 0);
  const totalEgresosMes = egresosMes.reduce((s, e) => s + Number(e.monto), 0);
  const resultadoNeto = totalComisionesMes - totalEgresosMes;

  const comisionPromedio = opsMes.length > 0 ? totalComisionesMes / opsMes.length : 0;

  const rankingMap = new Map<string, { nombre: string; operaciones: number; totalComisiones: number; comisionAgente: number }>();
  for (const op of opsMes) {
    const entry = rankingMap.get(op.agenteId) ?? {
      nombre: op.agente.nombre,
      operaciones: 0,
      totalComisiones: 0,
      comisionAgente: 0,
    };
    entry.operaciones++;
    entry.totalComisiones += Number(op.comisionInmob);
    entry.comisionAgente += Number(op.comisionAgente);
    rankingMap.set(op.agenteId, entry);
  }
  const ranking = Array.from(rankingMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.totalComisiones - a.totalComisiones);

  return NextResponse.json({
    data: {
      metricas: {
        totalComisionesMes,
        cantidadOperacionesMes: opsMes.length,
        comisionPromedio,
        totalEgresosMes,
        resultadoNeto,
      },
      operacionesRecientes: operaciones.slice(0, 10),
      egresos: egresos.slice(0, 20),
      rankingAgentes: ranking,
      operacionesTodas: operaciones,
      egresosTodos: egresos,
    },
  });
}
