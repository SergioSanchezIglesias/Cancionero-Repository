import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "./bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "./conexion.js";
import { aplicarMigraciones } from "./migraciones.js";

function insertarCancion(
  bd: BaseDeDatos,
  titulo: string,
  contenido: string,
): number {
  const resultado = bd
    .prepare(
      "INSERT INTO cancion (titulo, contenido, tono_original) VALUES (?, ?, ?)",
    )
    .run(titulo, contenido, "SOL");

  return Number(resultado.lastInsertRowid);
}

/** Busca en el índice FTS5 y devuelve los títulos encontrados. */
function buscarTitulos(bd: BaseDeDatos, expresion: string): unknown[] {
  return bd
    .prepare(
      `SELECT c.titulo
         FROM cancion_fts f
         JOIN cancion c ON c.id = f.rowid
        WHERE cancion_fts MATCH ?
        ORDER BY rank`,
    )
    .pluck()
    .all(expresion);
}

describe("esquema", () => {
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

  describe("tabla cancion", () => {
    it("guarda una canción con sus campos obligatorios", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "**[SOL]VEN A...**");

      const fila = bd
        .prepare("SELECT titulo, tono_original FROM cancion WHERE id = ?")
        .get(id);

      expect(fila).toEqual({ titulo: "Ven a celebrar", tono_original: "SOL" });
    });

    it("usa la notación latina por defecto", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");

      const notacion = bd
        .prepare("SELECT notacion_por_defecto FROM cancion WHERE id = ?")
        .pluck()
        .get(id);

      expect(notacion).toBe("latina");
    });

    it("rechaza una notación que no sea latina o americana", () => {
      expect(() =>
        bd
          .prepare(
            `INSERT INTO cancion (titulo, contenido, tono_original, notacion_por_defecto)
             VALUES (?, ?, ?, ?)`,
          )
          .run("Otra", "letra", "SOL", "tablatura"),
      ).toThrow(/CHECK/i);
    });

    it("rellena las fechas de creación y edición automáticamente", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");

      const fila = bd
        .prepare("SELECT creado_en, editado_en FROM cancion WHERE id = ?")
        .get(id);

      expect(fila).toEqual({
        creado_en: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
        editado_en: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        ),
      });
    });
  });

  describe("catálogo de etiquetas", () => {
    it("carga exactamente las 14 etiquetas del catálogo fijo", () => {
      const total = bd
        .prepare("SELECT COUNT(*) FROM etiqueta")
        .pluck()
        .get();

      expect(total).toBe(14);
    });

    it("reparte las etiquetas en 9 de misa y 5 de adoración y alabanza", () => {
      const porGrupo = bd
        .prepare(
          "SELECT grupo, COUNT(*) AS total FROM etiqueta GROUP BY grupo ORDER BY grupo",
        )
        .all();

      expect(porGrupo).toEqual([
        { grupo: "adoracion_alabanza", total: 5 },
        { grupo: "misa", total: 9 },
      ]);
    });

    it("ordena las etiquetas siguiendo la celebración", () => {
      const nombres = bd
        .prepare("SELECT nombre FROM etiqueta ORDER BY orden")
        .pluck()
        .all();

      expect(nombres).toEqual([
        "Entrada",
        "Señor ten Piedad",
        "Aleluya",
        "Ofertorio",
        "Santo",
        "Cordero",
        "Comunión",
        "Alma de Cristo",
        "Virgen María",
        "Exposición",
        "Invocación ES",
        "Alabanza",
        "Sanación",
        "Adoración",
      ]);
    });

    it("no admite dos etiquetas con el mismo nombre", () => {
      expect(() =>
        bd
          .prepare("INSERT INTO etiqueta (nombre, grupo, orden) VALUES (?, ?, ?)")
          .run("Entrada", "misa", 99),
      ).toThrow(/UNIQUE/i);
    });

    it("no admite dos etiquetas con el mismo orden", () => {
      expect(() =>
        bd
          .prepare("INSERT INTO etiqueta (nombre, grupo, orden) VALUES (?, ?, ?)")
          .run("Inventada", "misa", 1),
      ).toThrow(/UNIQUE/i);
    });

    it("rechaza un grupo que no esté en el catálogo", () => {
      expect(() =>
        bd
          .prepare("INSERT INTO etiqueta (nombre, grupo, orden) VALUES (?, ?, ?)")
          .run("Inventada", "villancicos", 99),
      ).toThrow(/CHECK/i);
    });
  });

  describe("relación canción ↔ etiqueta", () => {
    it("permite asignar varias etiquetas a una canción", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");
      const asignar = bd.prepare(
        "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
      );

      asignar.run(id, 1);
      asignar.run(id, 4);

      const etiquetas = bd
        .prepare(
          "SELECT etiqueta_id FROM cancion_etiqueta WHERE cancion_id = ? ORDER BY etiqueta_id",
        )
        .pluck()
        .all(id);

      expect(etiquetas).toEqual([1, 4]);
    });

    it("no permite asignar dos veces la misma etiqueta a una canción", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");
      const asignar = bd.prepare(
        "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
      );
      asignar.run(id, 1);

      expect(() => asignar.run(id, 1)).toThrow(/UNIQUE|PRIMARY KEY/i);
    });

    it("rechaza asignar una etiqueta que no existe", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");

      expect(() =>
        bd
          .prepare(
            "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
          )
          .run(id, 999),
      ).toThrow(/FOREIGN KEY/i);
    });

    it("al borrar una canción se llevan sus asignaciones (CASCADE)", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");
      bd.prepare(
        "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
      ).run(id, 4);

      bd.prepare("DELETE FROM cancion WHERE id = ?").run(id);

      const total = bd
        .prepare("SELECT COUNT(*) FROM cancion_etiqueta")
        .pluck()
        .get();

      expect(total).toBe(0);
    });

    it("protege el catálogo: no deja borrar una etiqueta en uso (RESTRICT)", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");
      bd.prepare(
        "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
      ).run(id, 4);

      expect(() =>
        bd.prepare("DELETE FROM etiqueta WHERE id = ?").run(4),
      ).toThrow(/FOREIGN KEY/i);
    });
  });

  describe("búsqueda FTS5", () => {
    it("encuentra una canción por su título", () => {
      insertarCancion(bd, "Ven a celebrar", "letra cualquiera");

      expect(buscarTitulos(bd, '"celebrar"')).toEqual(["Ven a celebrar"]);
    });

    it("encuentra una canción por el texto de la letra", () => {
      insertarCancion(bd, "Ven a celebrar", "**[SOL]VEN A CELEBRAR EL AMOR**");

      expect(buscarTitulos(bd, '"amor"')).toEqual(["Ven a celebrar"]);
    });

    it("ignora los acentos: buscar «comunion» encuentra «Comunión»", () => {
      insertarCancion(bd, "Canto de Comunión", "letra");

      expect(buscarTitulos(bd, '"comunion"')).toEqual(["Canto de Comunión"]);
    });

    it("ignora los acentos también al revés: «Maria» encuentra «María»", () => {
      insertarCancion(bd, "Virgen María", "letra");

      expect(buscarTitulos(bd, '"maria"')).toEqual(["Virgen María"]);
    });

    it("no distingue mayúsculas de minúsculas", () => {
      insertarCancion(bd, "Ven a celebrar", "letra");

      expect(buscarTitulos(bd, '"VEN"')).toEqual(["Ven a celebrar"]);
    });

    it("refleja los cambios cuando se edita una canción", () => {
      const id = insertarCancion(bd, "Título viejo", "letra vieja");

      bd.prepare("UPDATE cancion SET titulo = ?, contenido = ? WHERE id = ?").run(
        "Título nuevo",
        "letra nueva",
        id,
      );

      expect(buscarTitulos(bd, '"viejo"')).toEqual([]);
      expect(buscarTitulos(bd, '"nuevo"')).toEqual(["Título nuevo"]);
    });

    it("deja de encontrar una canción borrada", () => {
      const id = insertarCancion(bd, "Ven a celebrar", "letra");

      bd.prepare("DELETE FROM cancion WHERE id = ?").run(id);

      expect(buscarTitulos(bd, '"celebrar"')).toEqual([]);
    });
  });
});
