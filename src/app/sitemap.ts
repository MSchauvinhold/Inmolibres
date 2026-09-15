import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://www.inmolibres.com.ar";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/buscar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/mapa`, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/inmobiliarias`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/publicar`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let propiedades: MetadataRoute.Sitemap = [];
  try {
    const publicadas = await db.propiedad.findMany({
      where: {
        publicada: true,
        OR: [
          { inmobiliaria: { estado: { in: ["ACTIVA", "PRUEBA"] } } },
          { inmobiliariaId: null },
        ],
      },
      select: { id: true, slug: true, updatedAt: true },
      take: 5000, // límite generoso; hoy el sistema maneja un puñado de inmobiliarias
    });
    propiedades = publicadas.map((p) => ({
      url: `${BASE_URL}/propiedades/${p.id}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    // El sitemap no debe romperse por un problema puntual de DB — en el peor
    // caso Google recibe menos URLs esta vez y vuelve a intentar después.
    console.error("[sitemap] Error al listar propiedades publicadas:", e);
  }

  return [...paginasEstaticas, ...propiedades];
}
