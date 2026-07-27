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
