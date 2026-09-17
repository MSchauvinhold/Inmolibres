"use client";

import { useServerInsertedHTML } from "next/navigation";

// Modo oscuro desactivado (ver ThemeProvider): se fuerza "light" antes del primer
// pintado, sin leer localStorage, para que un "dark" viejo no alcance a aplicarse.
const INIT_SCRIPT = `(function(){try{var c=document.documentElement.classList;c.remove("dark");c.add("light");}catch(e){}})()`;

export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
  ));
  return null;
}
