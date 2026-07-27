import { computed, Injectable, signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { debounceTime, distinctUntilChanged } from "rxjs";
import type { FiltroCanciones } from "../interfaces/filtro-canciones.interface";

/** Reposo del buscador: evita una petición por tecla sin que se note al teclear. */
const REPOSO_BUSQUEDA_MS = 250;

/**
 * Estado del filtro de la biblioteca. Vive en la raíz a propósito: al volver
 * del editor la biblioteca conserva la búsqueda y las etiquetas marcadas.
 */
@Injectable({ providedIn: "root" })
export class FiltroBibliotecaService {
  /** Lo que hay escrito ahora mismo en el buscador. */
  readonly texto = signal("");

  /** Etiquetas marcadas. Varias se combinan con lógica OR. */
  readonly etiquetas = signal<readonly number[]>([]);

  private readonly textoEnReposo = toSignal(
    toObservable(this.texto).pipe(
      debounceTime(REPOSO_BUSQUEDA_MS),
      distinctUntilChanged(),
    ),
    { initialValue: "" },
  );

  readonly filtro = computed<FiltroCanciones>(() => ({
    buscar: this.textoEnReposo(),
    etiquetas: this.etiquetas(),
  }));

  readonly hayFiltro = computed(
    () => this.texto().trim() !== "" || this.etiquetas().length > 0,
  );

  escribir(texto: string): void {
    this.texto.set(texto);
  }

  estaMarcada(id: number): boolean {
    return this.etiquetas().includes(id);
  }

  alternarEtiqueta(id: number): void {
    this.etiquetas.update((marcadas) =>
      marcadas.includes(id)
        ? marcadas.filter((marcada) => marcada !== id)
        : [...marcadas, id],
    );
  }

  limpiar(): void {
    this.texto.set("");
    this.etiquetas.set([]);
  }
}
