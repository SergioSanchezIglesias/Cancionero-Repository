import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { crearCancion, obtenerCancion } from "./repositorio.js";

const FECHA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** Contenido real del cantoral: acordes anclados, negrita y estrofa separada. */
const CONTENIDO = `**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**
**[Mim]CON [Lam]SU [RE]PRESENCIA… [(SOL)]**

[Mim]Os aseguro [SIm]que Yo [FA]estaré cuando
  dos o más por Mí [DO]os reunáis;`;

describe("crearCancion", () => {
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

  describe("campos de la canción", () => {
    it("devuelve la canción creada con su id nuevo", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: CONTENIDO,
        tonoOriginal: "SOL",
      });

      expect(cancion).toEqual({
        id: expect.any(Number),
        titulo: "Ven a celebrar",
        contenido: CONTENIDO,
        tonoOriginal: "SOL",
        notacionPorDefecto: "latina",
        cantoralOrigen: null,
        creadoEn: expect.stringMatching(FECHA),
        editadoEn: expect.stringMatching(FECHA),
        etiquetas: [],
      });
    });

    it("asigna ids distintos a dos canciones", () => {
      const primera = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
      });
      const segunda = crearCancion(bd, {
        titulo: "Alabaré",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(segunda.id).not.toBe(primera.id);
    });

    it("guarda la notación por defecto que se le pida", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
        notacionPorDefecto: "americana",
      });

      expect(cancion.notacionPorDefecto).toBe("americana");
    });

    it("guarda el cantoral de origen cuando se indica", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
        cantoralOrigen: "Cantoral San Ildefonso",
      });

      expect(cancion.cantoralOrigen).toBe("Cantoral San Ildefonso");
    });
  });

  describe("el contenido se persiste literalmente", () => {
    it("preserva los saltos de línea, las líneas en blanco y los espacios iniciales", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: CONTENIDO,
        tonoOriginal: "SOL",
      });

      const guardado = obtenerCancion(bd, cancion.id)?.contenido;

      expect(guardado).toBe(CONTENIDO);
      expect(guardado).toContain("\n\n");
      expect(guardado).toContain("\n  dos o más");
    });

    it("no transpone: los acordes se guardan en el tono original", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELE[SIm]BRAR",
        tonoOriginal: "SOL",
      });

      expect(cancion.contenido).toBe("[SOL]VEN A CELE[SIm]BRAR");
    });

    it("no convierte la notación: los acordes se guardan en latina aunque la canción se vea en americana", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELE[SIm]BRAR",
        tonoOriginal: "SOL",
        notacionPorDefecto: "americana",
      });

      expect(cancion.contenido).toBe("[SOL]VEN A CELE[SIm]BRAR");
      expect(cancion.contenido).not.toContain("[G]");
    });
  });

  describe("etiquetas", () => {
    it("crea una canción sin etiquetas", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
      });

      expect(cancion.etiquetas).toEqual([]);
    });

    it("asigna varias etiquetas a la vez", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [4, 1],
      });

      expect(cancion.etiquetas).toEqual([1, 4]);
    });

    it("devuelve las etiquetas en el orden de la celebración, no en el que llegaron", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [12, 7, 1],
      });

      expect(cancion.etiquetas).toEqual([1, 7, 12]);
    });

    it("ignora una etiqueta repetida en la entrada en vez de reventar", () => {
      const cancion = crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [1, 1, 4],
      });

      expect(cancion.etiquetas).toEqual([1, 4]);
    });

    it("no deja la canción a medias si una etiqueta no existe", () => {
      expect(() =>
        crearCancion(bd, {
          titulo: "Ven a celebrar",
          contenido: "letra",
          tonoOriginal: "SOL",
          etiquetas: [1, 999],
        }),
      ).toThrow();

      // Sin transacción la canción quedaría creada, con la etiqueta 1 puesta
      // y la 999 perdida: una canción fantasma tras un error.
      const total = bd.prepare("SELECT COUNT(*) FROM cancion").pluck().get();

      expect(total).toBe(0);
    });
  });

  describe("búsqueda", () => {
    it("queda indexada en FTS5 al crearse", () => {
      crearCancion(bd, {
        titulo: "Canto de Comunión",
        contenido: "Cuerpo y sangre del Señor",
        tonoOriginal: "SOL",
      });

      const encontrados = bd
        .prepare(
          `SELECT c.titulo FROM cancion_fts f
             JOIN cancion c ON c.id = f.rowid
            WHERE cancion_fts MATCH ?`,
        )
        .pluck()
        .all('"sangre"');

      expect(encontrados).toEqual(["Canto de Comunión"]);
    });
  });
});

describe("obtenerCancion", () => {
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

  it("devuelve la canción completa con sus etiquetas", () => {
    const creada = crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: CONTENIDO,
      tonoOriginal: "SOL",
      cantoralOrigen: "Cantoral San Ildefonso",
      etiquetas: [1, 4],
    });

    expect(obtenerCancion(bd, creada.id)).toEqual(creada);
  });

  it("devuelve null si la canción no existe", () => {
    expect(obtenerCancion(bd, 999)).toBeNull();
  });

  it("devuelve null con un id que no es un número entero válido", () => {
    expect(obtenerCancion(bd, 0)).toBeNull();
    expect(obtenerCancion(bd, -1)).toBeNull();
  });
});
