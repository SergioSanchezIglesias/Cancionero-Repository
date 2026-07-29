import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
  type ElementRef,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import { TONOS } from "@cancionero/chords";
import { ArrowLeft, Bold, Check, LucideAngularModule, Music } from "lucide-angular";
import { catchError, of } from "rxjs";
import type {
  Cancion,
  NuevaCancion,
} from "../../core/interfaces/cancion.interface";
import {
  GRUPOS_DE_ETIQUETA,
  type Etiqueta,
} from "../../core/interfaces/etiqueta.interface";
import { CancionesService } from "../../core/services/canciones.service";
import { EtiquetasService } from "../../core/services/etiquetas.service";
import { mensajeDeError } from "../../core/utils/mensaje-error";
import { LetraConAcordesComponent } from "../../shared/components/letra-con-acordes/letra-con-acordes.component";
import {
  alternarNegrita,
  insertarAcorde,
  type Resultado,
  type Seleccion,
} from "./marcado-chordpro";

const TONO_POR_DEFECTO = "SOL";

@Component({
  selector: "app-editor-cancion",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    LetraConAcordesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./editor-cancion.page.html",
  styleUrl: "./editor-cancion.page.css",
})
export class EditorCancionPage {
  private readonly cancionesService = inject(CancionesService);
  private readonly etiquetasService = inject(EtiquetasService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  /** Llega de la ruta `/canciones/:id/editar`. Vacío al crear una nueva. */
  readonly id = input<string>();

  protected readonly iconoVolver = ArrowLeft;
  protected readonly iconoGuardar = Check;
  protected readonly iconoNegrita = Bold;
  protected readonly iconoAcorde = Music;

  protected readonly tonos = TONOS;

  private readonly areaContenido =
    viewChild<ElementRef<HTMLTextAreaElement>>("areaContenido");

  protected readonly formulario = new FormGroup({
    titulo: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    contenido: new FormControl("", { nonNullable: true }),
    tonoOriginal: new FormControl(TONO_POR_DEFECTO, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    cantoralOrigen: new FormControl("", { nonNullable: true }),
  });

  protected readonly etiquetasMarcadas = signal<readonly number[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(false);

  /** El título y el contenido alimentan la vista previa mientras se escribe. */
  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  protected readonly titulo = computed(() => this.valores().titulo ?? "");
  protected readonly contenido = computed(() => this.valores().contenido ?? "");

  protected readonly esNueva = computed(() => this.id() === undefined);

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

  constructor() {
    effect(() => {
      const id = this.id();

      if (id !== undefined) this.cargar(Number(id));
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);

    this.cancionesService
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (cancion) => {
          this.volcarEnFormulario(cancion);
          this.cargando.set(false);
        },
        error: (fallo: unknown) => {
          this.error.set(mensajeDeError(fallo));
          this.cargando.set(false);
        },
      });
  }

  private volcarEnFormulario(cancion: Cancion): void {
    this.formulario.setValue({
      titulo: cancion.titulo,
      contenido: cancion.contenido,
      tonoOriginal: cancion.tonoOriginal,
      cantoralOrigen: cancion.cantoralOrigen ?? "",
    });

    this.etiquetasMarcadas.set(cancion.etiquetas);
  }

  protected estaMarcada(id: number): boolean {
    return this.etiquetasMarcadas().includes(id);
  }

  protected alternarEtiqueta(id: number): void {
    this.etiquetasMarcadas.update((marcadas) =>
      marcadas.includes(id)
        ? marcadas.filter((marcada) => marcada !== id)
        : [...marcadas, id],
    );
  }

  protected marcarEstribillo(): void {
    this.aplicarAtajo(alternarNegrita);
  }

  protected insertarAcorde(): void {
    this.aplicarAtajo(insertarAcorde);
  }

  private aplicarAtajo(atajo: (seleccion: Seleccion) => Resultado): void {
    const area = this.areaContenido()?.nativeElement;
    if (area === undefined) return;

    const resultado = atajo({
      texto: area.value,
      desde: area.selectionStart,
      hasta: area.selectionEnd,
    });

    this.formulario.controls.contenido.setValue(resultado.texto);

    area.value = resultado.texto;
    area.focus();
    area.setSelectionRange(resultado.cursor, resultado.cursor);
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const cantoral = valores.cantoralOrigen.trim();

    const datos: NuevaCancion = {
      titulo: valores.titulo.trim(),
      contenido: valores.contenido,
      tonoOriginal: valores.tonoOriginal,
      // La notación americana es solo presentación: se persiste siempre latina.
      notacionPorDefecto: "latina",
      cantoralOrigen: cantoral === "" ? null : cantoral,
      etiquetas: this.etiquetasMarcadas(),
    };

    const id = this.id();

    this.guardando.set(true);
    this.error.set(null);

    const peticion =
      id === undefined
        ? this.cancionesService.crear(datos)
        : this.cancionesService.actualizar(Number(id), datos);

    peticion.pipe(takeUntilDestroyed(this.destruccion)).subscribe({
      next: () => {
        this.guardando.set(false);
        void this.router.navigate(["/biblioteca"]);
      },
      error: (fallo: unknown) => {
        this.error.set(mensajeDeError(fallo));
        this.guardando.set(false);
      },
    });
  }
}
