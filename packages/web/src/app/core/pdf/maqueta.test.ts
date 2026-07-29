import { parsearContenido, type Linea } from "@cancionero/chords";
import { describe, expect, it } from "vitest";
import {
  altoDeCancion,
  anchoDeLinea,
  ANCHO_UTIL,
  escalaQueCabe,
  paginasQueOcupa,
  SEPARACION_ACORDE,
} from "./maqueta";
import type { Medidor } from "./medidor";

/**
 * Medidor de mentira, pero proporcional de verdad: cada carácter mide media
 * eme. Basta para comprobar las reglas de encaje sin depender de una fuente.
 */
const MEDIDOR: Medidor = {
  ancho: (texto, tamano) => texto.length * tamano * 0.5,
};

function lineas(contenido: string) {
  return parsearContenido(contenido);
}

/** La primera línea del contenido, fallando claro si no la hubiera. */
function primeraLinea(contenido: string): Linea {
  const [linea] = lineas(contenido);

  if (linea === undefined) {
    throw new Error(`El contenido de prueba no tiene ni una línea: ${contenido}`);
  }

  return linea;
}

describe("anchoDeLinea", () => {
  it("suma el trozo más ancho de cada columna, acorde o letra", () => {
    // La letra («VEN», 3 × 17 × 0,5 = 25,5) es más estrecha que el acorde
    // («SOL», 3 × 14 × 0,5 = 21, más 8 de hueco = 29): manda el acorde.
    expect(anchoDeLinea(primeraLinea("[SOL]VEN"), 1, MEDIDOR)).toBe(
      21 + SEPARACION_ACORDE,
    );
  });

  it("una línea sin acordes mide lo que mide su letra", () => {
    expect(anchoDeLinea(primeraLinea("dos o más"), 1, MEDIDOR)).toBe(
      9 * 17 * 0.5,
    );
  });

  it("la escala encoge la línea proporcionalmente", () => {
    const linea = primeraLinea("[SOL]VEN A CELEBRAR");

    const entera = anchoDeLinea(linea, 1, MEDIDOR);
    const mitad = anchoDeLinea(linea, 0.5, MEDIDOR);

    expect(mitad).toBeCloseTo(entera / 2, 5);
  });
});

describe("escalaQueCabe", () => {
  it("una canción corta se pinta a tamaño natural", () => {
    const escala = escalaQueCabe(lineas("[SOL]VEN A CELEBRAR"), MEDIDOR);

    expect(escala).toBe(1);
  });

  it("encoge lo justo para que la línea más larga no se salga", () => {
    const larga = "x".repeat(120);
    const escala = escalaQueCabe(lineas(larga), MEDIDOR);

    expect(escala).toBeLessThan(1);
    expect(
      anchoDeLinea(primeraLinea(larga), escala, MEDIDOR),
    ).toBeLessThanOrEqual(ANCHO_UTIL);
  });

  it("encoge también cuando lo que sobra es alto, no ancho", () => {
    const muchasLineas = Array.from({ length: 40 }, () => "corta").join("\n");

    expect(escalaQueCabe(lineas(muchasLineas), MEDIDOR)).toBeLessThan(1);
  });

  it("no baja de un cuerpo legible aunque la canción sea enorme", () => {
    const enorme = Array.from({ length: 400 }, () => "linea").join("\n");

    expect(escalaQueCabe(lineas(enorme), MEDIDOR)).toBe(0.62);
  });

  it("nunca agranda una canción para rellenar la página", () => {
    expect(escalaQueCabe(lineas("[SOL]Ay"), MEDIDOR)).toBe(1);
  });

  it("un contenido vacío no divide por cero", () => {
    expect(escalaQueCabe(lineas(""), MEDIDOR)).toBe(1);
  });
});

describe("paginasQueOcupa", () => {
  it("lo normal es que una canción ocupe una página", () => {
    const cancion = lineas(
      "**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**\n\n[Mim]Os aseguro",
    );

    expect(paginasQueOcupa(cancion, escalaQueCabe(cancion, MEDIDOR))).toBe(1);
  });

  it("una canción que no cabe ni encogida ocupa las páginas que haga falta", () => {
    const enorme = lineas(Array.from({ length: 400 }, () => "linea").join("\n"));
    const escala = escalaQueCabe(enorme, MEDIDOR);

    expect(paginasQueOcupa(enorme, escala)).toBeGreaterThan(1);
    expect(paginasQueOcupa(enorme, escala)).toBe(
      Math.ceil(altoDeCancion(enorme, escala) / (841.89 - 46 - 52)),
    );
  });
});
