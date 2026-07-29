import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { actualizarCancion, crearCancion } from "../canciones/repositorio.js";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { leerEstadoRespaldo, registrarCopia } from "./estado.js";

function unaCancion(bd: BaseDeDatos, titulo = "Ven a celebrar"): number {
  return crearCancion(bd, {
    titulo,
    contenido: "[SOL]VEN A CELEBRAR",
    tonoOriginal: "SOL",
  }).id;
}

/** Retrasa lo ya guardado para simular que ocurrió antes, sin esperar en el test. */
function envejecer(bd: BaseDeDatos, dias: number): void {
  bd.prepare(
    `UPDATE cancion SET creado_en = datetime(creado_en, ?),
                        editado_en = datetime(editado_en, ?)`,
  ).run(`-${dias} days`, `-${dias} days`);

  bd.prepare(`UPDATE ajuste SET valor = datetime(valor, ?)`).run(`-${dias} days`);
}

describe("estado del respaldo", () => {
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

  describe("cuando nunca se ha hecho una copia", () => {
    it("no hay fecha de última copia", () => {
      expect(leerEstadoRespaldo(bd).ultimaCopia).toBeNull();
    });

    it("con la biblioteca vacía no avisa: no hay nada que perder", () => {
      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(false);
    });

    it("con canciones dentro avisa de que están sin respaldar", () => {
      unaCancion(bd);

      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(true);
    });
  });

  describe("después de registrar una copia", () => {
    it("devuelve la fecha en formato ISO con zona UTC", () => {
      registrarCopia(bd);

      expect(leerEstadoRespaldo(bd).ultimaCopia).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
      );
    });

    it("no avisa: la copia está al día", () => {
      unaCancion(bd);
      registrarCopia(bd);

      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(false);
    });

    it("vuelve a avisar si se añade una canción nueva", () => {
      unaCancion(bd);
      registrarCopia(bd);
      envejecer(bd, 1);

      unaCancion(bd, "Pan de vida");

      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(true);
    });

    it("vuelve a avisar si se edita una canción existente", () => {
      const id = unaCancion(bd);
      registrarCopia(bd);
      envejecer(bd, 1);

      actualizarCancion(bd, id, {
        titulo: "Ven a celebrar",
        contenido: "[LA]VEN A CELEBRAR",
        tonoOriginal: "LA",
      });

      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(true);
    });

    it("una copia nueva silencia el aviso", () => {
      unaCancion(bd);
      registrarCopia(bd);
      envejecer(bd, 1);
      unaCancion(bd, "Pan de vida");

      registrarCopia(bd);

      expect(leerEstadoRespaldo(bd).hayCambiosSinRespaldar).toBe(false);
    });

    it("registrar otra vez sustituye la fecha, no acumula filas", () => {
      registrarCopia(bd);
      registrarCopia(bd);

      const filas = bd
        .prepare("SELECT COUNT(*) FROM ajuste WHERE clave = 'ultima_copia'")
        .pluck()
        .get();

      expect(filas).toBe(1);
    });
  });

  it("informa de cuántas canciones tiene la biblioteca", () => {
    unaCancion(bd);
    unaCancion(bd, "Pan de vida");

    expect(leerEstadoRespaldo(bd).canciones).toBe(2);
  });
});
