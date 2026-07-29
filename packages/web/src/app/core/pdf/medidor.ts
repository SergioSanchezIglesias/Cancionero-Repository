/**
 * Mide el ancho de un texto en puntos, con la tipografía del cancionero.
 *
 * Hace falta porque pdfmake coloca cada acorde en su propia columna y **no
 * parte una línea que se salga**: sin medir antes, una estrofa larga se
 * saldría del papel sin avisar.
 */
export interface Medidor {
  /**
   * Ancho del texto en puntos. `tamano` va también en puntos: la proporción
   * entre ancho y cuerpo es lineal, así que medir a 17 px equivale a medir a
   * 17 pt.
   */
  ancho(texto: string, tamano: number, negrita: boolean): number;
}

/** Fuente y estilo con los que se pinta la letra de las canciones. */
const FAMILIA = "Inter";

/**
 * Medidor real, apoyado en el canvas del navegador. Usa las mismas fuentes
 * que la interfaz, que son las mismas de las que salen los `.ttf` del PDF.
 */
export function crearMedidorDeCanvas(): Medidor | null {
  const lienzo = document.createElement("canvas");
  const contexto = lienzo.getContext("2d");

  if (contexto === null) return null;

  return {
    ancho(texto: string, tamano: number, negrita: boolean): number {
      contexto.font = `${negrita ? 700 : 400} ${tamano}px ${FAMILIA}`;

      return contexto.measureText(texto).width;
    },
  };
}
