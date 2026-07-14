/**
 * Canales de contacto comercial de InmoLibres.
 * Un solo lugar para el número y los mensajes precargados.
 */

/** Número de contacto comercial (formato internacional sin +) */
export const WHATSAPP_NUMERO = "5493772406996";

function waLink(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/** Inmobiliaria que quiere usar el sistema (CRM + marketplace) */
export const WA_INMOBILIARIA = waLink(
  "Hola! Soy de una inmobiliaria y quiero trabajar con InmoLibres."
);

/** Particular que solo quiere publicar sus propiedades */
export const WA_PARTICULAR = waLink(
  "Hola! Quiero publicar mis propiedades en InmoLibres."
);
