export interface Segmento {
  acorde: string | null;
  texto: string;
}

export interface Linea {
  negrita: boolean;
  segmentos: Segmento[];
}

const RE_ACORDE_EN_LINEA = /\[([^\]]*)\]/g;

const MARCA_NEGRITA = "**";

function parsearLinea(linea: string): Linea {
  let negrita = false;
  let texto = linea;

  if (
    texto.length >= MARCA_NEGRITA.length * 2 &&
    texto.startsWith(MARCA_NEGRITA) &&
    texto.endsWith(MARCA_NEGRITA)
  ) {
    negrita = true;
    texto = texto.slice(MARCA_NEGRITA.length, -MARCA_NEGRITA.length);
  }

  const segmentos: Segmento[] = [];
  let posicion = 0;
  let acordePendiente: string | null = null;

  for (const encontrado of texto.matchAll(RE_ACORDE_EN_LINEA)) {
    const textoAnterior = texto.slice(posicion, encontrado.index);

    if (acordePendiente !== null || textoAnterior !== "") {
      segmentos.push({ acorde: acordePendiente, texto: textoAnterior });
    }

    acordePendiente = encontrado[1] ?? "";
    posicion = encontrado.index + encontrado[0].length;
  }

  const resto = texto.slice(posicion);
  if (acordePendiente !== null || resto !== "") {
    segmentos.push({ acorde: acordePendiente, texto: resto });
  }

  return { negrita, segmentos };
}

export function parsearContenido(contenido: string): Linea[] {
  if (contenido === "") return [];
  return contenido.replace(/\r\n/g, "\n").split("\n").map(parsearLinea);
}
