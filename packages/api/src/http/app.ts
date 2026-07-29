import { join } from "node:path";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { BaseDeDatos } from "../db/conexion.js";
import { crearRutasCanciones } from "./rutas-canciones.js";
import { crearRutasEtiquetas } from "./rutas-etiquetas.js";
import { crearRutasRespaldo } from "./rutas-respaldo.js";

export interface OpcionesApp {
  carpetaWeb?: string;
}

function esJsonInvalido(fallo: unknown): boolean {
  return (
    fallo instanceof SyntaxError &&
    "type" in fallo &&
    fallo.type === "entity.parse.failed"
  );
}

export function crearApp(bd: BaseDeDatos, opciones: OpcionesApp = {}): Express {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/salud", (_peticion, respuesta) => {
    bd.prepare("SELECT 1").get();

    respuesta.json({ estado: "ok" });
  });

  app.use("/api/canciones", crearRutasCanciones(bd));
  app.use("/api/etiquetas", crearRutasEtiquetas(bd));
  app.use("/api/respaldo", crearRutasRespaldo(bd));

  app.use("/api", (_peticion: Request, respuesta: Response) => {
    respuesta.status(404).json({ error: "Recurso no encontrado." });
  });

  const { carpetaWeb } = opciones;

  if (carpetaWeb !== undefined) {
    app.use(express.static(carpetaWeb));

    app.use((_peticion: Request, respuesta: Response) => {
      respuesta.sendFile(join(carpetaWeb, "index.html"));
    });
  }

  app.use(
    (
      fallo: unknown,
      _peticion: Request,
      respuesta: Response,
      _siguiente: NextFunction,
    ) => {
      if (esJsonInvalido(fallo)) {
        respuesta.status(400).json({ error: "El cuerpo no es un JSON válido." });
        return;
      }

      console.error(fallo);

      respuesta.status(500).json({ error: "Error interno del servidor." });
    },
  );

  return app;
}
