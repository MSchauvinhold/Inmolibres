import type { Metadata } from "next";

// La página es un componente cliente y no puede exportar metadata: sin esto la pestaña mostraba el título de la home.
export const metadata: Metadata = { title: "Iniciar sesión" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
