import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { BaseDeDatos } from "./conexion.js";

export const CARPETA_MIGRACIONES = join(import.meta.dirname, "migraciones");

const CREAR_REGISTRO = `
  CREATE TABLE IF NOT EXISTS migracion (
    nombre      TEXT PRIMARY KEY,
    aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
)
`;

export function aplicarMigraciones(
  bd: BaseDeDatos,
  carpeta: string = CARPETA_MIGRACIONES,
): string[] {
  bd.exec(CREAR_REGISTRO);

  const registradas = bd.prepare("SELECT nombre FROM migracion").pluck().all();
  const yaAplicadas = new Set(registradas.map(String));

  const pendientes = readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith(".sql"))
    .sort()
    .filter((nombre) => !yaAplicadas.has(nombre));

  const registrar = bd.prepare("INSERT INTO migracion (nombre) VALUES (?)");

  for (const nombre of pendientes) {
    const sql = readFileSync(join(carpeta, nombre), "utf8");

    if (sql.trim() === "") {
      throw new Error(`La migración ${nombre} está vacía`);
    }

    const aplicar = bd.transaction(() => {
      bd.exec(sql);
      registrar.run(nombre);
    });

    try {
      aplicar();
    } catch (error) {
      throw new Error(`La migración ${nombre} ha fallado`, { cause: error });
    }
  }

  return pendientes;
}
