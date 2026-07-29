import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "./bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "./conexion.js";
import { aplicarMigraciones } from "./migraciones.js";

/** Escribe una carpeta de migraciones falsas para probar el runner aislado. */
function crearCarpetaDeMigraciones(
  base: string,
  ficheros: Record<string, string>,
): string {
  const carpeta = join(base, "migraciones-de-prueba");
  mkdirSync(carpeta, { recursive: true });

  for (const [nombre, sql] of Object.entries(ficheros)) {
    writeFileSync(join(carpeta, nombre), sql, "utf8");
  }

  return carpeta;
}

function contar(bd: BaseDeDatos, sql: string): unknown {
  return bd.prepare(sql).pluck().get();
}

function existeTabla(bd: BaseDeDatos, nombre: string): boolean {
  const fila = bd
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(nombre);

  return fila !== undefined;
}

describe("aplicarMigraciones", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;
  let base: string;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    base = dirname(temporal.ruta);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("aplica las migraciones en orden y devuelve los nombres aplicados", () => {
    // A propósito se escribe la 002 antes que la 001: si el runner no ordena,
    // el INSERT se ejecutará antes que el CREATE TABLE y reventará.
    const carpeta = crearCarpetaDeMigraciones(base, {
      "002_insertar.sql": "INSERT INTO nota (texto) VALUES ('hola');",
      "001_crear.sql": "CREATE TABLE nota (texto TEXT NOT NULL);",
    });

    const aplicadas = aplicarMigraciones(bd, carpeta);

    expect(aplicadas).toEqual(["001_crear.sql", "002_insertar.sql"]);
    expect(contar(bd, "SELECT COUNT(*) FROM nota")).toBe(1);
  });

  it("no vuelve a aplicar una migración ya aplicada", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_crear.sql": "CREATE TABLE nota (texto TEXT NOT NULL);",
      "002_insertar.sql": "INSERT INTO nota (texto) VALUES ('hola');",
    });

    aplicarMigraciones(bd, carpeta);
    const segundaPasada = aplicarMigraciones(bd, carpeta);

    expect(segundaPasada).toEqual([]);
    expect(contar(bd, "SELECT COUNT(*) FROM nota")).toBe(1);
  });

  it("aplica solo las migraciones nuevas cuando se añade una posterior", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_crear.sql": "CREATE TABLE nota (texto TEXT NOT NULL);",
    });
    aplicarMigraciones(bd, carpeta);

    writeFileSync(
      join(carpeta, "002_insertar.sql"),
      "INSERT INTO nota (texto) VALUES ('hola');",
      "utf8",
    );

    expect(aplicarMigraciones(bd, carpeta)).toEqual(["002_insertar.sql"]);
  });

  it("ignora los ficheros que no terminan en .sql", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_crear.sql": "CREATE TABLE nota (texto TEXT NOT NULL);",
      "LEEME.md": "esto no es una migración",
      "002_borrador.sql.bak": "DROP TABLE nota;",
    });

    expect(aplicarMigraciones(bd, carpeta)).toEqual(["001_crear.sql"]);
    expect(existeTabla(bd, "nota")).toBe(true);
  });

  it("recuerda las migraciones aplicadas entre reinicios", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_crear.sql": "CREATE TABLE nota (texto TEXT NOT NULL);",
    });
    aplicarMigraciones(bd, carpeta);
    bd.close();

    bd = abrirBaseDeDatos(temporal.ruta);

    expect(aplicarMigraciones(bd, carpeta)).toEqual([]);
  });

  it("devuelve una lista vacía si no hay migraciones que aplicar", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {});

    expect(aplicarMigraciones(bd, carpeta)).toEqual([]);
  });

  it("rechaza una migración vacía en vez de darla por aplicada", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_vacia.sql": "   \n  ",
    });

    // Sin esta protección quedaría registrada, y si mañana se escribe el SQL
    // dentro ya nunca se aplicaría.
    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_vacia\.sql/);
    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_vacia\.sql/);
  });

  it("indica qué migración ha fallado", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_rota.sql": "ESTO NO ES SQL VÁLIDO;",
    });

    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_rota\.sql/);
  });

  it("no deja cambios a medias si una migración falla", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_rota.sql":
        "CREATE TABLE nota (texto TEXT NOT NULL);\nESTO NO ES SQL VÁLIDO;",
    });

    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_rota\.sql/);
    expect(existeTabla(bd, "nota")).toBe(false);
  });

  it("no marca como aplicada una migración que ha fallado", () => {
    const carpeta = crearCarpetaDeMigraciones(base, {
      "001_rota.sql": "ESTO NO ES SQL VÁLIDO;",
    });

    // Si la hubiera registrado, la segunda llamada la saltaría y no fallaría.
    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_rota\.sql/);
    expect(() => aplicarMigraciones(bd, carpeta)).toThrow(/001_rota\.sql/);
  });

  it("sin carpeta explícita aplica las migraciones reales del proyecto", () => {
    const aplicadas = aplicarMigraciones(bd);

    expect(aplicadas).toEqual([
      "001_esquema_inicial.sql",
      "002_semilla_etiquetas.sql",
      "003_busqueda_fts5.sql",
      "004_ajustes.sql",
    ]);
  });
});
