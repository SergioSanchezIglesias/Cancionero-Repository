import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Etiqueta } from "../interfaces/etiqueta.interface";
import { EtiquetasService } from "./etiquetas.service";

describe("EtiquetasService", () => {
  let servicio: EtiquetasService;
  let peticiones: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(EtiquetasService);
    peticiones = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    peticiones.verify();
  });

  it("pide el catálogo de etiquetas y devuelve el orden que envía la API", () => {
    const catalogo: Etiqueta[] = [
      { id: 1, nombre: "Entrada", grupo: "misa", orden: 1, total: 7 },
      { id: 4, nombre: "Ofertorio", grupo: "misa", orden: 4, total: 3 },
      {
        id: 12,
        nombre: "Alabanza",
        grupo: "adoracion_alabanza",
        orden: 12,
        total: 0,
      },
    ];

    let recibidas: Etiqueta[] = [];
    servicio.listar().subscribe((etiquetas) => (recibidas = etiquetas));

    const peticion = peticiones.expectOne("/api/etiquetas");

    expect(peticion.request.method).toBe("GET");

    peticion.flush(catalogo);

    expect(recibidas.map((etiqueta) => etiqueta.nombre)).toEqual([
      "Entrada",
      "Ofertorio",
      "Alabanza",
    ]);
  });
});
