import type { Notacion } from "@cancionero/chords";

/**
 * Vista de cliente del contrato HTTP de la API. Los paquetes `web` y `api`
 * nunca se importan entre sí; lo que sí es dominio compartido de verdad
 * (la notación) se toma de `@cancionero/chords`.
 */

export type { Notacion };

/** Lo que devuelve el listado de la biblioteca. */
export interface CancionResumen {
  readonly id: number;
  readonly titulo: string;
  readonly tonoOriginal: string;
  readonly etiquetas: readonly number[];
}

/** Una canción completa, con su contenido en ChordPro y notación latina. */
export interface Cancion extends CancionResumen {
  readonly contenido: string;
  readonly notacionPorDefecto: Notacion;
  readonly cantoralOrigen: string | null;
  readonly creadoEn: string;
  readonly editadoEn: string;
}

/** Lo que se envía al crear o actualizar una canción. */
export interface NuevaCancion {
  readonly titulo: string;
  readonly contenido: string;
  readonly tonoOriginal: string;
  readonly notacionPorDefecto: Notacion;
  readonly cantoralOrigen: string | null;
  readonly etiquetas: readonly number[];
}
