import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 300 },
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error("API no disponible");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener la cotización. Intentá de nuevo." },
      { status: 503 }
    );
  }
}
