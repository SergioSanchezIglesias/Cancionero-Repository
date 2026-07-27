import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearCancion, listarCanciones } from "../canciones/repositorio.js";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import {
  exportarBiblioteca,
  importarRespaldo,
  VERSION_RESPALDO,
  type Respaldo,
} from "./repositorio.js";

const ENTRADA = 1;
const COMUNION = 7;
const ALABANZA = 12;

const CONTENIDO = `**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**

  [Mim]Os aseguro [SIm]que Yo estaré  `;

describe("exportarBiblioteca", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("de una biblioteca vacía devuelve un documento sin canciones", () => {
    expect(exportarBiblioteca(bd)).toEqual({
      version: VERSION_RESPALDO,
      generadoEn: expect.any(String),
      canciones: [],
    });
  });

  it("marca la versión del formato para poder migrarlo en el futuro", () => {
    expect(exportarBiblioteca(bd).version).toBe(1);
  });

  it("incluye todos los campos de la canción", () => {
    crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: CONTENIDO,
      tonoOriginal: "SOL",
      notacionPorDefecto: "americana",
      cantoralOrigen: "Cantoral San Ildefonso",
      etiquetas: [ENTRADA, ALABANZA],
    });

    expect(exportarBiblioteca(bd).canciones).toEqual([
      {
        titulo: "Ven a celebrar",
        contenido: CONTENIDO,
        tonoOriginal: "SOL",
        notacionPorDefecto: "americana",
        cantoralOrigen: "Cantoral San Ildefonso",
        etiquetas: ["Entrada", "Alabanza"],
        creadoEn: expect.any(String),
        editadoEn: expect.any(String),
      },
    ]);
  });

  it("guarda las etiquetas por su nombre, no por su id interno", () => {
    crearCancion(bd, {
      titulo: "Pan de vida",
      contenido: "letra",
      tonoOriginal: "RE",
      etiquetas: [COMUNION],
    });

    expect(exportarBiblioteca(bd).canciones[0]?.etiquetas).toEqual(["Comunión"]);
  });

  it("no incluye los ids internos de las canciones", () => {
    crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: "letra",
      tonoOriginal: "SOL",
    });

    expect(exportarBiblioteca(bd).canciones[0]).not.toHaveProperty("id");
  });

  it("ordena las canciones por título para que el fichero sea legible", () => {
    crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: "letra",
      tonoOriginal: "SOL",
    });
    crearCancion(bd, {
      titulo: "Ángel de Dios",
      contenido: "letra",
      tonoOriginal: "MI",
    });
    crearCancion(bd, {
      titulo: "Alabaré",
      contenido: "letra",
      tonoOriginal: "LA",
    });

    expect(exportarBiblioteca(bd).canciones.map((c) => c.titulo)).toEqual([
      "Alabaré",
      "Ángel de Dios",
      "Ven a celebrar",
    ]);
  });

  it("preserva el contenido con sus espacios y saltos de línea", () => {
    crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: CONTENIDO,
      tonoOriginal: "SOL",
    });

    expect(exportarBiblioteca(bd).canciones[0]?.contenido).toBe(CONTENIDO);
  });

  it("no guarda contenido transpuesto ni en americana", () => {
    crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: "[SOL]VEN A CELE[SIm]BRAR",
      tonoOriginal: "SOL",
      notacionPorDefecto: "americana",
    });

    expect(exportarBiblioteca(bd).canciones[0]?.contenido).toBe(
      "[SOL]VEN A CELE[SIm]BRAR",
    );
  });
});

describe("importarRespaldo", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  function respaldoCon(canciones: Respaldo["canciones"]): Respaldo {
    return {
      version: VERSION_RESPALDO,
      generadoEn: "2026-03-12T10:00:00.000Z",
      canciones,
    };
  }

  const UNA_CANCION = respaldoCon([
    {
      titulo: "Ven a celebrar",
      contenido: CONTENIDO,
      tonoOriginal: "SOL",
      notacionPorDefecto: "latina",
      cantoralOrigen: "Cantoral San Ildefonso",
      etiquetas: ["Entrada", "Alabanza"],
      creadoEn: "2020-01-01 08:00:00",
      editadoEn: "2021-02-02 09:00:00",
    },
  ]);

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("devuelve cuántas canciones ha importado", () => {
    expect(importarRespaldo(bd, UNA_CANCION)).toBe(1);
  });

  it("deja las canciones en la biblioteca", () => {
    importarRespaldo(bd, UNA_CANCION);

    expect(listarCanciones(bd).map((c) => c.titulo)).toEqual([
      "Ven a celebrar",
    ]);
  });

  it("resuelve las etiquetas por su nombre", () => {
    importarRespaldo(bd, UNA_CANCION);

    expect(listarCanciones(bd)[0]?.etiquetas).toEqual([ENTRADA, ALABANZA]);
  });

  it("conserva las fechas originales de la canción", () => {
    importarRespaldo(bd, UNA_CANCION);

    const exportado = exportarBiblioteca(bd).canciones[0];

    expect(exportado?.creadoEn).toBe("2020-01-01 08:00:00");
    expect(exportado?.editadoEn).toBe("2021-02-02 09:00:00");
  });

  it("pone la fecha actual si el fichero no la trae", () => {
    importarRespaldo(
      bd,
      respaldoCon([
        {
          titulo: "Canción escrita a mano",
          contenido: "[SOL]letra",
          tonoOriginal: "SOL",
        },
      ]),
    );

    expect(exportarBiblioteca(bd).canciones[0]?.creadoEn).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    );
  });

  it("aplica los valores por defecto de los campos que no vienen", () => {
    importarRespaldo(
      bd,
      respaldoCon([
        {
          titulo: "Canción escrita a mano",
          contenido: "[SOL]letra",
          tonoOriginal: "SOL",
        },
      ]),
    );

    const importada = exportarBiblioteca(bd).canciones[0];

    expect(importada?.notacionPorDefecto).toBe("latina");
    expect(importada?.cantoralOrigen).toBeNull();
    expect(importada?.etiquetas).toEqual([]);
  });

  it("reemplaza la biblioteca: restaurar un respaldo no duplica el repertorio", () => {
    crearCancion(bd, {
      titulo: "Canción que ya estaba",
      contenido: "letra",
      tonoOriginal: "RE",
      etiquetas: [COMUNION],
    });

    importarRespaldo(bd, UNA_CANCION);

    expect(listarCanciones(bd).map((c) => c.titulo)).toEqual([
      "Ven a celebrar",
    ]);
  });

  it("no deja asignaciones huérfanas de la biblioteca anterior", () => {
    crearCancion(bd, {
      titulo: "Canción que ya estaba",
      contenido: "letra",
      tonoOriginal: "RE",
      etiquetas: [COMUNION],
    });

    importarRespaldo(bd, respaldoCon([]));

    const total = bd
      .prepare("SELECT COUNT(*) FROM cancion_etiqueta")
      .pluck()
      .get();

    expect(total).toBe(0);
  });

  it("nunca borra el catálogo fijo de etiquetas", () => {
    importarRespaldo(bd, UNA_CANCION);

    const total = bd.prepare("SELECT COUNT(*) FROM etiqueta").pluck().get();

    expect(total).toBe(14);
  });

  it("deja la búsqueda funcionando sobre lo importado", () => {
    importarRespaldo(bd, UNA_CANCION);

    expect(listarCanciones(bd, { buscar: "aseguro" })).toHaveLength(1);
  });

  it("no encuentra en la búsqueda lo que se ha reemplazado", () => {
    crearCancion(bd, {
      titulo: "Canción que ya estaba",
      contenido: "letra antigua",
      tonoOriginal: "RE",
    });

    importarRespaldo(bd, UNA_CANCION);

    expect(listarCanciones(bd, { buscar: "antigua" })).toEqual([]);
  });

  it("importa varias canciones de una vez", () => {
    const cargadas = importarRespaldo(
      bd,
      respaldoCon([
        { titulo: "Una", contenido: "letra", tonoOriginal: "SOL" },
        { titulo: "Dos", contenido: "letra", tonoOriginal: "RE" },
        { titulo: "Tres", contenido: "letra", tonoOriginal: "LA" },
      ]),
    );

    expect(cargadas).toBe(3);
    expect(listarCanciones(bd)).toHaveLength(3);
  });

  describe("atomicidad", () => {
    it("no importa nada si una etiqueta no existe en el catálogo", () => {
      expect(() =>
        importarRespaldo(
          bd,
          respaldoCon([
            { titulo: "Una", contenido: "letra", tonoOriginal: "SOL" },
            {
              titulo: "Dos",
              contenido: "letra",
              tonoOriginal: "RE",
              etiquetas: ["Etiqueta inventada"],
            },
          ]),
        ),
      ).toThrow(/Etiqueta inventada/);

      expect(listarCanciones(bd)).toEqual([]);
    });

    it("no destruye la biblioteca existente si la importación falla", () => {
      crearCancion(bd, {
        titulo: "Canción que ya estaba",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(() =>
        importarRespaldo(
          bd,
          respaldoCon([
            {
              titulo: "Dos",
              contenido: "letra",
              tonoOriginal: "RE",
              etiquetas: ["Etiqueta inventada"],
            },
          ]),
        ),
      ).toThrow();

      // El DELETE previo tiene que haberse deshecho con la transacción.
      expect(listarCanciones(bd).map((c) => c.titulo)).toEqual([
        "Canción que ya estaba",
      ]);
    });
  });

  describe("ida y vuelta", () => {
    it("exportar, importar y volver a exportar devuelve el mismo documento", () => {
      crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: CONTENIDO,
        tonoOriginal: "SOL",
        cantoralOrigen: "Cantoral San Ildefonso",
        etiquetas: [ENTRADA, ALABANZA],
      });
      crearCancion(bd, {
        titulo: "Pan de vida",
        contenido: "Cuerpo y sangre del Señor",
        tonoOriginal: "RE",
        notacionPorDefecto: "americana",
        etiquetas: [COMUNION],
      });

      const primero = exportarBiblioteca(bd);
      importarRespaldo(bd, primero);
      const segundo = exportarBiblioteca(bd);

      expect(segundo.canciones).toEqual(primero.canciones);
    });
  });
});
