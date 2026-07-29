export interface EstadoRespaldo {
  /** Momento de la última copia descargada, en ISO 8601. `null` si nunca se hizo. */
  readonly ultimaCopia: string | null;
  readonly canciones: number;
  /** Hay canciones creadas o editadas después de la última copia. */
  readonly hayCambiosSinRespaldar: boolean;
}

export interface ResultadoImportacion {
  readonly importadas: number;
}
