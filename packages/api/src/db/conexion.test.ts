import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "./bd-temporal.prueba.js";
import {
  abrirBaseDeDatos,
  rutaBaseDeDatosDesdeEntorno,
  type BaseDeDatos,
} from "./conexion.js";

describe("abrirBaseDeDatos", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("activa las claves foráneas", () => {
    expect(bd.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("usa el modo WAL", () => {
    expect(bd.pragma("journal_mode", { simple: true })).toBe("wal");
  });

  it("usa synchronous NORMAL", () => {
    expect(bd.pragma("synchronous", { simple: true })).toBe(1);
  });

  it("activa las claves foráneas en CADA conexión, no solo en la primera", () => {
    const segunda = abrirBaseDeDatos(temporal.ruta);

    expect(segunda.pragma("foreign_keys", { simple: true })).toBe(1);

    segunda.close();
  });

  it("crea la carpeta de destino si todavía no existe", () => {
    const rutaAnidada = join(temporal.ruta, "..", "datos", "app.db");

    const otra = abrirBaseDeDatos(rutaAnidada);

    expect(existsSync(rutaAnidada)).toBe(true);

    otra.close();
  });
});

describe("rutaBaseDeDatosDesdeEntorno", () => {
  const original = process.env["DB_PATH"];

  afterEach(() => {
    if (original === undefined) delete process.env["DB_PATH"];
    else process.env["DB_PATH"] = original;
  });

  it("devuelve la ruta configurada en DB_PATH", () => {
    process.env["DB_PATH"] = "/datos/cancionero.db";

    expect(rutaBaseDeDatosDesdeEntorno()).toBe("/datos/cancionero.db");
  });

  it("falla si DB_PATH no está definida", () => {
    delete process.env["DB_PATH"];

    expect(() => rutaBaseDeDatosDesdeEntorno()).toThrow(/DB_PATH/);
  });

  it("falla si DB_PATH está vacía", () => {
    process.env["DB_PATH"] = "   ";

    expect(() => rutaBaseDeDatosDesdeEntorno()).toThrow(/DB_PATH/);
  });
});
