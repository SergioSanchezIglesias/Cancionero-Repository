import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { NuevaCancion } from "../interfaces/cancion.interface";
import { FILTRO_VACIO } from "../interfaces/filtro-canciones.interface";
import { CancionesService } from "./canciones.service";

describe("CancionesService", () => {
  let servicio: CancionesService;
  let peticiones: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(CancionesService);
    peticiones = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    peticiones.verify();
  });

  it("sin filtro pide el listado completo, sin parámetros", () => {
    servicio.listar(FILTRO_VACIO).subscribe();

    const peticion = peticiones.expectOne("/api/canciones");

    expect(peticion.request.method).toBe("GET");
    expect(peticion.request.params.keys()).toEqual([]);

    peticion.flush([]);
  });

  it("manda el texto de búsqueda recortado", () => {
    servicio.listar({ buscar: "  comunion  ", etiquetas: [] }).subscribe();

    const peticion = peticiones.expectOne(
      (candidata) => candidata.params.get("buscar") === "comunion",
    );

    expect(peticion.request.params.has("etiquetas")).toBe(false);

    peticion.flush([]);
  });

  it("una búsqueda de solo espacios no viaja como parámetro", () => {
    servicio.listar({ buscar: "   ", etiquetas: [] }).subscribe();

    const peticion = peticiones.expectOne("/api/canciones");

    expect(peticion.request.params.has("buscar")).toBe(false);

    peticion.flush([]);
  });

  it("varias etiquetas viajan separadas por comas para el filtro OR", () => {
    servicio.listar({ buscar: "", etiquetas: [4, 7] }).subscribe();

    const peticion = peticiones.expectOne(
      (candidata) => candidata.params.get("etiquetas") === "4,7",
    );

    peticion.flush([]);
  });

  it("combina búsqueda y etiquetas en la misma petición", () => {
    servicio.listar({ buscar: "maria", etiquetas: [9] }).subscribe();

    const peticion = peticiones.expectOne(
      (candidata) =>
        candidata.params.get("buscar") === "maria" &&
        candidata.params.get("etiquetas") === "9",
    );

    peticion.flush([]);
  });

  it("crear envía la canción por POST", () => {
    const datos: NuevaCancion = {
      titulo: "Ven a celebrar",
      contenido: "[SOL]VEN A CELE[SIm]BRAR",
      tonoOriginal: "SOL",
      notacionPorDefecto: "latina",
      cantoralOrigen: null,
      etiquetas: [1],
    };

    servicio.crear(datos).subscribe();

    const peticion = peticiones.expectOne("/api/canciones");

    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual(datos);

    peticion.flush({ ...datos, id: 1 });
  });

  it("actualizar envía la canción por PUT a su identificador", () => {
    const datos: NuevaCancion = {
      titulo: "Ven a celebrar",
      contenido: "[SOL]VEN A CELE[SIm]BRAR",
      tonoOriginal: "SOL",
      notacionPorDefecto: "latina",
      cantoralOrigen: "Abrir Abrir",
      etiquetas: [],
    };

    servicio.actualizar(12, datos).subscribe();

    const peticion = peticiones.expectOne("/api/canciones/12");

    expect(peticion.request.method).toBe("PUT");

    peticion.flush({ ...datos, id: 12 });
  });

  it("obtener pide una canción concreta", () => {
    servicio.obtener(3).subscribe();

    const peticion = peticiones.expectOne("/api/canciones/3");

    expect(peticion.request.method).toBe("GET");

    peticion.flush({});
  });
});
