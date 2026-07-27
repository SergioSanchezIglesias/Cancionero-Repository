import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Observable } from "rxjs";
import type {
  Cancion,
  CancionResumen,
  NuevaCancion,
} from "../interfaces/cancion.interface";
import type { FiltroCanciones } from "../interfaces/filtro-canciones.interface";

const RECURSO = "/api/canciones";

@Injectable({ providedIn: "root" })
export class CancionesService {
  private readonly http = inject(HttpClient);

  listar(filtro: FiltroCanciones): Observable<CancionResumen[]> {
    let parametros = new HttpParams();

    const buscar = filtro.buscar.trim();
    if (buscar !== "") parametros = parametros.set("buscar", buscar);

    // La API acepta las etiquetas separadas por comas y las resuelve con OR.
    if (filtro.etiquetas.length > 0) {
      parametros = parametros.set("etiquetas", filtro.etiquetas.join(","));
    }

    return this.http.get<CancionResumen[]>(RECURSO, { params: parametros });
  }

  obtener(id: number): Observable<Cancion> {
    return this.http.get<Cancion>(`${RECURSO}/${id}`);
  }

  crear(datos: NuevaCancion): Observable<Cancion> {
    return this.http.post<Cancion>(RECURSO, datos);
  }

  actualizar(id: number, datos: NuevaCancion): Observable<Cancion> {
    return this.http.put<Cancion>(`${RECURSO}/${id}`, datos);
  }
}
