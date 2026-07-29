/**
 * Filtro de la biblioteca. La búsqueda de texto y las etiquetas se combinan
 * entre sí; varias etiquetas se resuelven con lógica OR (decisión de producto).
 */
export interface FiltroCanciones {
  readonly buscar: string;
  readonly etiquetas: readonly number[];
}

export const FILTRO_VACIO: FiltroCanciones = { buscar: "", etiquetas: [] };
