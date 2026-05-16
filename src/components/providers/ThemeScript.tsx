"use client";

import { useServerInsertedHTML } from "next/navigation";

const INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"light";document.documentElement.classList.add(t);}catch(e){}})()`;

export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
  ));
  return null;
}
