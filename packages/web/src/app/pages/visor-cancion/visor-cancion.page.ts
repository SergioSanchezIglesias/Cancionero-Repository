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
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import {
  cambiarNotacion,
  tonoDeLectura,
  type Notacion,
  type OpcionesDeLectura,
} from "@cancionero/chords";
import {
  ArrowLeft,
  BookOpen,
  Download,
  LucideAngularModule,
  Music,
  Pencil,
  RotateCcw,
} from "lucide-angular";
import { catchError, of } from "rxjs";
import type { Cancion } from "../../core/interfaces/cancion.interface";
import type { Etiqueta } from "../../core/interfaces/etiqueta.interface";
import { CancionesService } from "../../core/services/canciones.service";
import { CancioneroPdfService } from "../../core/services/cancionero-pdf.service";
import { EtiquetasService } from "../../core/services/etiquetas.service";
import { resumirAntiguedad } from "../../core/utils/antiguedad";
import { mensajeDeExportacion } from "../../core/pdf/error-exportacion";
import { mensajeDeError } from "../../core/utils/mensaje-error";
import { LetraConAcordesComponent } from "../../shared/components/letra-con-acordes/letra-con-acordes.component";

/**
 * Más de once semitonos no aporta nada: doce es la misma canción una octava
 * más arriba, así que el recorrido útil se acaba ahí.
 */
const SEMITONOS_MAXIMO = 11;

/** Escalas del texto de la canción. La tercera es el tamaño de la PRD §15.5. */
const ESCALAS = [0.8, 0.9, 1, 1.15, 1.3, 1.5] as const;

/** Posición dentro de `ESCALAS`, no un factor: se arranca en el 1. */
const NIVEL_POR_DEFECTO = 2;

@Component({
  selector: "app-visor-cancion",
  imports: [RouterLink, LucideAngularModule, LetraConAcordesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./visor-cancion.page.html",
  styleUrl: "./visor-cancion.page.css",
  host: {
    "[style.--escala-lectura]": "escala()",
  },
})
export class VisorCancionPage {
  private readonly cancionesService = inject(CancionesService);
  private readonly etiquetasService = inject(EtiquetasService);
  private readonly pdf = inject(CancioneroPdfService);
  private readonly destruccion = inject(DestroyRef);

  /** Llega de la ruta `/canciones/:id`. */
  readonly id = input<string>();

  protected readonly iconoVolver = ArrowLeft;
  protected readonly iconoEditar = Pencil;
  protected readonly iconoCancionero = BookOpen;
  protected readonly iconoPdf = Download;
  protected readonly iconoOriginal = RotateCcw;
  protected readonly iconoTono = Music;

  protected readonly cancion = signal<Cancion | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(true);
  protected readonly descargando = signal(false);

  /**
   * Transposición y notación son estado de *lectura*: viven aquí y no se
   * guardan nunca. En la base de datos la canción conserva su tono original.
   */
  protected readonly semitonos = signal(0);
  protected readonly notacion = signal<Notacion>("latina");
  private readonly nivelDeTamano = signal(NIVEL_POR_DEFECTO);

  protected readonly escala = computed(
    () => ESCALAS[this.nivelDeTamano()] ?? 1,
  );

  private readonly etiquetas = toSignal(
    this.etiquetasService.listar().pipe(catchError(() => of<Etiqueta[]>([]))),
    { initialValue: [] as Etiqueta[] },
  );

  protected readonly lectura = computed<OpcionesDeLectura | null>(() => {
    const cancion = this.cancion();

    if (cancion === null) return null;

    return {
      tonoOriginal: cancion.tonoOriginal,
      semitonos: this.semitonos(),
      notacion: this.notacion(),
    };
  });

  protected readonly estaTranspuesta = computed(() => this.semitonos() !== 0);

  /** Tono al que suena ahora mismo, ya en la notación elegida. */
  protected readonly tonoActual = computed(() => {
    const lectura = this.lectura();

    if (lectura === null) return "";

    return cambiarNotacion(tonoDeLectura(lectura), lectura.notacion);
  });

  /** Tono en el que está escrita, para el botón de volver al original. */
  protected readonly tonoOriginal = computed(() => {
    const cancion = this.cancion();

    if (cancion === null) return "";

    return cambiarNotacion(cancion.tonoOriginal, this.notacion());
  });

  /**
   * La transposición es solo para tocar. Conviene decirlo donde se ve el
   * estado, no sea que alguien crea que ha cambiado la canción.
   */
  protected readonly explicacionDelEstado = computed(() => {
    const cancion = this.cancion();

    if (cancion === null || !this.estaTranspuesta()) {
      return "Suena en el tono en el que está escrita.";
    }

    return `Se lee en ${this.tonoActual()}, pero la canción sigue guardada en ${cancion.tonoOriginal}.`;
  });

  protected readonly editada = computed(() => {
    const cancion = this.cancion();

    return cancion === null ? "" : resumirAntiguedad(cancion.editadoEn);
  });

  protected readonly nombresDeEtiquetas = computed(() => {
    const cancion = this.cancion();

    if (cancion === null) return [];

    const nombres = new Map(
      this.etiquetas().map((etiqueta) => [etiqueta.id, etiqueta.nombre]),
    );

    return cancion.etiquetas
      .map((id) => nombres.get(id))
      .filter((nombre): nombre is string => nombre !== undefined);
  });

  constructor() {
    effect(() => {
      const id = this.id();

      if (id !== undefined) this.cargar(Number(id));
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.cancionesService
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (cancion) => {
          this.cancion.set(cancion);
          // Cada canción se abre en su tono y en la notación con la que se
          // escribió; lo que hubiera puesto a mano en la anterior no arrastra.
          this.semitonos.set(0);
          this.notacion.set(cancion.notacionPorDefecto);
          this.cargando.set(false);
        },
        error: (fallo: unknown) => {
          this.error.set(mensajeDeError(fallo));
          this.cargando.set(false);
        },
      });
  }

  protected puedeTransponer(semitonos: number): boolean {
    const destino = this.semitonos() + semitonos;

    return Math.abs(destino) <= SEMITONOS_MAXIMO;
  }

  protected transponer(semitonos: number): void {
    if (!this.puedeTransponer(semitonos)) return;

    this.semitonos.update((actual) => actual + semitonos);
  }

  protected volverAlOriginal(): void {
    this.semitonos.set(0);
  }

  protected usarNotacion(notacion: Notacion): void {
    this.notacion.set(notacion);
  }

  protected puedeAgrandar(): boolean {
    return this.nivelDeTamano() < ESCALAS.length - 1;
  }

  protected puedeReducir(): boolean {
    return this.nivelDeTamano() > 0;
  }

  protected agrandar(): void {
    if (this.puedeAgrandar()) this.nivelDeTamano.update((nivel) => nivel + 1);
  }

  /**
   * Descarga esta canción sola, tal como se está viendo: si está transpuesta,
   * el PDF sale transpuesto. Es lo que espera quien pulsa el botón mirando la
   * pantalla; lo guardado sigue intacto.
   */
  protected async descargarPdf(): Promise<void> {
    const cancion = this.cancion();

    if (cancion === null || this.descargando()) return;

    this.descargando.set(true);
    this.error.set(null);

    try {
      await this.pdf.descargar({
        titulo: cancion.titulo,
        canciones: [cancion],
        notacion: this.notacion(),
        semitonos: this.semitonos(),
        portada: false,
        indice: false,
        numeracion: false,
      });
    } catch (fallo: unknown) {
      this.error.set(mensajeDeExportacion(fallo));
    } finally {
      this.descargando.set(false);
    }
  }

  protected reducir(): void {
    if (this.puedeReducir()) this.nivelDeTamano.update((nivel) => nivel - 1);
  }
}
