import { Router } from "express";
import type { BaseDeDatos } from "../db/conexion.js";
import { nombresDeEtiquetaInexistentes } from "../etiquetas/repositorio.js";
import {
  exportarBiblioteca,
  importarRespaldo,
} from "../respaldo/repositorio.js";
import { validarRespaldo } from "./validacion.js";

function nombreDeFichero(): string {
  const hoy = new Date().toISOString().slice(0, 10);

  return `cancionero-${hoy}.json`;
}

export function crearRutasRespaldo(bd: BaseDeDatos): Router {
  const rutas = Router();

  rutas.get("/", (_peticion, respuesta) => {
    respuesta
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${nombreDeFichero()}"`,
      )
      .json(exportarBiblioteca(bd));
  });

  rutas.post("/", (peticion, respuesta) => {
    if (peticion.query["reemplazar"] !== "si") {
      respuesta.status(400).json({
        error:
          "Importar reemplaza toda la biblioteca. Confirma con ?reemplazar=si.",
      });
      return;
    }

    const respaldo = validarRespaldo(peticion.body);

    if (!respaldo.ok) {
      respuesta.status(400).json({ error: respaldo.error });
      return;
    }

    const nombres = respaldo.valor.canciones.flatMap(
      (cancion) => cancion.etiquetas ?? [],
    );

    const inexistentes = nombresDeEtiquetaInexistentes(bd, nombres);

    if (inexistentes.length > 0) {
      respuesta.status(400).json({
        error: `Estas etiquetas no están en el catálogo: ${inexistentes.join(", ")}.`,
      });
      return;
    }

    respuesta.json({ importadas: importarRespaldo(bd, respaldo.valor) });
  });

  return rutas;
}
