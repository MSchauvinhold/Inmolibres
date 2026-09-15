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
      <SeccionLegal titulo="1. Quiénes somos y responsable del tratamiento">
        <p>
          InmoLibres es una plataforma que conecta inmobiliarias y particulares con personas
          que buscan comprar o alquilar propiedades en Argentina. Esta política describe cómo
          recolectamos y tratamos los datos personales de quienes usan el sitio.
        </p>
        <p style={{ marginTop: 8 }}>
          El responsable de la base de datos es{" "}
          <strong>[Completar: razón social / nombre y apellido, CUIT, domicilio legal]</strong>,
          con domicilio en Paso de los Libres, Corrientes, Argentina.
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
          Los datos se almacenan con conexiones cifradas, usando proveedores de infraestructura
          reconocidos internacionalmente: la base de datos corre sobre Neon (PostgreSQL) y la
          aplicación sobre Vercel; las imágenes se alojan en Cloudinary. Estos proveedores pueden
          procesar datos en servidores ubicados fuera de la Argentina, por lo que puede existir una
          transferencia internacional de datos en los términos del art. 12 de la Ley 25.326. En todos
          los casos actúan como encargados del tratamiento, bajo nuestras instrucciones y con las
          garantías de seguridad y confidencialidad de cada proveedor.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="6. Cuánto tiempo los conservamos">
        <p>
          Conservamos tus datos mientras tengan una finalidad vinculada al servicio (por ejemplo,
          mientras tu cuenta esté activa, o mientras una consulta pueda requerir seguimiento) y,
          después, por el plazo que exijan las obligaciones legales aplicables. Podés pedirnos la
          eliminación antes de ese plazo salvo que exista una obligación legal de conservarlos.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="7. Tus derechos">
        <p>
          Conforme a la Ley 25.326 de Protección de Datos Personales, tenés derecho de acceso,
          rectificación, actualización y supresión de tus datos personales (derechos ARCO). Para
          ejercerlos, escribinos a{" "}
          <a href="mailto:inmolibres@gmail.com" style={{ color: "var(--terracota-600, #A85737)", fontWeight: 600 }}>
            inmolibres@gmail.com
          </a>. La Agencia de Acceso a la Información Pública (AAIP), órgano de control de la
          Ley 25.326, tiene la atribución de atender denuncias y reclamos sobre incumplimiento de las
          normas de protección de datos personales.
        </p>
      </SeccionLegal>

      <SeccionLegal titulo="8. Cambios a esta política">
        <p>
          Podemos actualizar esta política. Los cambios se publican en esta misma página con la fecha
          de última actualización.
        </p>
      </SeccionLegal>
    </PaginaEstatica>
  );
}
