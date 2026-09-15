import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Nominatim exige uso responsable (~1 req/seg) — protegemos el endpoint
  // además de nosotros mismos, ya que es público y sin auth.
  if (isRateLimited(`geocoding:${getClientIp(request)}`, { limit: 20, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Demasiadas búsquedas. Esperá un momento." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 3) {
    return NextResponse.json(
      { error: "Se requiere parámetro 'q' de al menos 3 caracteres" },
      { status: 400 }
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "InmoLibres/1.0 (schauvinholdmateo@gmail.com)",
        "Accept-Language": "es",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al consultar el servicio de geocoding" },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Shape: [{ lat, lon, display_name, ... }]
    const results = (data as Array<{ lat: string; lon: string; display_name: string }>).map(
      (item) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        label: item.display_name,
      })
    );

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Error interno de geocoding" }, { status: 500 });
  }
}
