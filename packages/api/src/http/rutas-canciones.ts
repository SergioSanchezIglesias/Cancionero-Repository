import { Router, type Response } from "express";
import {
  actualizarCancion,
  borrarCancion,
  crearCancion,
  listarCanciones,
  obtenerCancion,
} from "../canciones/repositorio.js";
import type { BaseDeDatos } from "../db/conexion.js";
import { etiquetasInexistentes } from "../etiquetas/repositorio.js";
import {
  validarFiltroCanciones,
  validarId,
  validarNuevaCancion,
  type CancionValidada,
} from "./validacion.js";

function error(respuesta: Response, estado: number, mensaje: string): void {
  respuesta.status(estado).json({ error: mensaje });
}

function leerCancionDelCuerpo(
  bd: BaseDeDatos,
  cuerpo: unknown,
  respuesta: Response,
): CancionValidada | null {
  const validada = validarNuevaCancion(cuerpo);

  if (!validada.ok) {
    error(respuesta, 400, validada.error);
    return null;
  }

  const inexistentes = etiquetasInexistentes(bd, validada.valor.etiquetas);

  if (inexistentes.length > 0) {
    error(
      respuesta,
      400,
      `Estas etiquetas no están en el catálogo: ${inexistentes.join(", ")}.`,
    );
    return null;
  }

  return validada.valor;
}

export function crearRutasCanciones(bd: BaseDeDatos): Router {
  const rutas = Router();

  rutas.get("/", (peticion, respuesta) => {
    const filtro = validarFiltroCanciones(peticion.query);

    if (!filtro.ok) {
      error(respuesta, 400, filtro.error);
      return;
    }

    respuesta.json(listarCanciones(bd, filtro.valor));
  });

  rutas.get("/:id", (peticion, respuesta) => {
    const id = validarId(peticion.params.id);

    if (id === null) {
      error(respuesta, 400, "El id de la canción debe ser un número entero.");
      return;
    }

    const cancion = obtenerCancion(bd, id);

    if (cancion === null) {
      error(respuesta, 404, `No existe la canción ${id}.`);
      return;
    }

    respuesta.json(cancion);
  });

  rutas.post("/", (peticion, respuesta) => {
    const datos = leerCancionDelCuerpo(bd, peticion.body, respuesta);
    if (datos === null) return;

    const creada = crearCancion(bd, datos);

    respuesta.status(201).location(`/api/canciones/${creada.id}`).json(creada);
  });

  rutas.put("/:id", (peticion, respuesta) => {
    const id = validarId(peticion.params.id);

    if (id === null) {
      error(respuesta, 400, "El id de la canción debe ser un número entero.");
      return;
    }

    const datos = leerCancionDelCuerpo(bd, peticion.body, respuesta);
    if (datos === null) return;

    const actualizada = actualizarCancion(bd, id, datos);

    if (actualizada === null) {
      error(respuesta, 404, `No existe la canción ${id}.`);
      return;
    }

    respuesta.json(actualizada);
  });

  rutas.delete("/:id", (peticion, respuesta) => {
    const id = validarId(peticion.params.id);

    if (id === null) {
      error(respuesta, 400, "El id de la canción debe ser un número entero.");
      return;
    }

    if (!borrarCancion(bd, id)) {
      error(respuesta, 404, `No existe la canción ${id}.`);
      return;
    }

    respuesta.status(204).end();
  });

  return rutas;
}
