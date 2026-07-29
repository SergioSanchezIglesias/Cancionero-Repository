import type { Linea } from "@cancionero/chords";
import type { Medidor } from "./medidor";

/**
 * Medidas de la página y de la caja de texto, en puntos (1 pt = 1/72").
 * A4 vertical, como manda la PRD §8.
 */
export const PAGINA = {
  ancho: 595.28,
  alto: 841.89,
  margenHorizontal: 40,
  margenSuperior: 46,
  margenInferior: 52,
} as const;

export const ANCHO_UTIL = PAGINA.ancho - PAGINA.margenHorizontal * 2;
export const ALTO_UTIL =
  PAGINA.alto - PAGINA.margenSuperior - PAGINA.margenInferior;

/** Cuerpos de la página del PDF — PRD §15.5. */
export const LETRA = 17;
export const ACORDE = 14;

/** Interlineado con el que pdfmake pinta letra y acordes. */
const INTERLINEADO = 1.35;

/** Hueco a la derecha del acorde para que dos seguidos nunca se toquen. */
export const SEPARACION_ACORDE = 8;

/** Alto de la cabecera de cada canción: el título y su respiro debajo. */
const ALTO_CABECERA = 44;

/** Alto de la línea en blanco que separa estrofas. */
const ALTO_LINEA_VACIA = LETRA * 0.7;

/**
 * Por debajo de esto la letra deja de leerse cómodamente en un móvil, que es
 * donde el coro lo va a mirar. Si una canción no cabe **de alto** ni así,
 * ocupa dos páginas: es preferible a un cuerpo ilegible.
 */
const ESCALA_MINIMA = 0.62;

export function altoDeLinea(escala: number): number {
  return (LETRA + ACORDE) * escala * INTERLINEADO;
}

/**
 * Ancho de una línea ya maquetada: cada segmento ocupa lo que ocupe el más
 * ancho de sus dos pisos, el acorde (con su hueco) o el trozo de letra.
 */
export function anchoDeLinea(
  linea: Linea,
  escala: number,
  medidor: Medidor,
): number {
  return linea.segmentos.reduce((total, segmento) => {
    const letra = medidor.ancho(segmento.texto, LETRA * escala, linea.negrita);

    const acorde =
      segmento.acorde === null || segmento.acorde === ""
        ? 0
        : medidor.ancho(segmento.acorde, ACORDE * escala, true) +
          SEPARACION_ACORDE * escala;

    return total + Math.max(letra, acorde);
  }, 0);
}

/** Alto que ocupa la canción entera, cabecera incluida. */
export function altoDeCancion(lineas: readonly Linea[], escala: number): number {
  const alto = lineas.reduce(
    (total, linea) =>
      total +
      (linea.segmentos.length === 0
        ? ALTO_LINEA_VACIA * escala
        : altoDeLinea(escala)),
    0,
  );

  return ALTO_CABECERA + alto;
}

/**
 * Escala a la que hay que pintar la canción para que quepa: ni una línea se
 * sale por la derecha ni el conjunto rebasa la página. Nunca agranda.
 */
export function escalaQueCabe(
  lineas: readonly Linea[],
  medidor: Medidor,
): number {
  const anchoMasLargo = lineas.reduce(
    (mayor, linea) => Math.max(mayor, anchoDeLinea(linea, 1, medidor)),
    0,
  );

  const porAncho = anchoMasLargo === 0 ? 1 : ANCHO_UTIL / anchoMasLargo;
  const porAlto = ALTO_UTIL / altoDeCancion(lineas, 1);

  /*
   * El ancho no admite excepción: una línea que se sale por la derecha es un
   * documento roto, así que ahí el cuerpo baja lo que haga falta. El alto sí
   * la admite, porque siempre queda el recurso de pasar a la página siguiente.
   */
  const escala = Math.min(1, porAncho, Math.max(porAlto, ESCALA_MINIMA));

  return Number(escala.toFixed(3));
}

/**
 * Páginas que ocupará la canción a esa escala. Casi siempre una: es lo que
 * promete el diseño, y lo que permite numerar el índice sin adivinar.
 */
export function paginasQueOcupa(
  lineas: readonly Linea[],
  escala: number,
): number {
  return Math.max(1, Math.ceil(altoDeCancion(lineas, escala) / ALTO_UTIL));
}
