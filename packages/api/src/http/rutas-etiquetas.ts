import { Router } from "express";
import type { BaseDeDatos } from "../db/conexion.js";
import { listarEtiquetas } from "../etiquetas/repositorio.js";

export function crearRutasEtiquetas(bd: BaseDeDatos): Router {
  const rutas = Router();

  rutas.get("/", (_peticion, respuesta) => {
    respuesta.json(listarEtiquetas(bd));
  });

  return rutas;
}
