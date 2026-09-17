"use client";

import { createContext, useContext, useEffect } from "react";

// ─── Modo oscuro: desactivado a propósito (2026-09-17) ───────────────────────
// El tema oscuro quedó a medias y hoy rompe la legibilidad: la clase `.dark`
// oscurece las superficies basadas en tokens (`.card` → var(--surface)), pero
// ~87 fondos siguen siendo blancos fijos en el código (incluido `.il-card`), y
// la escala antracita es tinta oscura en ambos modos. Resultado: según la
// pantalla, terminaba texto oscuro sobre fondo oscuro o claro sobre blanco.
// Tampoco hay ningún interruptor en la UI (nadie llama a setTheme).
//
// Hasta rediseñarlo, la app fuerza el tema claro y limpia cualquier "dark" que
// haya quedado guardado en el navegador. Para retomarlo: reponer la lectura de
// localStorage acá y en ThemeScript, y recién ahí encarar los fondos fijos.
// El bloque `.dark` de globals.css se deja como está, sin aplicarse.

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function ThemeProvider({
  children,
  storageKey = "theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (!root.classList.contains("light")) root.classList.add("light");
    try {
      if (localStorage.getItem(storageKey) === "dark") localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme: () => {}, resolvedTheme: "light" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
