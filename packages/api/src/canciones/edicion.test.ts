import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import {
  actualizarCancion,
  borrarCancion,
  crearCancion,
  obtenerCancion,
  type Cancion,
} from "./repositorio.js";

const ENTRADA = 1;
const OFERTORIO = 4;
const COMUNION = 7;

const PASADO = "2020-01-01 00:00:00";

describe("actualizarCancion", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;
  let original: Cancion;

  function contarCanciones(): unknown {
    return bd.prepare("SELECT COUNT(*) FROM cancion").pluck().get();
  }

  function buscarTitulos(expresion: string): unknown[] {
    return bd
      .prepare(
        `SELECT c.titulo FROM cancion_fts f
           JOIN cancion c ON c.id = f.rowid
          WHERE cancion_fts MATCH ?`,
      )
      .pluck()
      .all(expresion);
  }

  /** Envejece las fechas para poder comprobar cuál de las dos se toca. */
  function envejecer(id: number): void {
    bd.prepare(
      "UPDATE cancion SET creado_en = ?, editado_en = ? WHERE id = ?",
    ).run(PASADO, PASADO, id);
  }

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);

    original = crearCancion(bd, {
      titulo: "Título viejo",
      contenido: "[SOL]letra vieja",
      tonoOriginal: "SOL",
      cantoralOrigen: "Cantoral viejo",
      etiquetas: [ENTRADA, OFERTORIO],
    });
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  describe("campos", () => {
    it("devuelve la canción con los campos nuevos", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "[RE]letra nueva",
        tonoOriginal: "RE",
        notacionPorDefecto: "americana",
        cantoralOrigen: "Cantoral nuevo",
        etiquetas: [COMUNION],
      });

      expect(actualizada).toEqual({
        id: original.id,
        titulo: "Título nuevo",
        contenido: "[RE]letra nueva",
        tonoOriginal: "RE",
        notacionPorDefecto: "americana",
        cantoralOrigen: "Cantoral nuevo",
        creadoEn: original.creadoEn,
        editadoEn: expect.any(String),
        etiquetas: [COMUNION],
      });
    });

    it("persiste los cambios, no solo los devuelve", () => {
      actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "[RE]letra nueva",
        tonoOriginal: "RE",
      });

      expect(obtenerCancion(bd, original.id)?.titulo).toBe("Título nuevo");
    });

    it("edita la canción existente en vez de crear otra", () => {
      actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(contarCanciones()).toBe(1);
    });

    it("vuelve a los valores por defecto si no se envían", () => {
      // PUT reemplaza la canción entera: lo que no viene, se queda como al crear.
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(actualizada?.notacionPorDefecto).toBe("latina");
      expect(actualizada?.cantoralOrigen).toBeNull();
    });

    it("no transpone ni convierte la notación del contenido", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELE[SIm]BRAR",
        tonoOriginal: "SOL",
        notacionPorDefecto: "americana",
      });

      expect(actualizada?.contenido).toBe("[SOL]VEN A CELE[SIm]BRAR");
    });
  });

  describe("fechas", () => {
    it("actualiza editadoEn", () => {
      envejecer(original.id);

      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(actualizada?.editadoEn).not.toBe(PASADO);
    });

    it("no toca creadoEn", () => {
      envejecer(original.id);

      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título nuevo",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(actualizada?.creadoEn).toBe(PASADO);
    });
  });

  describe("etiquetas", () => {
    it("reemplaza las etiquetas en vez de acumularlas", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título viejo",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [COMUNION],
      });

      expect(actualizada?.etiquetas).toEqual([COMUNION]);
    });

    it("permite quitar todas las etiquetas", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título viejo",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [],
      });

      expect(actualizada?.etiquetas).toEqual([]);
    });

    it("quita las etiquetas si no se envía la lista", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título viejo",
        contenido: "letra",
        tonoOriginal: "SOL",
      });

      expect(actualizada?.etiquetas).toEqual([]);
    });

    it("no deja rastro en la tabla intermedia al quitarlas", () => {
      actualizarCancion(bd, original.id, {
        titulo: "Título viejo",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [],
      });

      const total = bd
        .prepare("SELECT COUNT(*) FROM cancion_etiqueta")
        .pluck()
        .get();

      expect(total).toBe(0);
    });

    it("ignora una etiqueta repetida en la entrada", () => {
      const actualizada = actualizarCancion(bd, original.id, {
        titulo: "Título viejo",
        contenido: "letra",
        tonoOriginal: "SOL",
        etiquetas: [COMUNION, COMUNION],
      });

      expect(actualizada?.etiquetas).toEqual([COMUNION]);
    });
  });

  describe("canción inexistente", () => {
    it("devuelve null", () => {
      expect(
        actualizarCancion(bd, 999, {
          titulo: "Título nuevo",
          contenido: "letra",
          tonoOriginal: "RE",
        }),
      ).toBeNull();
    });

    it("no crea nada por el camino", () => {
      actualizarCancion(bd, 999, {
        titulo: "Título nuevo",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      expect(contarCanciones()).toBe(1);
    });
  });

  describe("atomicidad", () => {
    it("no cambia nada si una de las etiquetas no existe", () => {
      expect(() =>
        actualizarCancion(bd, original.id, {
          titulo: "Título nuevo",
          contenido: "letra nueva",
          tonoOriginal: "RE",
          etiquetas: [COMUNION, 999],
        }),
      ).toThrow();

      // Ni el título ni las etiquetas anteriores deben haberse movido.
      expect(obtenerCancion(bd, original.id)).toEqual(original);
    });
  });

  describe("búsqueda", () => {
    it("deja de encontrarse por el texto viejo y se encuentra por el nuevo", () => {
      actualizarCancion(bd, original.id, {
        titulo: "Canto de Comunión",
        contenido: "Cuerpo y sangre",
        tonoOriginal: "RE",
      });

      expect(buscarTitulos('"viejo"')).toEqual([]);
      expect(buscarTitulos('"sangre"')).toEqual(["Canto de Comunión"]);
    });
  });
});

describe("borrarCancion", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;
  let cancion: Cancion;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);

    cancion = crearCancion(bd, {
      titulo: "Ven a celebrar",
      contenido: "letra",
      tonoOriginal: "SOL",
      etiquetas: [ENTRADA, OFERTORIO],
    });
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("devuelve true al borrar una canción existente", () => {
    expect(borrarCancion(bd, cancion.id)).toBe(true);
  });

  it("la canción deja de existir", () => {
    borrarCancion(bd, cancion.id);

    expect(obtenerCancion(bd, cancion.id)).toBeNull();
  });

  it("se lleva sus asignaciones de etiquetas", () => {
    borrarCancion(bd, cancion.id);

    const total = bd
      .prepare("SELECT COUNT(*) FROM cancion_etiqueta")
      .pluck()
      .get();

    expect(total).toBe(0);
  });

  it("no borra las etiquetas del catálogo fijo", () => {
    borrarCancion(bd, cancion.id);

    const total = bd.prepare("SELECT COUNT(*) FROM etiqueta").pluck().get();

    expect(total).toBe(14);
  });

  it("deja de encontrarse en la búsqueda", () => {
    borrarCancion(bd, cancion.id);

    const encontrados = bd
      .prepare(
        `SELECT c.titulo FROM cancion_fts f
           JOIN cancion c ON c.id = f.rowid
          WHERE cancion_fts MATCH ?`,
      )
      .pluck()
      .all('"celebrar"');

    expect(encontrados).toEqual([]);
  });

  it("devuelve false si la canción no existe", () => {
    expect(borrarCancion(bd, 999)).toBe(false);
  });

  it("devuelve false al borrarla dos veces", () => {
    borrarCancion(bd, cancion.id);

    expect(borrarCancion(bd, cancion.id)).toBe(false);
  });

  it("no afecta a las demás canciones", () => {
    const otra = crearCancion(bd, {
      titulo: "Pan de vida",
      contenido: "letra",
      tonoOriginal: "RE",
      etiquetas: [COMUNION],
    });

    borrarCancion(bd, cancion.id);

    expect(obtenerCancion(bd, otra.id)).toEqual(otra);
  });
});
