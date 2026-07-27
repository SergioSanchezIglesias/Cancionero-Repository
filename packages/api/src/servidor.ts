import {
  abrirBaseDeDatos,
  rutaBaseDeDatosDesdeEntorno,
} from "./db/conexion.js";
import { aplicarMigraciones } from "./db/migraciones.js";
import { crearApp, type OpcionesApp } from "./http/app.js";

const PUERTO_POR_DEFECTO = 3000;

function leerPuerto(): number {
  const valor = process.env["PORT"];

  if (valor === undefined || valor.trim() === "") return PUERTO_POR_DEFECTO;

  const puerto = Number(valor);

  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error(`PORT no es un puerto válido: «${valor}».`);
  }

  return puerto;
}

const ruta = rutaBaseDeDatosDesdeEntorno();
const bd = abrirBaseDeDatos(ruta);

const aplicadas = aplicarMigraciones(bd);

for (const nombre of aplicadas) {
  console.log(`Migración aplicada: ${nombre}`);
}

const opciones: OpcionesApp = {};
const carpetaWeb = process.env["WEB_DIST"];

if (carpetaWeb !== undefined && carpetaWeb.trim() !== "") {
  opciones.carpetaWeb = carpetaWeb;
}

const puerto = leerPuerto();
const servidor = crearApp(bd, opciones).listen(puerto, () => {
  console.log(`Cancionero escuchando en http://localhost:${puerto}`);
  console.log(`Base de datos: ${ruta}`);
});

function apagar(senal: string): void {
  console.log(`Recibida ${senal}, cerrando…`);

  servidor.close(() => {
    bd.close();
    process.exit(0);
  });
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
