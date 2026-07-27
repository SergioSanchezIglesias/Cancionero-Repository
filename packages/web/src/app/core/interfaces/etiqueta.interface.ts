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
