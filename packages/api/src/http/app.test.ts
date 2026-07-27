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
const OFERTORIO = 4;
const COMUNION = 7;
const ALABANZA = 12;

const CANCION_MINIMA = {
  titulo: "Ven a celebrar",
  contenido: "**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**",
  tonoOriginal: "SOL",
};

describe("API", () => {
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

  describe("GET /api/etiquetas", () => {
    it("devuelve el catálogo de 14 etiquetas", async () => {
      const respuesta = await request(app).get("/api/etiquetas").expect(200);

      expect(respuesta.body).toHaveLength(14);
    });

    it("devuelve JSON", async () => {
      await request(app)
        .get("/api/etiquetas")
        .expect("Content-Type", /application\/json/);
    });

    it("devuelve cada etiqueta con su grupo, su orden y su contador", async () => {
      crearCancion(bd, { ...CANCION_MINIMA, etiquetas: [ENTRADA] });

      const respuesta = await request(app).get("/api/etiquetas").expect(200);

      expect(respuesta.body[0]).toEqual({
        id: ENTRADA,
        nombre: "Entrada",
        grupo: "misa",
        orden: 1,
        total: 1,
      });
    });
  });

  describe("GET /api/canciones", () => {
    beforeEach(() => {
      crearCancion(bd, { ...CANCION_MINIMA, etiquetas: [ENTRADA] });
      crearCancion(bd, {
        titulo: "Pan de vida",
        contenido: "Cuerpo y sangre del Señor",
        tonoOriginal: "RE",
        etiquetas: [COMUNION],
      });
      crearCancion(bd, {
        titulo: "Alabaré",
        contenido: "Alabaré a mi Señor",
        tonoOriginal: "LA",
        etiquetas: [ENTRADA, ALABANZA],
      });
    });

    it("devuelve la biblioteca ordenada por título", async () => {
      const respuesta = await request(app).get("/api/canciones").expect(200);

      expect(respuesta.body.map((c: { titulo: string }) => c.titulo)).toEqual([
        "Alabaré",
        "Pan de vida",
        "Ven a celebrar",
      ]);
    });

    it("devuelve id, título, tono y etiquetas de cada canción", async () => {
      const respuesta = await request(app)
        .get("/api/canciones?buscar=Alabaré")
        .expect(200);

      expect(respuesta.body).toEqual([
        {
          id: expect.any(Number),
          titulo: "Alabaré",
          tonoOriginal: "LA",
          etiquetas: [ENTRADA, ALABANZA],
        },
      ]);
    });

    it("busca por título y por letra", async () => {
      const porLetra = await request(app)
        .get("/api/canciones?buscar=sangre")
        .expect(200);

      expect(porLetra.body).toHaveLength(1);
      expect(porLetra.body[0].titulo).toBe("Pan de vida");
    });

    it("busca ignorando tildes y eñes", async () => {
      const respuesta = await request(app)
        .get("/api/canciones?buscar=senor")
        .expect(200);

      expect(respuesta.body).toHaveLength(2);
    });

    it("filtra por una etiqueta", async () => {
      const respuesta = await request(app)
        .get(`/api/canciones?etiquetas=${COMUNION}`)
        .expect(200);

      expect(respuesta.body).toHaveLength(1);
      expect(respuesta.body[0].titulo).toBe("Pan de vida");
    });

    it("filtra por varias etiquetas con lógica OR", async () => {
      const respuesta = await request(app)
        .get(`/api/canciones?etiquetas=${ENTRADA},${COMUNION}`)
        .expect(200);

      expect(respuesta.body).toHaveLength(3);
    });

    it("acepta el parámetro etiquetas repetido", async () => {
      const respuesta = await request(app)
        .get(`/api/canciones?etiquetas=${ENTRADA}&etiquetas=${COMUNION}`)
        .expect(200);

      expect(respuesta.body).toHaveLength(3);
    });

    it("combina búsqueda y etiquetas", async () => {
      const respuesta = await request(app)
        .get(`/api/canciones?buscar=senor&etiquetas=${ENTRADA}`)
        .expect(200);

      expect(respuesta.body).toHaveLength(1);
      expect(respuesta.body[0].titulo).toBe("Alabaré");
    });

    it("con la búsqueda vacía devuelve toda la biblioteca", async () => {
      const respuesta = await request(app)
        .get("/api/canciones?buscar=")
        .expect(200);

      expect(respuesta.body).toHaveLength(3);
    });

    it("no revienta con caracteres hostiles en la búsqueda", async () => {
      const respuesta = await request(app)
        .get(`/api/canciones?buscar=${encodeURIComponent('di "hola" -OR (')}`)
        .expect(200);

      expect(respuesta.body).toEqual([]);
    });

    it("rechaza una etiqueta que no es un número", async () => {
      const respuesta = await request(app)
        .get("/api/canciones?etiquetas=abc")
        .expect(400);

      expect(respuesta.body.error).toMatch(/etiquetas/i);
    });
  });

  describe("GET /api/canciones/:id", () => {
    it("devuelve la canción completa con su contenido", async () => {
      const creada = crearCancion(bd, {
        ...CANCION_MINIMA,
        etiquetas: [ENTRADA],
      });

      const respuesta = await request(app)
        .get(`/api/canciones/${creada.id}`)
        .expect(200);

      expect(respuesta.body).toEqual({
        id: creada.id,
        titulo: "Ven a celebrar",
        contenido: CANCION_MINIMA.contenido,
        tonoOriginal: "SOL",
        notacionPorDefecto: "latina",
        cantoralOrigen: null,
        creadoEn: expect.any(String),
        editadoEn: expect.any(String),
        etiquetas: [ENTRADA],
      });
    });

    it("devuelve 404 si la canción no existe", async () => {
      const respuesta = await request(app).get("/api/canciones/999").expect(404);

      expect(respuesta.body.error).toBeTypeOf("string");
    });

    it("devuelve 400 si el id no es un número", async () => {
      const respuesta = await request(app).get("/api/canciones/abc").expect(400);

      expect(respuesta.body.error).toMatch(/id/i);
    });
  });

  describe("POST /api/canciones", () => {
    it("crea la canción y devuelve 201 con la canción creada", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .send({ ...CANCION_MINIMA, etiquetas: [ENTRADA, OFERTORIO] })
        .expect(201);

      expect(respuesta.body).toEqual({
        id: expect.any(Number),
        titulo: "Ven a celebrar",
        contenido: CANCION_MINIMA.contenido,
        tonoOriginal: "SOL",
        notacionPorDefecto: "latina",
        cantoralOrigen: null,
        creadoEn: expect.any(String),
        editadoEn: expect.any(String),
        etiquetas: [ENTRADA, OFERTORIO],
      });
    });

    it("indica en Location dónde ha quedado la canción nueva", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .send(CANCION_MINIMA)
        .expect(201);

      expect(respuesta.headers["location"]).toBe(
        `/api/canciones/${respuesta.body.id}`,
      );
    });

    it("la canción creada se puede leer después", async () => {
      const creada = await request(app)
        .post("/api/canciones")
        .send(CANCION_MINIMA)
        .expect(201);

      await request(app).get(`/api/canciones/${creada.body.id}`).expect(200);
    });

    it("guarda el contenido literalmente, con sus espacios y saltos", async () => {
      const contenido = "  [SOL]sangrado\n\n  y con línea en blanco  ";

      const respuesta = await request(app)
        .post("/api/canciones")
        .send({ ...CANCION_MINIMA, contenido })
        .expect(201);

      expect(respuesta.body.contenido).toBe(contenido);
    });

    it("rechaza una canción sin título", async () => {
      const { titulo: _, ...sinTitulo } = CANCION_MINIMA;

      const respuesta = await request(app)
        .post("/api/canciones")
        .send(sinTitulo)
        .expect(400);

      expect(respuesta.body.error).toMatch(/titulo|título/i);
    });

    it("rechaza un tono que no es un acorde", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .send({ ...CANCION_MINIMA, tonoOriginal: "ZZ" })
        .expect(400);

      expect(respuesta.body.error).toMatch(/tono/i);
    });

    it("rechaza un cuerpo que no es JSON válido", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .set("Content-Type", "application/json")
        .send("{esto no es json")
        .expect(400);

      expect(respuesta.body.error).toBeTypeOf("string");
    });

    it("rechaza una etiqueta que no está en el catálogo", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .send({ ...CANCION_MINIMA, etiquetas: [ENTRADA, 999] })
        .expect(400);

      expect(respuesta.body.error).toMatch(/999/);
    });

    it("no crea nada si una etiqueta no está en el catálogo", async () => {
      await request(app)
        .post("/api/canciones")
        .send({ ...CANCION_MINIMA, etiquetas: [999] })
        .expect(400);

      const respuesta = await request(app).get("/api/canciones").expect(200);

      expect(respuesta.body).toEqual([]);
    });

    it("nunca devuelve el stack trace en el error", async () => {
      const respuesta = await request(app)
        .post("/api/canciones")
        .send({})
        .expect(400);

      expect(Object.keys(respuesta.body)).toEqual(["error"]);
    });
  });

  describe("PUT /api/canciones/:id", () => {
    it("actualiza la canción y la devuelve", async () => {
      const creada = crearCancion(bd, {
        ...CANCION_MINIMA,
        etiquetas: [ENTRADA],
      });

      const respuesta = await request(app)
        .put(`/api/canciones/${creada.id}`)
        .send({
          titulo: "Título nuevo",
          contenido: "[RE]letra nueva",
          tonoOriginal: "RE",
          etiquetas: [COMUNION],
        })
        .expect(200);

      expect(respuesta.body).toMatchObject({
        id: creada.id,
        titulo: "Título nuevo",
        contenido: "[RE]letra nueva",
        tonoOriginal: "RE",
        etiquetas: [COMUNION],
        creadoEn: creada.creadoEn,
      });
    });

    it("devuelve 404 si la canción no existe", async () => {
      await request(app).put("/api/canciones/999").send(CANCION_MINIMA).expect(404);
    });

    it("devuelve 400 si el id no es un número", async () => {
      await request(app).put("/api/canciones/abc").send(CANCION_MINIMA).expect(400);
    });

    it("rechaza datos inválidos sin tocar la canción", async () => {
      const creada = crearCancion(bd, CANCION_MINIMA);

      await request(app)
        .put(`/api/canciones/${creada.id}`)
        .send({ ...CANCION_MINIMA, titulo: "   " })
        .expect(400);

      const sinCambios = await request(app)
        .get(`/api/canciones/${creada.id}`)
        .expect(200);

      expect(sinCambios.body.titulo).toBe("Ven a celebrar");
    });

    it("rechaza una etiqueta fuera del catálogo sin tocar la canción", async () => {
      const creada = crearCancion(bd, {
        ...CANCION_MINIMA,
        etiquetas: [ENTRADA],
      });

      await request(app)
        .put(`/api/canciones/${creada.id}`)
        .send({ ...CANCION_MINIMA, etiquetas: [999] })
        .expect(400);

      const sinCambios = await request(app)
        .get(`/api/canciones/${creada.id}`)
        .expect(200);

      expect(sinCambios.body.etiquetas).toEqual([ENTRADA]);
    });
  });

  describe("DELETE /api/canciones/:id", () => {
    it("borra la canción y responde 204 sin cuerpo", async () => {
      const creada = crearCancion(bd, CANCION_MINIMA);

      const respuesta = await request(app)
        .delete(`/api/canciones/${creada.id}`)
        .expect(204);

      expect(respuesta.body).toEqual({});
    });

    it("la canción deja de estar accesible", async () => {
      const creada = crearCancion(bd, CANCION_MINIMA);

      await request(app).delete(`/api/canciones/${creada.id}`).expect(204);

      await request(app).get(`/api/canciones/${creada.id}`).expect(404);
    });

    it("devuelve 404 al borrarla dos veces", async () => {
      const creada = crearCancion(bd, CANCION_MINIMA);

      await request(app).delete(`/api/canciones/${creada.id}`).expect(204);
      await request(app).delete(`/api/canciones/${creada.id}`).expect(404);
    });

    it("devuelve 404 si la canción no existe", async () => {
      await request(app).delete("/api/canciones/999").expect(404);
    });

    it("devuelve 400 si el id no es un número", async () => {
      await request(app).delete("/api/canciones/abc").expect(400);
    });

    it("no toca el catálogo de etiquetas", async () => {
      const creada = crearCancion(bd, {
        ...CANCION_MINIMA,
        etiquetas: [ENTRADA],
      });

      await request(app).delete(`/api/canciones/${creada.id}`).expect(204);

      const etiquetas = await request(app).get("/api/etiquetas").expect(200);

      expect(etiquetas.body).toHaveLength(14);
    });
  });

  describe("rutas desconocidas", () => {
    it("devuelve 404 con cuerpo JSON, no una página HTML de Express", async () => {
      const respuesta = await request(app)
        .get("/api/inventada")
        .expect(404)
        .expect("Content-Type", /application\/json/);

      expect(respuesta.body.error).toBeTypeOf("string");
    });

    it("devuelve 404 también en un método no soportado", async () => {
      await request(app).patch("/api/canciones/1").expect(404);
    });
  });

  describe("fallos inesperados", () => {
    it("responde 500 con { error } y sin filtrar detalles internos", async () => {
      // Cerrar la conexión rompe cualquier consulta: simula un fallo real.
      bd.close();

      const respuesta = await request(app).get("/api/canciones").expect(500);

      expect(Object.keys(respuesta.body)).toEqual(["error"]);
      expect(respuesta.body.error).not.toMatch(/sqlite|at |\.ts:/i);
    });
  });
});
