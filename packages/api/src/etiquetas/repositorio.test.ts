import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { listarEtiquetas } from "./repositorio.js";

describe("listarEtiquetas", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  /** Inserta una canción directamente en SQL y devuelve su id. */
  function insertarCancion(titulo: string): number {
    const resultado = bd
      .prepare(
        "INSERT INTO cancion (titulo, contenido, tono_original) VALUES (?, ?, ?)",
      )
      .run(titulo, "letra", "SOL");

    return Number(resultado.lastInsertRowid);
  }

  function asignarEtiqueta(cancionId: number, etiquetaId: number): void {
    bd.prepare(
      "INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)",
    ).run(cancionId, etiquetaId);
  }

  function buscarPorNombre(nombre: string) {
    return listarEtiquetas(bd).find((etiqueta) => etiqueta.nombre === nombre);
  }

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  describe("catálogo", () => {
    it("devuelve las 14 etiquetas del catálogo fijo", () => {
      expect(listarEtiquetas(bd)).toHaveLength(14);
    });

    it("las devuelve en el orden de la celebración, no por nombre", () => {
      const nombres = listarEtiquetas(bd).map((etiqueta) => etiqueta.nombre);

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

    it("devuelve cada etiqueta con id, nombre, grupo, orden y total", () => {
      const primera = listarEtiquetas(bd)[0];

      expect(primera).toEqual({
        id: 1,
        nombre: "Entrada",
        grupo: "misa",
        orden: 1,
        total: 0,
      });
    });

    it("distingue los dos grupos del catálogo para poder agrupar los filtros", () => {
      const etiquetas = listarEtiquetas(bd);

      const misa = etiquetas.filter((etiqueta) => etiqueta.grupo === "misa");
      const adoracion = etiquetas.filter(
        (etiqueta) => etiqueta.grupo === "adoracion_alabanza",
      );

      expect(misa).toHaveLength(9);
      expect(adoracion).toHaveLength(5);
    });
  });

  describe("contador de canciones", () => {
    it("cuenta cero en una biblioteca vacía", () => {
      const totales = listarEtiquetas(bd).map((etiqueta) => etiqueta.total);

      expect(totales).toEqual(Array<number>(14).fill(0));
    });

    it("cuenta las canciones asignadas a cada etiqueta", () => {
      asignarEtiqueta(insertarCancion("Ven a celebrar"), 1);
      asignarEtiqueta(insertarCancion("Alabaré"), 1);
      asignarEtiqueta(insertarCancion("Pan de vida"), 7);

      expect(buscarPorNombre("Entrada")?.total).toBe(2);
      expect(buscarPorNombre("Comunión")?.total).toBe(1);
      expect(buscarPorNombre("Santo")?.total).toBe(0);
    });

    it("una canción con varias etiquetas suma en todas ellas", () => {
      const cancionId = insertarCancion("Ven a celebrar");
      asignarEtiqueta(cancionId, 1);
      asignarEtiqueta(cancionId, 4);

      expect(buscarPorNombre("Entrada")?.total).toBe(1);
      expect(buscarPorNombre("Ofertorio")?.total).toBe(1);
    });

    it("sigue devolviendo las 14 etiquetas aunque casi ninguna se use", () => {
      asignarEtiqueta(insertarCancion("Ven a celebrar"), 1);

      // Un JOIN normal se comería las etiquetas sin canciones: los chips vacíos
      // son justo los que avisan de dónde falta repertorio.
      expect(listarEtiquetas(bd)).toHaveLength(14);
    });

    it("baja el contador al borrar una canción", () => {
      const cancionId = insertarCancion("Ven a celebrar");
      asignarEtiqueta(cancionId, 1);

      bd.prepare("DELETE FROM cancion WHERE id = ?").run(cancionId);

      expect(buscarPorNombre("Entrada")?.total).toBe(0);
    });
  });
});
