import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BaseDeDatos } from "../db/conexion.js";

export interface InstantaneaTemporal {
  ruta: string;
  limpiar: () => void;
}

/**
 * Copia la base de datos entera al fichero indicado, con la app en marcha.
 * `VACUUM INTO` es la forma correcta de hacerlo en SQLite: consolida el WAL,
 * compacta el fichero y no bloquea a quien esté escribiendo.
 * Falla si el destino ya existe, así que siempre se le pasa una ruta nueva.
 */
export function crearInstantanea(bd: BaseDeDatos, destino: string): void {
  bd.prepare<[string]>("VACUUM INTO ?").run(destino);
}

/** Instantánea en una carpeta temporal propia, lista para servirla y borrarla. */
export function crearInstantaneaTemporal(bd: BaseDeDatos): InstantaneaTemporal {
  const carpeta = mkdtempSync(join(tmpdir(), "cancionero-copia-"));
  const ruta = join(carpeta, "cancionero.db");

  try {
    crearInstantanea(bd, ruta);
  } catch (fallo) {
    rmSync(carpeta, { recursive: true, force: true });
    throw fallo;
  }

  return {
    ruta,
    limpiar: () => rmSync(carpeta, { recursive: true, force: true }),
  };
}
