import { HttpErrorResponse } from "@angular/common/http";

const NOMBRE_EN_CABECERA = /filename="?([^";]+)"?/i;

/**
 * Nombre con el que guardar la descarga. Se prefiere el que propone el
 * servidor en `Content-Disposition`, porque lleva la fecha del día.
 */
export function nombreDeDescarga(
  cabecera: string | null,
  porDefecto: string,
): string {
  const encontrado = cabecera?.match(NOMBRE_EN_CABECERA)?.[1];

  if (encontrado === undefined) return porDefecto;

  // Nunca se respeta una ruta: solo el último tramo del nombre.
  const nombre = encontrado.split(/[/\\]/).pop()?.trim() ?? "";

  return nombre === "" ? porDefecto : nombre;
}

/**
 * Mensaje para una descarga que ha fallado.
 * No usa `mensajeDeError` a propósito: al pedir la respuesta como `blob`, el
 * cuerpo del error también llega como Blob y su texto no se puede leer sin
 * abrirlo. Antes que enseñar un mensaje genérico, se dice qué ha fallado.
 */
export function mensajeDeDescargaFallida(fallo: unknown): string {
  if (fallo instanceof HttpErrorResponse && fallo.status === 0) {
    return "No se ha podido contactar con el servidor.";
  }

  return "No se ha podido preparar la copia. Vuelve a intentarlo.";
}

/** Provoca la descarga del fichero en el navegador. */
export function descargarFichero(contenido: Blob, nombre: string): void {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombre;

  // El enlace tiene que estar en el documento para que algunos navegadores
  // respeten el clic, y la URL no se libera hasta que la descarga ha arrancado:
  // revocarla en la misma vuelta del bucle de eventos la aborta en Safari.
  document.body.append(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url));
}
