import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { takeUntilDestroyed, toObservable, toSignal } from "@angular/core/rxjs-interop";
import type { Notacion } from "@cancionero/chords";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  FileText,
  LucideAngularModule,
  Search,
  X,
} from "lucide-angular";
import { catchError, of, switchMap } from "rxjs";
import type {
  Cancion,
  CancionResumen,
} from "../../core/interfaces/cancion.interface";
import {
  GRUPOS_DE_ETIQUETA,
  type Etiqueta,
} from "../../core/interfaces/etiqueta.interface";
import { paginasTotales } from "../../core/pdf/documento-cancionero";
import { MEDIDOR } from "../../core/pdf/medidor";
import { CancionesService } from "../../core/services/canciones.service";
import { CancioneroPdfService } from "../../core/services/cancionero-pdf.service";
import { EtiquetasService } from "../../core/services/etiquetas.service";
import { mensajeDeExportacion } from "../../core/pdf/error-exportacion";
import { mensajeDeError } from "../../core/utils/mensaje-error";

@Component({
  selector: "app-cancionero",
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./cancionero.page.html",
  styleUrl: "./cancionero.page.css",
})
export class CancioneroPage {
  private readonly cancionesService = inject(CancionesService);
  private readonly etiquetasService = inject(EtiquetasService);
  private readonly pdf = inject(CancioneroPdfService);
  private readonly destruccion = inject(DestroyRef);

  protected readonly iconoBuscar = Search;
  protected readonly iconoMarca = Check;
  protected readonly iconoSubir = ArrowUp;
  protected readonly iconoBajar = ArrowDown;
  protected readonly iconoQuitar = X;
  protected readonly iconoPrevia = Eye;
  protected readonly iconoPdf = FileText;

  protected readonly titulo = signal("");
  protected readonly texto = signal("");
  protected readonly etiquetasFiltradas = signal<readonly number[]>([]);

  /** Identificadores de las canciones elegidas, en el orden del cancionero. */
  protected readonly elegidas = signal<readonly number[]>([]);

  /** Contenido completo de cada canción elegida, para maquetar y estimar. */
  private readonly detalles = signal<ReadonlyMap<number, Cancion>>(new Map());

  protected readonly portada = signal(true);
  protected readonly indice = signal(true);
  protected readonly numeracion = signal(true);
  protected readonly notacion = signal<Notacion>("latina");

  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly medidor = inject(MEDIDOR);

  /** Llega de `/cancioneros?anadir=9`, desde el botón del visor. */
  readonly anadir = input<string>();

  private readonly filtro = computed(() => ({
    buscar: this.texto(),
    etiquetas: this.etiquetasFiltradas(),
  }));

  private readonly resultado = toSignal(
    toObservable(this.filtro).pipe(
      switchMap((filtro) =>
        this.cancionesService
          .listar(filtro)
          .pipe(catchError(() => of<CancionResumen[]>([]))),
      ),
    ),
    { initialValue: [] as CancionResumen[] },
  );

  protected readonly candidatas = computed(() => this.resultado());

  private readonly etiquetas = toSignal(
    this.etiquetasService.listar().pipe(catchError(() => of<Etiqueta[]>([]))),
    { initialValue: [] as Etiqueta[] },
  );

  protected readonly grupos = computed(() =>
    GRUPOS_DE_ETIQUETA.map((grupo) => ({
      ...grupo,
      etiquetas: this.etiquetas().filter(
        (etiqueta) => etiqueta.grupo === grupo.clave,
      ),
    })).filter((grupo) => grupo.etiquetas.length > 0),
  );

  /** Las elegidas, en orden, con el título que hay que enseñar. */
  protected readonly cancionero = computed(() => {
    const porId = new Map(
      [...this.candidatas(), ...this.detalles().values()].map((cancion) => [
        cancion.id,
        cancion,
      ]),
    );

    return this.elegidas().map((id, posicion) => ({
      id,
      posicion,
      titulo: porId.get(id)?.titulo ?? "…",
      tonoOriginal: porId.get(id)?.tonoOriginal ?? "",
    }));
  });

  /** Canciones completas, en orden. Vacío mientras falte alguna por llegar. */
  private readonly cancionesCompletas = computed(() => {
    const detalles = this.detalles();
    const completas = this.elegidas().map((id) => detalles.get(id));

    return completas.every((cancion) => cancion !== undefined)
      ? (completas as Cancion[])
      : null;
  });

  protected readonly listoParaGenerar = computed(
    () => this.elegidas().length > 0 && this.cancionesCompletas() !== null,
  );

  protected readonly paginas = computed(() => {
    const canciones = this.cancionesCompletas();
    const medidor = this.medidor;

    if (canciones === null || medidor === null) return null;

    return paginasTotales(
      {
        titulo: this.tituloEfectivo(),
        canciones,
        notacion: this.notacion(),
        portada: this.portada(),
        indice: this.indice(),
        numeracion: this.numeracion(),
      },
      medidor,
    );
  });

  protected readonly resumen = computed(() => {
    const paginas = this.paginas();
    const notacion =
      this.notacion() === "americana" ? "notación americana" : "notación latina";

    if (paginas === null) return `A4 · ${notacion}`;

    return `Estimado: ${paginas} ${paginas === 1 ? "página" : "páginas"} · A4 · ${notacion}`;
  });

  constructor() {
    effect(() => {
      const id = Number(this.anadir());

      if (Number.isInteger(id) && !this.estaElegida(id)) this.alternar(id);
    });
  }

  protected estaElegida(id: number): boolean {
    return this.elegidas().includes(id);
  }

  protected alternar(id: number): void {
    if (this.estaElegida(id)) {
      this.elegidas.update((elegidas) =>
        elegidas.filter((elegida) => elegida !== id),
      );
      return;
    }

    this.elegidas.update((elegidas) => [...elegidas, id]);
    this.cargarDetalle(id);
  }

  protected quitar(id: number): void {
    this.elegidas.update((elegidas) =>
      elegidas.filter((elegida) => elegida !== id),
    );
  }

  protected mover(posicion: number, salto: number): void {
    const destino = posicion + salto;

    this.elegidas.update((elegidas) => {
      if (destino < 0 || destino >= elegidas.length) return elegidas;

      const movidas = [...elegidas];
      const [sacada] = movidas.splice(posicion, 1);

      if (sacada !== undefined) movidas.splice(destino, 0, sacada);

      return movidas;
    });
  }

  protected alternarEtiqueta(id: number): void {
    this.etiquetasFiltradas.update((marcadas) =>
      marcadas.includes(id)
        ? marcadas.filter((marcada) => marcada !== id)
        : [...marcadas, id],
    );
  }

  protected estaFiltrada(id: number): boolean {
    return this.etiquetasFiltradas().includes(id);
  }

  protected alEscribir(evento: Event): void {
    if (evento.target instanceof HTMLInputElement) {
      this.texto.set(evento.target.value);
    }
  }

  protected alTitular(evento: Event): void {
    if (evento.target instanceof HTMLInputElement) {
      this.titulo.set(evento.target.value);
    }
  }

  protected async generar(): Promise<void> {
    await this.exportar((opciones) => this.pdf.descargar(opciones));
  }

  protected async vistaPrevia(): Promise<void> {
    await this.exportar((opciones) => this.pdf.abrir(opciones));
  }

  private async exportar(
    accion: (opciones: {
      titulo: string;
      canciones: readonly Cancion[];
      notacion: Notacion;
      portada: boolean;
      indice: boolean;
      numeracion: boolean;
    }) => Promise<void>,
  ): Promise<void> {
    const canciones = this.cancionesCompletas();

    if (canciones === null || canciones.length === 0 || this.generando()) return;

    this.generando.set(true);
    this.error.set(null);

    try {
      await accion({
        titulo: this.tituloEfectivo(),
        canciones,
        notacion: this.notacion(),
        portada: this.portada(),
        indice: this.indice(),
        numeracion: this.numeracion(),
      });
    } catch (fallo: unknown) {
      this.error.set(mensajeDeExportacion(fallo));
    } finally {
      this.generando.set(false);
    }
  }

  private tituloEfectivo(): string {
    const escrito = this.titulo().trim();

    return escrito === "" ? "Cancionero" : escrito;
  }

  /** El contenido solo se pide cuando la canción entra en el cancionero. */
  private cargarDetalle(id: number): void {
    if (this.detalles().has(id)) return;

    this.cancionesService
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (cancion) => {
          this.detalles.update((detalles) =>
            new Map(detalles).set(id, cancion),
          );
        },
        error: (fallo: unknown) => {
          this.error.set(mensajeDeError(fallo));
          this.quitar(id);
        },
      });
  }
}
