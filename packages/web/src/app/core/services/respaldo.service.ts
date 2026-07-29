import { HttpClient, HttpParams, type HttpResponse } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import type { Observable } from "rxjs";
import type {
  EstadoRespaldo,
  ResultadoImportacion,
} from "../interfaces/respaldo.interface";

const RECURSO = "/api/respaldo";

@Injectable({ providedIn: "root" })
export class RespaldoService {
  private readonly http = inject(HttpClient);

  private readonly estadoActual = signal<EstadoRespaldo | null>(null);

  /** `null` mientras no se conoce: el aviso del panel no se pinta hasta saberlo. */
  readonly estado = this.estadoActual.asReadonly();

  /**
   * Vuelve a preguntar cuándo fue la última copia. Se llama al arrancar y
   * después de cada descarga o importación.
   * La petición se completa sola, así que no deja suscripción viva.
   */
  refrescarEstado(): void {
    this.http.get<EstadoRespaldo>(`${RECURSO}/estado`).subscribe({
      next: (estado) => this.estadoActual.set(estado),
      // Si el servidor no responde, es preferible no enseñar nada a mentir
      // diciendo que la biblioteca está respaldada.
      error: () => this.estadoActual.set(null),
    });
  }

  /** Respaldo en JSON: legible y válido aunque cambie el motor de base de datos. */
  descargarBiblioteca(): Observable<HttpResponse<Blob>> {
    return this.http.get(RECURSO, {
      observe: "response",
      responseType: "blob",
    });
  }

  /** Copia exacta del fichero SQLite, hecha en caliente con VACUUM INTO. */
  descargarBaseDeDatos(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${RECURSO}/base-de-datos`, {
      observe: "response",
      responseType: "blob",
    });
  }

  /** Reemplaza toda la biblioteca por la del respaldo. */
  importar(respaldo: unknown): Observable<ResultadoImportacion> {
    return this.http.post<ResultadoImportacion>(RECURSO, respaldo, {
      params: new HttpParams().set("reemplazar", "si"),
    });
  }
}
