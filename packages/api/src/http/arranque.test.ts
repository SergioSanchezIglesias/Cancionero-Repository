import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { crearApp } from "./app.js";

describe("GET /api/salud", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;
  let app: Express;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);
    app = crearApp(bd);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("responde que la API está viva", async () => {
    const respuesta = await request(app).get("/api/salud").expect(200);

    expect(respuesta.body).toEqual({ estado: "ok" });
  });

  it("comprueba de verdad que la base de datos responde", async () => {
    bd.close();

    await request(app).get("/api/salud").expect(500);
  });
});

describe("build de Angular", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;
  let carpetaWeb: string;

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);

    carpetaWeb = join(dirname(temporal.ruta), "web");
    mkdirSync(carpetaWeb, { recursive: true });
    writeFileSync(join(carpetaWeb, "index.html"), "<h1>Cancionero</h1>", "utf8");
    writeFileSync(join(carpetaWeb, "main.js"), "console.log(1)", "utf8");
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("sirve los ficheros estáticos del build", async () => {
    const app = crearApp(bd, { carpetaWeb });

    await request(app).get("/main.js").expect(200);
  });

  it("devuelve el index.html en cualquier ruta de la aplicación (SPA)", async () => {
    const app = crearApp(bd, { carpetaWeb });

    const respuesta = await request(app).get("/biblioteca/canciones").expect(200);

    expect(respuesta.text).toContain("Cancionero");
  });

  it("las rutas de la API siguen respondiendo JSON, no el index.html", async () => {
    const app = crearApp(bd, { carpetaWeb });

    const respuesta = await request(app).get("/api/inventada").expect(404);

    expect(respuesta.body.error).toBeTypeOf("string");
  });

  it("sin build de Angular la API funciona igual", async () => {
    const app = crearApp(bd);

    await request(app).get("/api/salud").expect(200);
    await request(app).get("/biblioteca").expect(404);
  });
});
