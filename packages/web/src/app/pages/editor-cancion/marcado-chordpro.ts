/**
 * Atajos de escritura del editor. Son funciones puras sobre el texto y la
 * posición del cursor: nada de DOM, para poder probarlas sin pintar nada.
 */

const MARCA_NEGRITA = "**";

export interface Seleccion {
  readonly texto: string;
  readonly desde: number;
  readonly hasta: number;
}

export interface Resultado {
  readonly texto: string;
  /** Dónde dejar el cursor después del cambio. */
  readonly cursor: number;
}

function esNegrita(linea: string): boolean {
  return (
    linea.length >= MARCA_NEGRITA.length * 2 &&
    linea.startsWith(MARCA_NEGRITA) &&
    linea.endsWith(MARCA_NEGRITA)
  );
}

function quitarNegrita(linea: string): string {
  return linea.slice(MARCA_NEGRITA.length, -MARCA_NEGRITA.length);
}

function ponerNegrita(linea: string): string {
  return `${MARCA_NEGRITA}${linea}${MARCA_NEGRITA}`;
}

/** Límites del bloque de líneas completas que toca la selección. */
function bloqueDeLineas(seleccion: Seleccion): {
  inicio: number;
  fin: number;
} {
  const { texto, desde, hasta } = seleccion;

  const inicio = texto.lastIndexOf("\n", Math.max(desde - 1, 0)) + 1;
  const siguienteSalto = texto.indexOf("\n", hasta);
  const fin = siguienteSalto === -1 ? texto.length : siguienteSalto;

  return { inicio, fin: Math.max(fin, inicio) };
}

/**
 * Marca o desmarca el estribillo. La negrita es de línea completa, porque así
 * es como la reconoce el formato: `**LÍNEA**`.
 */
export function alternarNegrita(seleccion: Seleccion): Resultado {
  const { texto } = seleccion;
  const { inicio, fin } = bloqueDeLineas(seleccion);

  const lineas = texto.slice(inicio, fin).split("\n");
  const conTexto = lineas.filter((linea) => linea.trim() !== "");

  if (conTexto.length === 0) return { texto, cursor: seleccion.hasta };

  // Si ya estaban todas marcadas, el atajo desmarca.
  const desmarcar = conTexto.every(esNegrita);

  const nuevas = lineas.map((linea) => {
    if (linea.trim() === "") return linea;
    if (desmarcar) return esNegrita(linea) ? quitarNegrita(linea) : linea;

    return esNegrita(linea) ? linea : ponerNegrita(linea);
  });

  const bloque = nuevas.join("\n");

  return {
    texto: texto.slice(0, inicio) + bloque + texto.slice(fin),
    cursor: inicio + bloque.length,
  };
}

/**
 * Inserta los corchetes del acorde. Con texto seleccionado lo envuelve; sin
 * selección deja el cursor dentro, listo para teclear el acorde.
 */
export function insertarAcorde(seleccion: Seleccion): Resultado {
  const { texto, desde, hasta } = seleccion;

  const dentro = texto.slice(desde, hasta);
  const nuevo = `${texto.slice(0, desde)}[${dentro}]${texto.slice(hasta)}`;

  return {
    texto: nuevo,
    cursor: dentro === "" ? desde + 1 : hasta + 2,
  };
}
