/**
 * Catálogo fijo de 14 etiquetas (momentos de la celebración). No es editable
 * desde la aplicación: la API lo sirve desde la semilla de la base de datos.
 */

export type GrupoEtiqueta = "misa" | "adoracion_alabanza";

export interface Etiqueta {
  readonly id: number;
  readonly nombre: string;
  readonly grupo: GrupoEtiqueta;
  readonly orden: number;
  /** Cuántas canciones la tienen asignada. Alimenta el contador de los chips. */
  readonly total: number;
}

/** Los dos bloques en los que se presentan los filtros: 9 + 5. */
export const GRUPOS_DE_ETIQUETA: readonly {
  readonly clave: GrupoEtiqueta;
  readonly nombre: string;
}[] = [
  { clave: "misa", nombre: "Misa" },
  { clave: "adoracion_alabanza", nombre: "Adoración y Alabanza" },
];
