import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CancionResumen } from "../../core/interfaces/cancion.interface";
import type { Etiqueta } from "../../core/interfaces/etiqueta.interface";
import { BibliotecaPage } from "./biblioteca.page";

const CATALOGO: Etiqueta[] = [
  { id: 1, nombre: "Entrada", grupo: "misa", orden: 1, total: 2 },
  { id: 4, nombre: "Ofertorio", grupo: "misa", orden: 4, total: 1 },
  {
    id: 12,
    nombre: "Alabanza",
    grupo: "adoracion_alabanza",
    orden: 12,
    total: 1,
  },
];

const CANCIONES: CancionResumen[] = [
  { id: 3, titulo: "Alma misionera", tonoOriginal: "RE", etiquetas: [4] },
  { id: 1, titulo: "Ven a celebrar", tonoOriginal: "SOL", etiquetas: [1, 12] },
];

describe("BibliotecaPage", () => {
  let fixture: ComponentFixture<BibliotecaPage>;
  let peticiones: HttpTestingController;

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? "";
  }

  function filas(): HTMLElement[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        ".fila",
      ),
    ];
  }

  async function pintar(
    canciones: CancionResumen[] = CANCIONES,
    catalogo: Etiqueta[] = CATALOGO,
  ): Promise<void> {
    fixture = TestBed.createComponent(BibliotecaPage);
    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(catalogo);
    peticiones.expectOne("/api/canciones").flush(canciones);

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
  });

  afterEach(() => {
    peticiones.verify();
  });

  it("pinta una fila por canción con su tono original", async () => {
    await pintar();

    expect(filas()).toHaveLength(2);
    expect(filas()[0]?.textContent).toContain("Alma misionera");
    expect(filas()[0]?.textContent).toContain("RE");
  });

  it("la fila lleva al visor y el lápiz al editor", async () => {
    await pintar();

    const primera = filas()[0];

    expect(primera?.querySelector(".fila__enlace")?.getAttribute("href")).toBe(
      "/canciones/3",
    );
    expect(primera?.querySelector(".fila__accion")?.getAttribute("href")).toBe(
      "/canciones/3/editar",
    );
  });

  it("traduce los identificadores de etiqueta a sus nombres", async () => {
    await pintar();

    const segunda = filas()[1]?.textContent ?? "";

    expect(segunda).toContain("Entrada");
    expect(segunda).toContain("Alabanza");
  });

  it("agrupa los chips en Misa y Adoración y Alabanza", async () => {
    await pintar();

    expect(texto()).toContain("Misa");
    expect(texto()).toContain("Adoración y Alabanza");
  });

  it("cuenta las canciones que se están mostrando", async () => {
    await pintar();

    expect(texto()).toContain("2 canciones");
  });

  it("con una sola canción el contador va en singular", async () => {
    await pintar([CANCIONES[0] as CancionResumen]);

    expect(texto()).toContain("1 canción");
  });

  it("sin canciones y sin filtro invita a crear la primera", async () => {
    await pintar([]);

    expect(texto()).toContain("Todavía no hay canciones");
  });

  it("marcar una etiqueta vuelve a pedir el listado filtrado", async () => {
    await pintar();

    const chip = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        ".chip",
      ),
    ].find((boton) => boton.textContent?.includes("Ofertorio"));

    chip?.click();
    await fixture.whenStable();

    const peticion = peticiones.expectOne(
      (candidata) => candidata.params.get("etiquetas") === "4",
    );

    peticion.flush([CANCIONES[0] as CancionResumen]);
    await fixture.whenStable();

    expect(filas()).toHaveLength(1);
  });

  it("si la API falla se muestra su mensaje de error", async () => {
    fixture = TestBed.createComponent(BibliotecaPage);
    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(CATALOGO);
    peticiones
      .expectOne("/api/canciones")
      .flush(
        { error: "Error interno del servidor." },
        { status: 500, statusText: "Server Error" },
      );

    await fixture.whenStable();

    expect(texto()).toContain("Error interno del servidor.");
  });
});
