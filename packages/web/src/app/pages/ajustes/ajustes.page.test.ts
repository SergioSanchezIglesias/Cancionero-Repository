import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoRespaldo } from "../../core/interfaces/respaldo.interface";
import { AjustesPage } from "./ajustes.page";

const AL_DIA: EstadoRespaldo = {
  ultimaCopia: new Date().toISOString(),
  canciones: 42,
  hayCambiosSinRespaldar: false,
};

const SIN_COPIA: EstadoRespaldo = {
  ultimaCopia: null,
  canciones: 3,
  hayCambiosSinRespaldar: true,
};

const RESPALDO = {
  version: 1,
  generadoEn: "2026-03-12T10:00:00.000Z",
  canciones: [],
};

describe("AjustesPage", () => {
  let fixture: ComponentFixture<AjustesPage>;
  let peticiones: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? "";
  }

  function boton(prueba: string): HTMLButtonElement {
    const encontrado = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(`[data-prueba="${prueba}"]`);

    if (encontrado === null) {
      throw new Error(`No se ha encontrado el botón «${prueba}».`);
    }

    return encontrado;
  }

  async function pintar(estado: EstadoRespaldo = AL_DIA): Promise<void> {
    fixture = TestBed.createComponent(AjustesPage);
    await fixture.whenStable();

    peticiones.expectOne("/api/respaldo/estado").flush(estado);

    await fixture.whenStable();
  }

  /** Simula que el usuario ha elegido un fichero en el selector. */
  async function elegirFichero(contenido: string): Promise<void> {
    const fichero = new File([contenido], "cancionero-2026-03-12.json", {
      type: "application/json",
    });

    const selector = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>('input[type="file"]');

    if (selector === null) throw new Error("No hay selector de fichero.");

    Object.defineProperty(selector, "files", { value: [fichero] });
    selector.dispatchEvent(new Event("change"));

    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    peticiones = TestBed.inject(HttpTestingController);

    // Descargar de verdad abriría un fichero en el navegador de pruebas.
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:falso");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    peticiones.verify();
    vi.restoreAllMocks();
  });

  describe("estado de la copia", () => {
    it("muestra cuándo se hizo la última copia y cuántas canciones hay", async () => {
      await pintar();

      expect(texto()).toContain("Hoy");
      expect(texto()).toContain("42");
    });

    it("avisa cuando nunca se ha hecho una copia", async () => {
      await pintar(SIN_COPIA);

      expect(texto()).toContain("Nunca");
      expect(texto()).toMatch(/sin respaldar/i);
    });

    it("no avisa si la copia está al día", async () => {
      await pintar();

      expect(texto()).not.toMatch(/sin respaldar/i);
    });
  });

  describe("descargar la base de datos", () => {
    it("pide el fichero y lo entrega al navegador", async () => {
      await pintar();

      boton("descargar-bd").click();
      await fixture.whenStable();

      peticiones
        .expectOne("/api/respaldo/base-de-datos")
        .flush(new Blob(["SQLite format 3"]), {
          headers: {
            "Content-Disposition":
              'attachment; filename="cancionero-2026-03-12.db"',
          },
        });

      await fixture.whenStable();

      peticiones.expectOne("/api/respaldo/estado").flush(AL_DIA);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it("tras descargar vuelve a preguntar el estado, para refrescar la fecha", async () => {
      await pintar(SIN_COPIA);

      boton("descargar-bd").click();
      await fixture.whenStable();

      peticiones
        .expectOne("/api/respaldo/base-de-datos")
        .flush(new Blob(["SQLite format 3"]));

      await fixture.whenStable();

      peticiones.expectOne("/api/respaldo/estado").flush(AL_DIA);
      await fixture.whenStable();

      expect(texto()).not.toMatch(/sin respaldar/i);
    });

    it("si la descarga falla lo dice y no se queda pensando", async () => {
      await pintar();

      boton("descargar-bd").click();
      await fixture.whenStable();

      peticiones
        .expectOne("/api/respaldo/base-de-datos")
        .flush(
          new Blob([JSON.stringify({ error: "Error interno del servidor." })]),
          { status: 500, statusText: "Server Error" },
        );

      await fixture.whenStable();

      expect(texto()).toContain("No se ha podido preparar la copia.");
      expect(boton("descargar-bd").disabled).toBe(false);
    });
  });

  describe("descargar el respaldo JSON", () => {
    it("pide el fichero JSON", async () => {
      await pintar();

      boton("descargar-json").click();
      await fixture.whenStable();

      peticiones.expectOne("/api/respaldo").flush(new Blob(["{}"]));

      await fixture.whenStable();

      peticiones.expectOne("/api/respaldo/estado").flush(AL_DIA);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe("restaurar desde un respaldo JSON", () => {
    it("no deja restaurar sin elegir fichero", async () => {
      await pintar();

      expect(boton("restaurar").disabled).toBe(true);
    });

    it("no deja restaurar hasta confirmar que se reemplaza la biblioteca", async () => {
      await pintar();
      await elegirFichero(JSON.stringify(RESPALDO));

      expect(boton("restaurar").disabled).toBe(true);
    });

    it("con fichero y confirmación, envía el respaldo a la API", async () => {
      await pintar();
      await elegirFichero(JSON.stringify(RESPALDO));

      boton("confirmar-reemplazo").click();
      await fixture.whenStable();

      boton("restaurar").click();
      await fixture.whenStable();

      const peticion = peticiones.expectOne(
        (candidata) =>
          candidata.url === "/api/respaldo" && candidata.method === "POST",
      );

      expect(peticion.request.body).toEqual(RESPALDO);

      peticion.flush({ importadas: 7 });
      await fixture.whenStable();

      peticiones.expectOne("/api/respaldo/estado").flush(AL_DIA);
      await fixture.whenStable();

      expect(texto()).toContain("7");
    });

    it("rechaza un fichero que no es JSON antes de llamar a la API", async () => {
      await pintar();

      await elegirFichero("esto no es json");

      expect(texto()).toMatch(/no es un respaldo v[áa]lido/i);
      expect(boton("restaurar").disabled).toBe(true);
    });

    it("enseña el error que devuelve la API", async () => {
      await pintar();
      await elegirFichero(JSON.stringify(RESPALDO));

      boton("confirmar-reemplazo").click();
      await fixture.whenStable();

      boton("restaurar").click();
      await fixture.whenStable();

      peticiones
        .expectOne(
          (candidata) =>
            candidata.url === "/api/respaldo" && candidata.method === "POST",
        )
        .flush(
          { error: "Estas etiquetas no están en el catálogo: Villancicos." },
          { status: 400, statusText: "Bad Request" },
        );

      await fixture.whenStable();

      expect(texto()).toContain("Villancicos");
    });
  });
});
