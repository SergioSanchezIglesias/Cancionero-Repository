import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { LucideAngularModule, Plus, Search } from "lucide-angular";
import { catchError, map, of, switchMap } from "rxjs";
import type { CancionResumen } from "../../core/interfaces/cancion.interface";
import {
  GRUPOS_DE_ETIQUETA,
  type Etiqueta,
} from "../../core/interfaces/etiqueta.interface";
import { CancionesService } from "../../core/services/canciones.service";
import { EtiquetasService } from "../../core/services/etiquetas.service";
import { FiltroBibliotecaService } from "../../core/services/filtro-biblioteca.service";
import { mensajeDeError } from "../../core/utils/mensaje-error";

interface Resultado {
  readonly canciones: readonly CancionResumen[];
  readonly error: string | null;
}

@Component({
  selector: "app-biblioteca",
  imports: [RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./biblioteca.page.html",
  styleUrl: "./biblioteca.page.css",
})
export class BibliotecaPage {
  private readonly cancionesService = inject(CancionesService);
  private readonly etiquetasService = inject(EtiquetasService);

  protected readonly filtro = inject(FiltroBibliotecaService);

  protected readonly iconoNueva = Plus;
  protected readonly iconoBuscar = Search;

  private readonly etiquetas = toSignal(
    this.etiquetasService.listar().pipe(catchError(() => of<Etiqueta[]>([]))),
    { initialValue: [] as Etiqueta[] },
  );

  /**
   * `null` mientras llega la primera respuesta. En los filtrados posteriores se
   * conserva el listado anterior hasta que llega el nuevo, para que no parpadee.
   */
  private readonly resultado = toSignal<Resultado | null>(
    toObservable(this.filtro.filtro).pipe(
      switchMap((filtro) =>
        this.cancionesService.listar(filtro).pipe(
          map((canciones): Resultado => ({ canciones, error: null })),
          catchError((fallo: unknown) =>
            of<Resultado>({ canciones: [], error: mensajeDeError(fallo) }),
          ),
        ),
      ),
    ),
    { initialValue: null },
  );

  protected readonly cargando = computed(() => this.resultado() === null);
  protected readonly error = computed(() => this.resultado()?.error ?? null);
  protected readonly canciones = computed(
    () => this.resultado()?.canciones ?? [],
  );

  /** Etiquetas repartidas en sus dos bloques, respetando el orden de la API. */
  protected readonly grupos = computed(() =>
    GRUPOS_DE_ETIQUETA.map((grupo) => ({
      ...grupo,
      etiquetas: this.etiquetas().filter(
        (etiqueta) => etiqueta.grupo === grupo.clave,
      ),
    })).filter((grupo) => grupo.etiquetas.length > 0),
  );

  private readonly nombrePorEtiqueta = computed(
    () =>
      new Map(
        this.etiquetas().map((etiqueta) => [etiqueta.id, etiqueta.nombre]),
      ),
  );

  protected nombresDe(ids: readonly number[]): string[] {
    const nombres = this.nombrePorEtiqueta();

    return ids
      .map((id) => nombres.get(id))
      .filter((nombre): nombre is string => nombre !== undefined);
  }

  protected alEscribir(evento: Event): void {
    const campo = evento.target;

    if (campo instanceof HTMLInputElement) {
      this.filtro.escribir(campo.value);
    }
  }
}
