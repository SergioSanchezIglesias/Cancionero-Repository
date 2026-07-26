import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

export type BaseDeDatos = Database.Database;

export function abrirBaseDeDatos(ruta: string): BaseDeDatos {
  mkdirSync(dirname(ruta), { recursive: true });

  const bd = new Database(ruta);

  bd.pragma("journal_mode = WAL");
  bd.pragma("foreign_keys = ON");
  bd.pragma("synchronous = NORMAL");

  return bd;
}

export function rutaBaseDeDatosDesdeEntorno(): string {
  const ruta = process.env["DB_PATH"];

  if (ruta === undefined || ruta.trim() === "") {
    throw new Error(
      "Falta la variable de entorno DB_PATH con la ruta del fichero SQLite.",
    );
  }

  return ruta;
}
