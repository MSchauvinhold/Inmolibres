import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://www.inmolibres.com.ar";

/**
 * Bloquea el rastreo de todo lo que sea CRM/paneles privados (requieren login
 * de cualquier forma, pero evita gastar crawl budget e indexar pantallas de
 * "iniciá sesión") y deja abierto el marketplace público, que es lo que
 * queremos que Google indexe.
 *
 * Importante: "/propiedades" a secas es el listado del CRM (protegido por
 * middleware) — NO confundir con "/propiedades/[id]/[slug]", que es la ficha
 * pública de cada aviso. Por eso se usa "$" para anclar el final de ruta.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin", "/admin/*",
          "/particular", "/particular/*",
          "/upgrade",
          "/dashboard",
          "/clientes", "/clientes/*",
          "/visitas", "/visitas/*",
          "/alquileres", "/alquileres/*",
          "/consultas", "/consultas/*",
          "/configuracion", "/configuracion/*",
          "/finanzas", "/finanzas/*",
          "/contactos", "/contactos/*",
          "/calculadoras", "/calculadoras/*",
          "/reportes",
          "/propiedades$",
          "/propiedades/nueva",
          "/propiedades/*/editar",
          "/sin-permiso",
          "/suspendido",
          "/login",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
