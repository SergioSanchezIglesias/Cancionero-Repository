import type { BaseDeDatos } from "../db/conexion.js";

export type GrupoEtiqueta = "misa" | "adoracion_alabanza";

export interface Etiqueta {
  id: number;
  nombre: string;
  grupo: GrupoEtiqueta;
  orden: number;
  total: number;
}

const LISTAR_ETIQUETAS = `
  SELECT e.id, e.nombre, e.grupo, e.orden, COUNT(ce.cancion_id) AS total
    FROM etiqueta e
    LEFT JOIN cancion_etiqueta ce ON ce.etiqueta_id = e.id
   GROUP BY e.id
   ORDER BY e.orden
`;

export function listarEtiquetas(bd: BaseDeDatos): Etiqueta[] {
  return bd.prepare<[], Etiqueta>(LISTAR_ETIQUETAS).all();
}

export function etiquetasInexistentes(
  bd: BaseDeDatos,
  ids: number[],
): number[] {
  if (ids.length === 0) return [];

  const huecos = ids.map(() => "?").join(", ");

  const existentes = new Set(
    bd
      .prepare<number[], number>(
        `SELECT id FROM etiqueta WHERE id IN (${huecos})`,
      )
      .pluck()
      .all(...ids),
  );

  return [...new Set(ids)].filter((id) => !existentes.has(id));
}

export function nombresDeEtiquetaInexistentes(
  bd: BaseDeDatos,
  nombres: string[],
): string[] {
  if (nombres.length === 0) return [];

  const huecos = nombres.map(() => "?").join(", ");

  const existentes = new Set(
    bd
      .prepare<string[], string>(
        `SELECT nombre FROM etiqueta WHERE nombre IN (${huecos})`,
      )
      .pluck()
      .all(...nombres),
  );

  return [...new Set(nombres)].filter((nombre) => !existentes.has(nombre));
}
