import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { parsearContenido } from "@cancionero/chords";

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
   * El troceado en segmentos lo hace el motor de acordes: aquí no se
   * interpreta ni un corchete.
   */
  protected readonly lineas = computed(() => parsearContenido(this.contenido()));
}
