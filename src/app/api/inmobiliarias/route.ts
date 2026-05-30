import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSuperAdmin, isNextResponse } from "@/lib/api-auth";

const crearInmobiliariaSchema = z.object({
  nombre: z.string().min(2, "Nombre muy corto").max(100),
  whatsapp: z.string().min(8).max(20),
  email: z.string().email("Email inválido"),
  plan: z.enum(["BASICO", "AVANZADO", "PRO"]).default("AVANZADO"),
  fechaVencimiento: z.string().datetime().optional(),
  // Admin user
  adminNombre: z.string().min(2).max(100),
  adminEmail: z.string().email("Email del admin inválido"),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function GET() {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  try {
    const inmobiliarias = await db.inmobiliaria.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { usuarios: true, propiedades: true, clientes: true },
        },
      },
    });

    return NextResponse.json({ data: inmobiliarias });
  } catch {
    return NextResponse.json({ error: "Error al obtener inmobiliarias" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (isNextResponse(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = crearInmobiliariaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { adminNombre, adminEmail, adminPassword, fechaVencimiento, ...inmobiliariaData } =
    parsed.data;

  const emailExists = await db.usuario.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (emailExists) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email" },
      { status: 409 }
    );
  }

  try {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const inmobiliaria = await db.$transaction(async (tx) => {
      const created = await tx.inmobiliaria.create({
        data: {
          ...inmobiliariaData,
          ...(fechaVencimiento ? { fechaVencimiento: new Date(fechaVencimiento) } : {}),
        },
      });

      await tx.usuario.create({
        data: {
          inmobiliariaId: created.id,
          email: adminEmail,
          passwordHash,
          nombre: adminNombre,
          rol: "ADMIN",
        },
      });

      return created;
    });

    return NextResponse.json({ data: inmobiliaria }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear inmobiliaria" }, { status: 500 });
  }
}
