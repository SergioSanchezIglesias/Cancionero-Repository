import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Observable } from "rxjs";
import type { Etiqueta } from "../interfaces/etiqueta.interface";

const RECURSO = "/api/etiquetas";

@Injectable({ providedIn: "root" })
export class EtiquetasService {
  private readonly http = inject(HttpClient);

  /** Devuelve el catálogo completo, ya ordenado por el orden de la celebración. */
  listar(): Observable<Etiqueta[]> {
    return this.http.get<Etiqueta[]>(RECURSO);
  }
}
