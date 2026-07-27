import { HttpErrorResponse } from "@angular/common/http";

/** La API responde a los errores con un cuerpo `{ error: string }`. */
function textoDelCuerpo(cuerpo: unknown): string | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  if (!("error" in cuerpo)) return null;

  const { error } = cuerpo;

  return typeof error === "string" && error.trim() !== "" ? error : null;
}

/** Traduce un fallo de red o de la API a algo que se le pueda enseñar al usuario. */
export function mensajeDeError(fallo: unknown): string {
  if (fallo instanceof HttpErrorResponse) {
    if (fallo.status === 0) {
      return "No se ha podido contactar con el servidor.";
    }

    const texto = textoDelCuerpo(fallo.error);
    if (texto !== null) return texto;
  }

  return "Ha ocurrido un error inesperado.";
}
