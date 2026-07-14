import { PaginaEstatica, SeccionLegal } from "@/components/marketplace/PaginaEstatica";

export const metadata = {
  title: "Términos y condiciones",
  description: "Términos de uso de la plataforma InmoLibres.",
};

export default function TerminosPage() {
  return (
    <PaginaEstatica
      titulo="Términos y condiciones"
      subtitulo={`Última actualización: ${new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`}
    >
      <SeccionLegal titulo="1. Qué es InmoLibres">
        <p>
          InmoLibres es una plataforma digital que publica propiedades en venta y alquiler cargadas
          por inmobiliarias y particulares verificados, y ofrece a las inmobiliarias un sistema de
          gestión (CRM). Al usar el sitio aceptás estos términos.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="2. Rol de la plataforma">
        <p>
          InmoLibres <strong>no es parte</strong> de las operaciones inmobiliarias: no compra, no vende,
          no alquila ni intermedia en las transacciones. Las operaciones se realizan directamente entre
          el interesado y la inmobiliaria o particular que publicó la propiedad, quienes son los únicos
          responsables de la veracidad de la información publicada, los precios, las condiciones y el
          cumplimiento de las normas aplicables a su actividad.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="3. Publicaciones">
        <p>
          Las inmobiliarias y particulares se comprometen a publicar información veraz y a mantenerla
          actualizada. InmoLibres puede despublicar contenido que resulte falso, engañoso o contrario
          a la ley, y suspender cuentas que incumplan estos términos.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="4. Uso del sitio">
        <p>Al usar la plataforma te comprometés a:</p>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>No usar el sitio con fines fraudulentos o ilegales.</li>
          <li>No intentar acceder a datos de otros usuarios o inmobiliarias.</li>
          <li>No copiar ni extraer el contenido del sitio de forma masiva.</li>
        </ul>
      </SeccionLegal>

      <SeccionLegal titulo="5. Documentos generados por el sistema">
        <p>
          El sistema permite a las inmobiliarias generar borradores de contratos y documentos. Estos
          documentos son plantillas de referencia: cada inmobiliaria es responsable de revisarlos y
          adecuarlos con su asesoramiento legal antes de utilizarlos.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="6. Limitación de responsabilidad">
        <p>
          InmoLibres no garantiza la disponibilidad ininterrumpida del servicio ni se responsabiliza
          por los daños derivados de las operaciones realizadas entre usuarios, ni por la exactitud de
          la información publicada por terceros.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="7. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de la República Argentina.
        </p>
      </SeccionLegal>
    </PaginaEstatica>
  );
}
