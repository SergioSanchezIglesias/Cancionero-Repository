import { Router } from "express";
import type { BaseDeDatos } from "../db/conexion.js";
import { nombresDeEtiquetaInexistentes } from "../etiquetas/repositorio.js";
import { leerEstadoRespaldo, registrarCopia } from "../respaldo/estado.js";
import { crearInstantaneaTemporal } from "../respaldo/instantanea.js";
import {
  exportarBiblioteca,
  importarRespaldo,
} from "../respaldo/repositorio.js";
import { validarRespaldo } from "./validacion.js";

function nombreDeFichero(extension: string): string {
  const hoy = new Date().toISOString().slice(0, 10);

  return `cancionero-${hoy}.${extension}`;
}

export function crearRutasRespaldo(bd: BaseDeDatos): Router {
  const rutas = Router();

  rutas.get("/", (_peticion, respuesta) => {
    const biblioteca = exportarBiblioteca(bd);

    registrarCopia(bd);

    respuesta
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${nombreDeFichero("json")}"`,
      )
      .json(biblioteca);
  });

  rutas.get("/estado", (_peticion, respuesta) => {
    respuesta.json(leerEstadoRespaldo(bd));
  });

  rutas.get("/base-de-datos", (_peticion, respuesta) => {
    const instantanea = crearInstantaneaTemporal(bd);

    respuesta.setHeader("Content-Type", "application/vnd.sqlite3");

    respuesta.download(instantanea.ruta, nombreDeFichero("db"), (fallo) => {
      instantanea.limpiar();

      if (fallo === undefined) {
        registrarCopia(bd);
        return;
      }

      console.error(fallo);

      if (!respuesta.headersSent) {
        respuesta
          .status(500)
          .json({ error: "No se ha podido preparar la copia." });
      }
    });
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
