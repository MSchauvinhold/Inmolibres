import { PaginaEstatica, SeccionLegal } from "@/components/marketplace/PaginaEstatica";

export const metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos personales en InmoLibres.",
};

export default function PrivacidadPage() {
  return (
    <PaginaEstatica
      titulo="Política de privacidad"
      subtitulo={`Última actualización: ${new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}`}
    >
      <SeccionLegal titulo="1. Quiénes somos">
        <p>
          InmoLibres es una plataforma que conecta inmobiliarias y particulares con personas
          que buscan comprar o alquilar propiedades en Argentina. Esta política describe cómo
          recolectamos y tratamos los datos personales de quienes usan el sitio.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="2. Qué datos recolectamos">
        <p>Recolectamos únicamente los datos necesarios para que la plataforma funcione:</p>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li><strong>Visitantes:</strong> nombre, teléfono y mensaje cuando consultás por una propiedad o completás un formulario de contacto.</li>
          <li><strong>Usuarios registrados (inmobiliarias y agentes):</strong> nombre, email, teléfono y los datos que cargan para operar (propiedades, clientes, contratos).</li>
          <li><strong>Datos técnicos:</strong> información básica de navegación necesaria para el funcionamiento del sitio.</li>
        </ul>
      </SeccionLegal>

      <SeccionLegal titulo="3. Para qué los usamos">
        <ul style={{ paddingLeft: 22 }}>
          <li>Conectarte con la inmobiliaria o particular que publicó la propiedad que te interesa.</li>
          <li>Brindar el servicio de gestión (CRM) a las inmobiliarias registradas.</li>
          <li>Responder consultas y mejorar la plataforma.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          <strong>No vendemos ni cedemos tus datos a terceros</strong> con fines publicitarios.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="4. Quién accede a tus datos">
        <p>
          Cuando consultás por una propiedad, tus datos de contacto se comparten únicamente con la
          inmobiliaria o particular que la publicó, para que pueda responderte. Los datos que cada
          inmobiliaria carga en su CRM son privados de esa inmobiliaria: ninguna otra puede verlos.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="5. Dónde se almacenan">
        <p>
          Los datos se almacenan en servidores de proveedores de infraestructura reconocidos, con
          conexiones cifradas. Las imágenes se alojan en servicios especializados de gestión de medios.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="6. Tus derechos">
        <p>
          Conforme a la Ley 25.326 de Protección de Datos Personales, podés solicitar el acceso,
          rectificación o eliminación de tus datos en cualquier momento escribiéndonos por los canales
          de contacto del sitio. La Agencia de Acceso a la Información Pública, órgano de control de la
          Ley 25.326, tiene la atribución de atender denuncias y reclamos sobre incumplimiento de las
          normas de protección de datos personales.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="7. Cambios a esta política">
        <p>
          Podemos actualizar esta política. Los cambios se publican en esta misma página con la fecha
          de última actualización.
        </p>
      </SeccionLegal>
    </PaginaEstatica>
  );
}
