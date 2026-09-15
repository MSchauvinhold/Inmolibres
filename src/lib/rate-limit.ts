import type { NextRequest } from "next/server";

/**
 * Rate limiting simple en memoria para endpoints públicos (sin auth).
 *
 * Limitación conocida: al vivir en memoria del proceso, no se comparte entre
 * instancias serverless ni sobrevive a un cold start — no reemplaza un rate
 * limiter distribuido (Redis/Upstash) si esto llega a recibir tráfico serio.
 * Para el volumen actual (una plataforma chica, pocos usuarios) alcanza para
 * frenar bots/spam básico en los formularios públicos.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  /** Cantidad máxima de intentos permitidos dentro de la ventana. */
  limit: number;
  /** Tamaño de la ventana, en milisegundos. */
  windowMs: number;
}

/** true si `key` superó el límite — en ese caso NO se cuenta este intento. */
export function isRateLimited(key: string, { limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true;
  }

  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/** IP del cliente a partir de los headers que reenvía Vercel. */
export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
