import { parsearContenido, type Linea, type Segmento } from './contenido.js';
import { cambiarNotacion, type Notacion } from './notacion.js';
import { transponerTono } from './tono.js';
import { transponerAcorde } from './transponer.js';

/**
 * Cómo se quiere *leer* una canción. Nada de esto se persiste: en la base de
 * datos vive siempre el contenido original, en su tono y en notación latina.
 */
export interface OpcionesDeLectura {
  /** Tono en el que está escrita la canción, tal cual está guardado. */
  readonly tonoOriginal: string;
  /** Semitonos que se le suman para tocarla. `0` es leerla como está. */
  readonly semitonos: number;
  /** Notación en la que se quiere ver. La guardada es siempre latina. */
  readonly notacion: Notacion;
}

/**
 * Tono al que suena la canción con estas opciones, en notación latina. Es el
 * que decide la enarmonía de todos los acordes (sostenidos o bemoles).
 */
export function tonoDeLectura(opciones: OpcionesDeLectura): string {
  return transponerTono(opciones.tonoOriginal, opciones.semitonos);
}

function adaptar(
  token: string,
  opciones: OpcionesDeLectura,
  tonoDestino: string,
): string {
  /*
   * Sin transposición se respeta la grafía que escribió el editor: un `SIb`
   * anotado a mano en una canción en SOL debe seguir leyéndose `SIb` y no
   * convertirse en `LA#` solo por abrir el visor.
   */
  const transpuesto =
    opciones.semitonos === 0
      ? token
      : transponerAcorde(token, opciones.semitonos, tonoDestino);

  return cambiarNotacion(transpuesto, opciones.notacion);
}

/** Adapta un acorde suelto: mismo criterio que los de dentro de la canción. */
export function adaptarAcorde(
  token: string,
  opciones: OpcionesDeLectura,
): string {
  return adaptar(token, opciones, tonoDeLectura(opciones));
}

/**
 * Trocea la canción en líneas y segmentos con los acordes ya transpuestos y
 * en la notación pedida: todo lo que necesita un visor para pintarla.
 */
export function prepararContenido(
  contenido: string,
  opciones: OpcionesDeLectura,
): Linea[] {
  const tonoDestino = tonoDeLectura(opciones);

  return parsearContenido(contenido).map((linea) => ({
    negrita: linea.negrita,
    segmentos: linea.segmentos.map((segmento): Segmento => {
      if (segmento.acorde === null) return segmento;

      return {
        acorde: adaptar(segmento.acorde, opciones, tonoDestino),
        texto: segmento.texto,
      };
    }),
  }));
}
