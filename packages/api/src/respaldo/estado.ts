import type { BaseDeDatos } from "../db/conexion.js";

const CLAVE_ULTIMA_COPIA = "ultima_copia";

export interface EstadoRespaldo {
  /** Momento de la última copia descargada, en ISO 8601 UTC. `null` si nunca se hizo. */
  ultimaCopia: string | null;
  /** Canciones que hay ahora mismo en la biblioteca. */
  canciones: number;
  /** Hay canciones creadas o editadas después de la última copia. */
  hayCambiosSinRespaldar: boolean;
}

// Se guarda con datetime('now'), el mismo formato que creado_en y editado_en,
// para poder compararlos entre sí como texto.
const GUARDAR_COPIA = `
  INSERT INTO ajuste (clave, valor) VALUES (?, datetime('now'))
  ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor
`;

const LEER_COPIA = `SELECT valor FROM ajuste WHERE clave = ?`;

const RESUMEN_BIBLIOTECA = `
  SELECT COUNT(*) AS canciones, MAX(editado_en) AS ultimoCambio FROM cancion
`;

interface ResumenBiblioteca {
  canciones: number;
  ultimoCambio: string | null;
}

/** Deja constancia de que se acaba de entregar una copia de la biblioteca. */
export function registrarCopia(bd: BaseDeDatos): void {
  bd.prepare<[string]>(GUARDAR_COPIA).run(CLAVE_ULTIMA_COPIA);
}

export function leerEstadoRespaldo(bd: BaseDeDatos): EstadoRespaldo {
  const guardada = bd
    .prepare<[string], string>(LEER_COPIA)
    .pluck()
    .get(CLAVE_ULTIMA_COPIA);

  const ultimaCopia = guardada ?? null;

  const resumen = bd
    .prepare<[], ResumenBiblioteca>(RESUMEN_BIBLIOTECA)
    .get() ?? { canciones: 0, ultimoCambio: null };

  return {
    ultimaCopia: ultimaCopia === null ? null : aIso(ultimaCopia),
    canciones: resumen.canciones,
    hayCambiosSinRespaldar: hayCambios(ultimaCopia, resumen.ultimoCambio),
  };
}

// Borrar una canción no cuenta como cambio sin respaldar: la copia anterior
// sigue conteniéndola, que es justo lo que interesa si el borrado fue un error.
function hayCambios(
  ultimaCopia: string | null,
  ultimoCambio: string | null,
): boolean {
  if (ultimoCambio === null) return false;
  if (ultimaCopia === null) return true;

  return ultimoCambio > ultimaCopia;
}

function aIso(fecha: string): string {
  return `${fecha.replace(" ", "T")}Z`;
}
