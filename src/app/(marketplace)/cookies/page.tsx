import { PaginaEstatica, SeccionLegal } from "@/components/marketplace/PaginaEstatica";

export const metadata = {
  title: "Política de cookies",
  description: "Qué cookies usa InmoLibres y para qué.",
};

export default function CookiesPage() {
  return (
    <PaginaEstatica
      titulo="Política de cookies"
      subtitulo={`Última actualización: ${new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`}
    >
      <SeccionLegal titulo="1. Qué son las cookies">
        <p>
          Las cookies son pequeños archivos que el sitio guarda en tu navegador para recordar
          información entre visitas. También usamos tecnologías similares como el almacenamiento
          local del navegador.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="2. Qué cookies usamos">
        <ul style={{ paddingLeft: 22 }}>
          <li>
            <strong>Cookies esenciales (sesión):</strong> si sos usuario registrado (inmobiliaria o agente),
            usamos una cookie para mantener tu sesión iniciada de forma segura. Sin ella, el acceso al
            sistema no funciona.
          </li>
          <li>
            <strong>Preferencias:</strong> guardamos en tu navegador preferencias de uso
            (por ejemplo, la vista de moneda elegida o filtros recientes) para mejorar tu experiencia.
          </li>
        </ul>
      </SeccionLegal>

      <SeccionLegal titulo="3. Lo que NO hacemos">
        <ul style={{ paddingLeft: 22 }}>
          <li>No usamos cookies de publicidad ni de seguimiento entre sitios.</li>
          <li>No vendemos información de navegación a terceros.</li>
        </ul>
      </SeccionLegal>

      <SeccionLegal titulo="4. Cómo gestionarlas">
        <p>
          Podés borrar o bloquear las cookies desde la configuración de tu navegador. Tené en cuenta
          que si bloqueás las cookies esenciales, no vas a poder iniciar sesión en el sistema.
        </p>
      </SeccionLegal>
    </PaginaEstatica>
  );
}
