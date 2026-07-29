import type { HttpResponse } from "@angular/common/http";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  Database,
  Download,
  FileJson,
  LucideAngularModule,
  RotateCcw,
  ShieldCheck,
} from "lucide-angular";
import type { Observable } from "rxjs";
import { RespaldoService } from "../../core/services/respaldo.service";
import { resumirAntiguedad } from "../../core/utils/antiguedad";
import {
  descargarFichero,
  mensajeDeDescargaFallida,
  nombreDeDescarga,
} from "../../core/utils/descarga";
import { mensajeDeError } from "../../core/utils/mensaje-error";

@Component({
  selector: "app-ajustes",
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./ajustes.page.html",
  styleUrl: "./ajustes.page.css",
})
export class AjustesPage {
  private readonly respaldo = inject(RespaldoService);
  private readonly destruccion = inject(DestroyRef);

  protected readonly iconoEstado = ShieldCheck;
  protected readonly iconoBaseDeDatos = Database;
  protected readonly iconoJson = FileJson;
  protected readonly iconoDescargar = Download;
  protected readonly iconoRestaurar = RotateCcw;

  protected readonly estado = this.respaldo.estado;

  protected readonly antiguedad = computed(() =>
    resumirAntiguedad(this.estado()?.ultimaCopia ?? null),
  );

  protected readonly descargando = signal(false);
  protected readonly errorDescarga = signal<string | null>(null);

  /** Respaldo ya leído del fichero elegido, listo para enviarlo a la API. */
  private readonly respaldoElegido = signal<unknown>(null);
  protected readonly nombreElegido = signal<string | null>(null);
  protected readonly confirmado = signal(false);
  protected readonly restaurando = signal(false);
  protected readonly errorRestauracion = signal<string | null>(null);
  protected readonly importadas = signal<number | null>(null);

  protected readonly puedeRestaurar = computed(
    () =>
      this.respaldoElegido() !== null &&
      this.confirmado() &&
      !this.restaurando(),
  );

  constructor() {
    this.respaldo.refrescarEstado();
  }

  protected descargarBaseDeDatos(): void {
    this.descargar(
      this.respaldo.descargarBaseDeDatos(),
      "cancionero.db",
      "application/vnd.sqlite3",
    );
  }

  protected descargarBiblioteca(): void {
    this.descargar(
      this.respaldo.descargarBiblioteca(),
      "cancionero.json",
      "application/json",
    );
  }

  private descargar(
    peticion: Observable<HttpResponse<Blob>>,
    nombrePorDefecto: string,
    tipo: string,
  ): void {
    if (this.descargando()) return;

    this.descargando.set(true);
    this.errorDescarga.set(null);

    peticion.pipe(takeUntilDestroyed(this.destruccion)).subscribe({
      next: (respuesta) => {
        const contenido = respuesta.body ?? new Blob([], { type: tipo });

        descargarFichero(
          contenido,
          nombreDeDescarga(
            respuesta.headers.get("Content-Disposition"),
            nombrePorDefecto,
          ),
        );

        this.descargando.set(false);
        this.respaldo.refrescarEstado();
      },
      error: (fallo: unknown) => {
        this.errorDescarga.set(mensajeDeDescargaFallida(fallo));
        this.descargando.set(false);
      },
    });
  }

  protected alElegirFichero(evento: Event): void {
    const selector = evento.target;

    if (!(selector instanceof HTMLInputElement)) return;

    const fichero = selector.files?.[0];

    this.olvidarFicheroElegido();

    if (fichero === undefined) return;

    void fichero.text().then((texto) => this.leerRespaldo(texto, fichero.name));
  }

  private leerRespaldo(texto: string, nombre: string): void {
    try {
      this.respaldoElegido.set(JSON.parse(texto));
      this.nombreElegido.set(nombre);
    } catch {
      this.errorRestauracion.set(
        `«${nombre}» no es un respaldo válido: el fichero no contiene JSON.`,
      );
    }
  }

  private olvidarFicheroElegido(): void {
    this.respaldoElegido.set(null);
    this.nombreElegido.set(null);
    this.confirmado.set(false);
    this.errorRestauracion.set(null);
    this.importadas.set(null);
  }

  protected alternarConfirmacion(): void {
    this.confirmado.update((confirmado) => !confirmado);
  }

  protected restaurar(): void {
    const respaldo = this.respaldoElegido();

    if (respaldo === null || !this.confirmado() || this.restaurando()) return;

    this.restaurando.set(true);
    this.errorRestauracion.set(null);

    this.respaldo
      .importar(respaldo)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (resultado) => {
          this.importadas.set(resultado.importadas);
          this.restaurando.set(false);
          this.confirmado.set(false);
          this.respaldo.refrescarEstado();
        },
        error: (fallo: unknown) => {
          this.errorRestauracion.set(mensajeDeError(fallo));
          this.restaurando.set(false);
        },
      });
  }
}
