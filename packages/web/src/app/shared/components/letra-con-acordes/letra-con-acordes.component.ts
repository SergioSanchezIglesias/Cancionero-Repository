import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import {
  parsearContenido,
  prepararContenido,
  type OpcionesDeLectura,
} from "@cancionero/chords";

/** Contextos de lectura con sus tamaños de texto (PRD §15.5). */
export type TamanoLetra = "visor" | "previa";

@Component({
  selector: "app-letra-con-acordes",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./letra-con-acordes.component.html",
  styleUrl: "./letra-con-acordes.component.css",
  host: {
    "[class.es-previa]": 'tamano() === "previa"',
  },
})
export class LetraConAcordesComponent {
  /** Contenido en formato ChordPro, tal cual está guardado (notación latina). */
  readonly contenido = input.required<string>();

  readonly tamano = input<TamanoLetra>("visor");

  /**
   * Cómo se quiere leer la canción: transpuesta y en una notación concreta.
   * Sin opciones se pinta tal cual está guardada, que es lo que necesita la
   * vista previa del editor.
   */
  readonly lectura = input<OpcionesDeLectura | null>(null);

  /**
   * Tanto el troceado en segmentos como la transposición las hace el motor de
   * acordes: aquí no se interpreta ni un corchete.
   */
  protected readonly lineas = computed(() => {
    const lectura = this.lectura();

    return lectura === null
      ? parsearContenido(this.contenido())
      : prepararContenido(this.contenido(), lectura);
  });
}
