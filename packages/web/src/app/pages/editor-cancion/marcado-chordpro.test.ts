import { describe, expect, it } from "vitest";
import {
  alternarNegrita,
  insertarAcorde,
  type Seleccion,
} from "./marcado-chordpro";

/** Coloca el cursor donde aparece «|» y devuelve la selección resultante. */
function conCursor(plantilla: string): Seleccion {
  const desde = plantilla.indexOf("|");
  const resto = plantilla.replace("|", "");
  const hasta = resto.indexOf("|");

  return {
    texto: resto.replace("|", ""),
    desde,
    hasta: hasta === -1 ? desde : hasta,
  };
}

describe("alternarNegrita", () => {
  it("marca como estribillo la línea donde está el cursor", () => {
    const resultado = alternarNegrita(conCursor("[SOL]VEN A |CELEBRAR"));

    expect(resultado.texto).toBe("**[SOL]VEN A CELEBRAR**");
  });

  it("volver a pulsar sobre una línea ya marcada la desmarca", () => {
    const resultado = alternarNegrita(conCursor("**[SOL]VEN A |CELEBRAR**"));

    expect(resultado.texto).toBe("[SOL]VEN A CELEBRAR");
  });

  it("solo toca la línea del cursor, no las de al lado", () => {
    const resultado = alternarNegrita(
      conCursor("primera\nseg|unda\ntercera"),
    );

    expect(resultado.texto).toBe("primera\n**segunda**\ntercera");
  });

  it("marca todas las líneas que abarca la selección", () => {
    const resultado = alternarNegrita(conCursor("pri|mera\nsegun|da\ntercera"));

    expect(resultado.texto).toBe("**primera**\n**segunda**\ntercera");
  });

  it("si toda la selección ya está marcada, la desmarca entera", () => {
    const resultado = alternarNegrita(
      conCursor("**pri|mera**\n**segun|da**"),
    );

    expect(resultado.texto).toBe("primera\nsegunda");
  });

  it("con la selección a medias, completa las que faltan", () => {
    const resultado = alternarNegrita(conCursor("**pri|mera**\nsegun|da"));

    expect(resultado.texto).toBe("**primera**\n**segunda**");
  });

  it("respeta las líneas en blanco que separan estrofas", () => {
    const resultado = alternarNegrita(conCursor("pri|mera\n\nsegun|da"));

    expect(resultado.texto).toBe("**primera**\n\n**segunda**");
  });

  it("sobre una línea vacía no cambia nada", () => {
    const seleccion = conCursor("primera\n|\nsegunda");

    expect(alternarNegrita(seleccion).texto).toBe(seleccion.texto);
  });

  it("deja el cursor al final de la línea marcada", () => {
    const resultado = alternarNegrita(conCursor("|VEN"));

    expect(resultado.cursor).toBe("**VEN**".length);
  });

  it("marcar y desmarcar devuelve el texto original", () => {
    const original = "[SOL]VEN A CELEBRAR";
    const marcado = alternarNegrita(conCursor("[SOL]VEN A |CELEBRAR"));

    const desmarcado = alternarNegrita({
      texto: marcado.texto,
      desde: marcado.cursor,
      hasta: marcado.cursor,
    });

    expect(desmarcado.texto).toBe(original);
  });
});

describe("insertarAcorde", () => {
  it("sin selección inserta los corchetes y deja el cursor dentro", () => {
    const resultado = insertarAcorde(conCursor("VEN A |CELEBRAR"));

    expect(resultado.texto).toBe("VEN A []CELEBRAR");
    expect(resultado.texto[resultado.cursor - 1]).toBe("[");
    expect(resultado.texto[resultado.cursor]).toBe("]");
  });

  it("con texto seleccionado lo convierte en acorde", () => {
    const resultado = insertarAcorde(conCursor("|SOL|VEN"));

    expect(resultado.texto).toBe("[SOL]VEN");
  });

  it("deja el cursor detrás del corchete de cierre", () => {
    const resultado = insertarAcorde(conCursor("|SOL|VEN"));

    expect(resultado.texto.slice(resultado.cursor)).toBe("VEN");
  });

  it("al principio del texto también funciona", () => {
    const resultado = insertarAcorde(conCursor("|VEN"));

    expect(resultado.texto).toBe("[]VEN");
  });
});
