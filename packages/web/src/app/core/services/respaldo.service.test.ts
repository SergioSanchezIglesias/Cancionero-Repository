import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EstadoRespaldo } from "../interfaces/respaldo.interface";
import { RespaldoService } from "./respaldo.service";

const AL_DIA: EstadoRespaldo = {
  ultimaCopia: "2026-03-12T10:00:00Z",
  canciones: 42,
  hayCambiosSinRespaldar: false,
};

describe("RespaldoService", () => {
  let servicio: RespaldoService;
  let peticiones: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(RespaldoService);
    peticiones = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    peticiones.verify();
  });

  describe("estado", () => {
    it("empieza sin conocer el estado", () => {
      expect(servicio.estado()).toBeNull();
    });

    it("al refrescar pregunta a la API y guarda la respuesta", () => {
      servicio.refrescarEstado();

      const peticion = peticiones.expectOne("/api/respaldo/estado");

      expect(peticion.request.method).toBe("GET");

      peticion.flush(AL_DIA);

      expect(servicio.estado()).toEqual(AL_DIA);
    });

    it("si la API falla, el estado se queda sin conocer y no revienta", () => {
      servicio.refrescarEstado();

      peticiones
        .expectOne("/api/respaldo/estado")
        .flush(
          { error: "Error interno del servidor." },
          { status: 500, statusText: "Server Error" },
        );

      expect(servicio.estado()).toBeNull();
    });
  });

  describe("descargas", () => {
    it("pide el respaldo JSON como fichero", () => {
      servicio.descargarBiblioteca().subscribe();

      const peticion = peticiones.expectOne("/api/respaldo");

      expect(peticion.request.method).toBe("GET");
      expect(peticion.request.responseType).toBe("blob");
    });

    it("pide la base de datos como fichero", () => {
      servicio.descargarBaseDeDatos().subscribe();

      const peticion = peticiones.expectOne("/api/respaldo/base-de-datos");

      expect(peticion.request.method).toBe("GET");
      expect(peticion.request.responseType).toBe("blob");
    });

    it("devuelve la respuesta completa, para poder leer el nombre del fichero", () => {
      let cabecera: string | null = null;

      servicio.descargarBiblioteca().subscribe((respuesta) => {
        cabecera = respuesta.headers.get("Content-Disposition");
      });

      peticiones.expectOne("/api/respaldo").flush(new Blob(["{}"]), {
        headers: {
          "Content-Disposition": 'attachment; filename="cancionero-hoy.json"',
        },
      });

      expect(cabecera).toBe('attachment; filename="cancionero-hoy.json"');
    });
  });

  describe("importar", () => {
    const RESPALDO = { version: 1, generadoEn: "hoy", canciones: [] };

    it("envía el respaldo confirmando el reemplazo", () => {
      servicio.importar(RESPALDO).subscribe();

      const peticion = peticiones.expectOne(
        (candidata) => candidata.url === "/api/respaldo",
      );

      expect(peticion.request.method).toBe("POST");
      expect(peticion.request.params.get("reemplazar")).toBe("si");
      expect(peticion.request.body).toEqual(RESPALDO);

      peticion.flush({ importadas: 0 });
    });

    it("devuelve cuántas canciones se han importado", () => {
      let importadas = 0;

      servicio
        .importar(RESPALDO)
        .subscribe((resultado) => (importadas = resultado.importadas));

      peticiones
        .expectOne((candidata) => candidata.url === "/api/respaldo")
        .flush({ importadas: 12 });

      expect(importadas).toBe(12);
    });
  });
});
