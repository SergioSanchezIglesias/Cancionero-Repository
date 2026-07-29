import { mensajeDeError } from "../utils/mensaje-error";

/**
 * Fallo al exportar que **se le puede enseñar al editor tal cual**.
 *
 * Existe para distinguirlo de un error interno cualquiera: el caso típico es
 * que no carguen las fuentes, y ahí el mensaje genérico no ayuda nada —hay
 * que decir qué ha faltado, porque el PDF sin sus tipografías no vale.
 */
export class ErrorDeExportacion extends Error {
  constructor(mensaje: string, causa?: unknown) {
    super(mensaje, { cause: causa });
    this.name = "ErrorDeExportacion";
  }
}

/** Mensaje para la pantalla: el nuestro si lo es, uno genérico si no. */
export function mensajeDeExportacion(fallo: unknown): string {
  return fallo instanceof ErrorDeExportacion
    ? fallo.message
    : mensajeDeError(fallo);
}
