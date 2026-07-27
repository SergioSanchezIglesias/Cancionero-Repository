import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { crearCancion } from "../canciones/repositorio.js";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import { crearApp } from "./app.js";

const ENTRADA = 1;
const COMUNION = 7;

describe("respaldo por HTTP", () => {
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

  describe("GET /api/respaldo", () => {
    it("devuelve el documento con versión, fecha y canciones", async () => {
      crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELEBRAR",
        tonoOriginal: "SOL",
        etiquetas: [ENTRADA],
      });

      const respuesta = await request(app).get("/api/respaldo").expect(200);

      expect(respuesta.body).toEqual({
        version: 1,
        generadoEn: expect.any(String),
        canciones: [
          {
            titulo: "Ven a celebrar",
            contenido: "[SOL]VEN A CELEBRAR",
            tonoOriginal: "SOL",
            notacionPorDefecto: "latina",
            cantoralOrigen: null,
            etiquetas: ["Entrada"],
            creadoEn: expect.any(String),
            editadoEn: expect.any(String),
          },
        ],
      });
    });

    it("se ofrece como descarga con un nombre de fichero fechado", async () => {
      const respuesta = await request(app).get("/api/respaldo").expect(200);

      expect(respuesta.headers["content-disposition"]).toMatch(
        /attachment; filename="cancionero-\d{4}-\d{2}-\d{2}\.json"/,
      );
    });

    it("funciona con la biblioteca vacía", async () => {
      const respuesta = await request(app).get("/api/respaldo").expect(200);

      expect(respuesta.body.canciones).toEqual([]);
    });
  });

  describe("POST /api/respaldo", () => {
    const RESPALDO = {
      version: 1,
      generadoEn: "2026-03-12T10:00:00.000Z",
      canciones: [
        {
          titulo: "Ven a celebrar",
          contenido: "[SOL]VEN A CELEBRAR",
          tonoOriginal: "SOL",
          etiquetas: ["Entrada"],
        },
      ],
    };

    it("importa y dice cuántas canciones ha cargado", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send(RESPALDO)
        .expect(200);

      expect(respuesta.body).toEqual({ importadas: 1 });
    });

    it("las canciones importadas quedan en la biblioteca", async () => {
      await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send(RESPALDO)
        .expect(200);

      const biblioteca = await request(app).get("/api/canciones").expect(200);

      expect(biblioteca.body).toEqual([
        {
          id: expect.any(Number),
          titulo: "Ven a celebrar",
          tonoOriginal: "SOL",
          etiquetas: [ENTRADA],
        },
      ]);
    });

    it("exige confirmar el reemplazo: sin ella no toca nada", async () => {
      crearCancion(bd, {
        titulo: "Canción que ya estaba",
        contenido: "letra",
        tonoOriginal: "RE",
      });

      const respuesta = await request(app)
        .post("/api/respaldo")
        .send(RESPALDO)
        .expect(400);

      expect(respuesta.body.error).toMatch(/reemplaza/i);

      const biblioteca = await request(app).get("/api/canciones").expect(200);
      expect(biblioteca.body).toHaveLength(1);
      expect(biblioteca.body[0].titulo).toBe("Canción que ya estaba");
    });

    it("rechaza una versión de formato que no conoce", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({ ...RESPALDO, version: 99 })
        .expect(400);

      expect(respuesta.body.error).toMatch(/versi[óo]n/i);
    });

    it("rechaza un documento sin lista de canciones", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({ version: 1, generadoEn: "hoy" })
        .expect(400);

      expect(respuesta.body.error).toMatch(/canciones/i);
    });

    it("rechaza un cuerpo que no es JSON válido", async () => {
      await request(app)
        .post("/api/respaldo?reemplazar=si")
        .set("Content-Type", "application/json")
        .send("{roto")
        .expect(400);
    });

    it("rechaza una canción con un tono que no es un acorde", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({
          ...RESPALDO,
          canciones: [{ titulo: "Mala", contenido: "x", tonoOriginal: "ZZ" }],
        })
        .expect(400);

      expect(respuesta.body.error).toMatch(/tono/i);
    });

    it("dice en qué canción está el problema", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({
          ...RESPALDO,
          canciones: [
            { titulo: "Buena", contenido: "x", tonoOriginal: "SOL" },
            { titulo: "", contenido: "x", tonoOriginal: "SOL" },
          ],
        })
        .expect(400);

      expect(respuesta.body.error).toMatch(/2/);
    });

    it("rechaza una etiqueta que no está en el catálogo, sin importar nada", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({
          ...RESPALDO,
          canciones: [
            {
              titulo: "Mala",
              contenido: "x",
              tonoOriginal: "SOL",
              etiquetas: ["Villancicos"],
            },
          ],
        })
        .expect(400);

      expect(respuesta.body.error).toMatch(/Villancicos/);

      const biblioteca = await request(app).get("/api/canciones").expect(200);
      expect(biblioteca.body).toEqual([]);
    });

    it("no acepta rutas de ficheros del sistema: el respaldo viaja en el cuerpo", async () => {
      const respuesta = await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send({ version: 1, generadoEn: "hoy", ruta: "../../etc/passwd" })
        .expect(400);

      expect(respuesta.body.error).toMatch(/canciones/i);
    });
  });

  describe("ida y vuelta completa", () => {
    it("exportar y volver a importar reconstruye la misma biblioteca", async () => {
      crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "**[SOL]VEN A CELEBRAR**\n\n  con sangrado",
        tonoOriginal: "SOL",
        cantoralOrigen: "Cantoral San Ildefonso",
        etiquetas: [ENTRADA],
      });
      crearCancion(bd, {
        titulo: "Pan de vida",
        contenido: "Cuerpo y sangre",
        tonoOriginal: "RE",
        notacionPorDefecto: "americana",
        etiquetas: [COMUNION],
      });

      const exportado = await request(app).get("/api/respaldo").expect(200);

      await request(app)
        .post("/api/respaldo?reemplazar=si")
        .send(exportado.body)
        .expect(200);

      const reexportado = await request(app).get("/api/respaldo").expect(200);

      expect(reexportado.body.canciones).toEqual(exportado.body.canciones);
    });
  });
});
