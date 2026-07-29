import type { Content, ContentColumns, ContentTable } from "pdfmake/interfaces";
import { describe, expect, it } from "vitest";
import type { Cancion } from "../interfaces/cancion.interface";
import {
  construirDocumento,
  nombreDelFichero,
  paginasTotales,
  type OpcionesDelCancionero,
} from "./documento-cancionero";
import type { Medidor } from "./medidor";

const MEDIDOR: Medidor = {
  ancho: (texto, tamano) => texto.length * tamano * 0.5,
};

function cancion(parcial: Partial<Cancion> & { id: number }): Cancion {
  return {
    titulo: `Canción ${parcial.id}`,
    contenido: "[SOL]VEN A CELE[SIm]BRAR",
    tonoOriginal: "SOL",
    notacionPorDefecto: "latina",
    cantoralOrigen: null,
    creadoEn: "2026-01-01 10:00:00",
    editadoEn: "2026-01-01 10:00:00",
    etiquetas: [],
    ...parcial,
  };
}

function opciones(
  cambios: Partial<OpcionesDelCancionero> = {},
): OpcionesDelCancionero {
  return {
    titulo: "Domingo 12 de marzo",
    canciones: [cancion({ id: 1 }), cancion({ id: 2 })],
    notacion: "latina",
    portada: true,
    indice: true,
    numeracion: true,
    ...cambios,
  };
}

/** Todos los textos del documento, en orden, para poder buscar en ellos. */
function textos(contenido: Content[]): string[] {
  const recogidos: string[] = [];

  const recorrer = (nodo: unknown): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }

    if (typeof nodo !== "object" || nodo === null) return;

    const bloque = nodo as Record<string, unknown>;

    if (typeof bloque["text"] === "string") recogidos.push(bloque["text"]);
    if (bloque["columns"] !== undefined) recorrer(bloque["columns"]);
    if (bloque["stack"] !== undefined) recorrer(bloque["stack"]);
    if (bloque["table"] !== undefined) {
      recorrer((bloque["table"] as { body: unknown }).body);
    }
  };

  recorrer(contenido);

  return recogidos;
}

function contenidoDe(opcionesDadas: OpcionesDelCancionero): Content[] {
  return construirDocumento(opcionesDadas, MEDIDOR).content as Content[];
}

describe("construirDocumento · estructura", () => {
  it("saca el papel en A4 vertical", () => {
    const documento = construirDocumento(opciones(), MEDIDOR);

    expect(documento.pageSize).toBe("A4");
    expect(documento.pageOrientation).toBe("portrait");
  });

  it("empieza por la portada con el título del cancionero", () => {
    expect(textos(contenidoDe(opciones()))[0]).toBe("Domingo 12 de marzo");
  });

  it("sin portada ni índice arranca directamente con la primera canción", () => {
    const sinAdornos = contenidoDe(
      opciones({ portada: false, indice: false }),
    );

    expect(textos(sinAdornos)[0]).toBe("Canción 1");
  });

  it("cada canción salvo la primera empieza en página nueva", () => {
    const contenido = contenidoDe(opciones({ portada: false, indice: false }));

    const titulos = contenido.filter(
      (nodo): nodo is Content & { text: string; pageBreak?: string } =>
        typeof nodo === "object" &&
        nodo !== null &&
        "text" in nodo &&
        typeof nodo.text === "string" &&
        nodo.text.startsWith("Canción"),
    );

    expect(titulos[0]?.pageBreak).toBeUndefined();
    expect(titulos[1]?.pageBreak).toBe("before");
  });
});

describe("construirDocumento · índice", () => {
  interface Celda {
    readonly text?: string;
    readonly pageReference?: string;
    readonly linkToDestination?: string;
  }

  function filasDelIndice(opcionesDadas = opciones()): Celda[][] {
    const tabla = contenidoDe(opcionesDadas).find(
      (nodo): nodo is ContentTable =>
        typeof nodo === "object" && nodo !== null && "table" in nodo,
    );

    return (tabla?.table.body ?? []).map((fila) => fila as Celda[]);
  }

  it("lista las canciones en el orden elegido", () => {
    expect(filasDelIndice().map((fila) => fila.at(1)?.text)).toEqual([
      "Canción 1",
      "Canción 2",
    ]);
  });

  it("la fila entera salta a su canción al pulsarla", () => {
    const primera = filasDelIndice().at(0) ?? [];

    expect(primera).toHaveLength(4);
    expect(
      primera.every((celda) => celda.linkToDestination === "cancion-1"),
    ).toBe(true);
  });

  it("cada canción es el destino al que apunta su fila", () => {
    const contenido = contenidoDe(opciones());

    const anclas = contenido
      .filter(
        (nodo): nodo is Content & { id?: string } =>
          typeof nodo === "object" && nodo !== null && "id" in nodo,
      )
      .map((nodo) => nodo.id);

    expect(anclas).toEqual(["cancion-1", "cancion-2"]);
  });

  it("el número de página lo resuelve el PDF, no la estimación", () => {
    expect(filasDelIndice().map((fila) => fila.at(3)?.pageReference)).toEqual([
      "cancion-1",
      "cancion-2",
    ]);
  });
});

describe("construirDocumento · contenido de la canción", () => {
  function acordesYLetra(opcionesDadas: OpcionesDelCancionero): string[] {
    return textos(contenidoDe(opcionesDadas)).filter(
      (texto) => texto !== "\u00A0",
    );
  }

  it("pinta la letra con sus acordes anclados", () => {
    const partes = acordesYLetra(
      opciones({ portada: false, indice: false, canciones: [cancion({ id: 1 })] }),
    );

    expect(partes).toContain("SOL");
    expect(partes).toContain("VEN\u00A0A\u00A0CELE");
    expect(partes).toContain("SIm");
    expect(partes).toContain("BRAR");
  });

  it("los espacios del fragmento son duros, para que no se parta una sílaba", () => {
    const partes = acordesYLetra(
      opciones({
        portada: false,
        indice: false,
        canciones: [
          cancion({ id: 1, contenido: "[DO]EMPAPANDO [SOL]NUESTRAS VIDAS" }),
        ],
      }),
    );

    expect(partes).toContain("EMPAPANDO\u00A0");
    expect(partes).toContain("NUESTRAS\u00A0VIDAS");
    expect(partes.join(" ")).not.toContain("EMPAPANDO ");
  });

  it("un acorde con espacios tampoco se parte", () => {
    const partes = acordesYLetra(
      opciones({
        portada: false,
        indice: false,
        canciones: [cancion({ id: 1, contenido: "[FA SOL DO]ALELUYA" })],
      }),
    );

    expect(partes).toContain("FA\u00A0SOL\u00A0DO");
  });

  it("traduce a notación americana si así se pide", () => {
    const partes = acordesYLetra(
      opciones({
        portada: false,
        indice: false,
        notacion: "americana",
        canciones: [cancion({ id: 1 })],
      }),
    );

    expect(partes).toContain("G");
    expect(partes).toContain("Bm");
    expect(partes).not.toContain("SOL");
  });

  it("la página de la canción es el título y la letra, sin más datos", () => {
    const partes = acordesYLetra(
      opciones({
        portada: false,
        indice: false,
        canciones: [cancion({ id: 1, tonoOriginal: "SOL" })],
      }),
    );

    expect(partes).toContain("Canción 1");
    expect(partes).toContain("SOL");
    expect(partes.join(" ")).not.toContain("Tono:");
  });

  it("el tono se sigue viendo en el índice", () => {
    const contenido = contenidoDe(opciones());

    const tabla = contenido.find(
      (nodo): nodo is ContentTable =>
        typeof nodo === "object" && nodo !== null && "table" in nodo,
    );

    const tonos = (tabla?.table.body ?? []).map(
      (fila) => (fila as { text?: string }[]).at(2)?.text,
    );

    expect(tonos).toEqual(["SOL", "SOL"]);
  });

  it("el estribillo va en negrita y la estrofa no", () => {
    const contenido = contenidoDe(
      opciones({
        portada: false,
        indice: false,
        canciones: [
          cancion({ id: 1, contenido: "**[SOL]Estribillo**\n[RE]Estrofa" }),
        ],
      }),
    );

    const lineas = contenido.filter(
      (nodo): nodo is ContentColumns =>
        typeof nodo === "object" && nodo !== null && "columns" in nodo,
    );

    /** ¿Va en negrita la letra de la línea número `orden`? */
    const enNegrita = (orden: number): boolean | undefined => {
      const linea = lineas.at(orden);

      if (linea === undefined) {
        throw new Error(`El documento no tiene la línea ${orden}.`);
      }

      const columna = linea.columns.at(0) as
        | { stack: { bold?: boolean }[] }
        | undefined;

      return columna?.stack.at(1)?.bold;
    };

    expect(enNegrita(0)).toBe(true);
    expect(enNegrita(1)).toBe(false);
  });
});

describe("construirDocumento · pie de página", () => {
  function pieDe(opcionesDadas: OpcionesDelCancionero): string | null {
    const { footer } = construirDocumento(opcionesDadas, MEDIDOR);

    if (typeof footer !== "function") return null;

    const pintado = footer(3, 8, { width: 595, height: 842, orientation: "portrait" });

    return JSON.stringify(pintado);
  }

  it("solo lleva el número de página", () => {
    const pie = pieDe(opciones());

    expect(pie).toContain('"text":"3"');
  });

  it("no menciona la notación usada", () => {
    expect(pieDe(opciones())).not.toContain("Notación");
    expect(pieDe(opciones({ notacion: "americana" }))).not.toContain("Notación");
  });

  it("sin numeración no hay pie ninguno", () => {
    expect(pieDe(opciones({ numeracion: false }))).toBeNull();
  });
});

describe("paginasTotales", () => {
  it("cuenta portada, índice y una página por canción", () => {
    expect(paginasTotales(opciones(), MEDIDOR)).toBe(4);
  });

  it("un cancionero vacío es solo portada e índice", () => {
    expect(paginasTotales(opciones({ canciones: [] }), MEDIDOR)).toBe(2);
  });
});

describe("nombreDelFichero", () => {
  it("usa el título del cancionero y la fecha", () => {
    expect(
      nombreDelFichero("Domingo 12 de marzo", new Date("2026-03-12T10:00:00Z")),
    ).toBe("domingo-12-de-marzo-2026-03-12.pdf");
  });

  it("quita tildes y signos raros", () => {
    expect(nombreDelFichero("Misa · Comunión", new Date("2026-03-12T10:00:00Z"))).toBe(
      "misa-comunion-2026-03-12.pdf",
    );
  });

  it("sin título sigue teniendo un nombre válido", () => {
    expect(nombreDelFichero("   ", new Date("2026-03-12T10:00:00Z"))).toBe(
      "cancionero-2026-03-12.pdf",
    );
  });
});
