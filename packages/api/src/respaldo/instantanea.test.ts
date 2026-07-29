import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearCancion } from "../canciones/repositorio.js";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { crearInstantanea, crearInstantaneaTemporal } from "./instantanea.js";

describe("instantánea de la base de datos", () => {
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

  describe("crearInstantanea", () => {
    it("escribe un fichero en la ruta indicada", () => {
      const destino = join(dirname(temporal.ruta), "copia.db");

      crearInstantanea(bd, destino);

      expect(existsSync(destino)).toBe(true);
    });

    it("la copia conserva las canciones con sus etiquetas", () => {
      crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELEBRAR",
        tonoOriginal: "SOL",
        etiquetas: [1],
      });

      const destino = join(dirname(temporal.ruta), "copia.db");
      crearInstantanea(bd, destino);

      const copia = abrirBaseDeDatos(destino);

      try {
        expect(
          copia.prepare("SELECT titulo FROM cancion").pluck().get(),
        ).toBe("Ven a celebrar");
        expect(
          copia.prepare("SELECT etiqueta_id FROM cancion_etiqueta").pluck().get(),
        ).toBe(1);
      } finally {
        copia.close();
      }
    });

    it("la copia conserva el catálogo de las 14 etiquetas", () => {
      const destino = join(dirname(temporal.ruta), "copia.db");

      crearInstantanea(bd, destino);

      const copia = abrirBaseDeDatos(destino);

      try {
        expect(
          copia.prepare("SELECT COUNT(*) FROM etiqueta").pluck().get(),
        ).toBe(14);
      } finally {
        copia.close();
      }
    });

    it("la copia mantiene la búsqueda por texto funcionando", () => {
      crearCancion(bd, {
        titulo: "Comunión",
        contenido: "Pan de vida",
        tonoOriginal: "RE",
      });

      const destino = join(dirname(temporal.ruta), "copia.db");
      crearInstantanea(bd, destino);

      const copia = abrirBaseDeDatos(destino);

      try {
        expect(
          copia
            .prepare("SELECT titulo FROM cancion_fts WHERE cancion_fts MATCH ?")
            .pluck()
            .get("comunion"),
        ).toBe("Comunión");
      } finally {
        copia.close();
      }
    });

    it("se hace en caliente: la base original sigue usándose después", () => {
      const destino = join(dirname(temporal.ruta), "copia.db");

      crearInstantanea(bd, destino);

      expect(() =>
        crearCancion(bd, {
          titulo: "Después de la copia",
          contenido: "letra",
          tonoOriginal: "SOL",
        }),
      ).not.toThrow();
    });

    it("no sobrescribe un fichero que ya existe", () => {
      const destino = join(dirname(temporal.ruta), "copia.db");

      crearInstantanea(bd, destino);

      expect(() => crearInstantanea(bd, destino)).toThrow();
    });
  });

  describe("crearInstantaneaTemporal", () => {
    it("devuelve la ruta de un fichero recién creado", () => {
      const instantanea = crearInstantaneaTemporal(bd);

      try {
        expect(existsSync(instantanea.ruta)).toBe(true);
      } finally {
        instantanea.limpiar();
      }
    });

    it("limpiar borra el fichero y su carpeta", () => {
      const instantanea = crearInstantaneaTemporal(bd);

      instantanea.limpiar();

      expect(existsSync(instantanea.ruta)).toBe(false);
      expect(existsSync(dirname(instantanea.ruta))).toBe(false);
    });

    it("limpiar dos veces no falla", () => {
      const instantanea = crearInstantaneaTemporal(bd);

      instantanea.limpiar();

      expect(() => instantanea.limpiar()).not.toThrow();
    });

    it("dos instantáneas seguidas no chocan entre sí", () => {
      const primera = crearInstantaneaTemporal(bd);
      const segunda = crearInstantaneaTemporal(bd);

      try {
        expect(primera.ruta).not.toBe(segunda.ruta);
      } finally {
        primera.limpiar();
        segunda.limpiar();
      }
    });
  });
});
