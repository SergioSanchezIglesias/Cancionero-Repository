import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cancion } from "../../core/interfaces/cancion.interface";
import type { Etiqueta } from "../../core/interfaces/etiqueta.interface";
import { EditorCancionPage } from "./editor-cancion.page";

const CATALOGO: Etiqueta[] = [
  { id: 1, nombre: "Entrada", grupo: "misa", orden: 1, total: 2 },
  { id: 4, nombre: "Ofertorio", grupo: "misa", orden: 4, total: 1 },
];

const CANCION: Cancion = {
  id: 9,
  titulo: "Ven a celebrar",
  contenido: "**[SOL]VEN A CELE[SIm]BRAR**",
  tonoOriginal: "SOL",
  notacionPorDefecto: "latina",
  cantoralOrigen: "Abrir Abrir",
  creadoEn: "2026-01-01 10:00:00",
  editadoEn: "2026-01-01 10:00:00",
  etiquetas: [4],
};

describe("EditorCancionPage", () => {
  let fixture: ComponentFixture<EditorCancionPage>;
  let peticiones: HttpTestingController;

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function campo(nombre: string): HTMLInputElement {
    const encontrado = elemento().querySelector<HTMLInputElement>(
      `[formcontrolname="${nombre}"]`,
    );

    if (encontrado === null) throw new Error(`No existe el campo ${nombre}`);

    return encontrado;
  }

  function escribir(nombre: string, valor: string): void {
    const entrada = campo(nombre);
    entrada.value = valor;
    entrada.dispatchEvent(new Event("input"));
  }

  function pulsarChip(nombre: string): void {
    const chip = [...elemento().querySelectorAll<HTMLElement>(".chip")].find(
      (boton) => boton.textContent?.trim() === nombre,
    );

    chip?.click();
  }

  async function crearEditor(id?: string): Promise<void> {
    fixture = TestBed.createComponent(EditorCancionPage);

    if (id !== undefined) fixture.componentRef.setInput("id", id);

    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(CATALOGO);

    if (id !== undefined) {
      peticiones.expectOne(`/api/canciones/${id}`).flush(CANCION);
    }

    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // Al guardar se navega a la biblioteca: la ruta tiene que existir.
        provideRouter([{ path: "biblioteca", children: [] }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    peticiones = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    peticiones.verify();
  });

  it("sin identificador se presenta como una canción nueva", async () => {
    await crearEditor();

    expect(elemento().textContent).toContain("Nueva canción");
  });

  it("con identificador carga la canción y la vuelca en el formulario", async () => {
    await crearEditor("9");

    expect(elemento().textContent).toContain("Editar canción");
    expect(campo("titulo").value).toBe("Ven a celebrar");
    expect(campo("cantoralOrigen").value).toBe("Abrir Abrir");
  });

  it("la vista previa muestra lo que se escribe, sin esperar a guardar", async () => {
    await crearEditor();

    escribir("contenido", "[SOL]VEN A CELE[SIm]BRAR");
    await fixture.whenStable();

    const acordes = [
      ...elemento().querySelectorAll(".segmento__acorde"),
    ].map((nodo) => nodo.textContent);

    expect(acordes).toEqual(["SOL", "SIm"]);
  });

  it("no guarda si falta el título", async () => {
    await crearEditor();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    peticiones.expectNone("/api/canciones");
  });

  it("guarda una canción nueva con sus etiquetas y en notación latina", async () => {
    await crearEditor();

    escribir("titulo", "  Ven a celebrar  ");
    escribir("contenido", "[SOL]VEN");
    pulsarChip("Entrada");
    await fixture.whenStable();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    const peticion = peticiones.expectOne("/api/canciones");

    expect(peticion.request.method).toBe("POST");
    expect(peticion.request.body).toEqual({
      titulo: "Ven a celebrar",
      contenido: "[SOL]VEN",
      tonoOriginal: "SOL",
      notacionPorDefecto: "latina",
      cantoralOrigen: null,
      etiquetas: [1],
    });

    peticion.flush(CANCION);
    await fixture.whenStable();
  });

  it("editar una canción existente la actualiza por PUT", async () => {
    await crearEditor("9");

    escribir("titulo", "Ven a celebrar (2ª voz)");
    await fixture.whenStable();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    const peticion = peticiones.expectOne("/api/canciones/9");

    expect(peticion.request.method).toBe("PUT");
    expect(peticion.request.body).toMatchObject({
      titulo: "Ven a celebrar (2ª voz)",
      etiquetas: [4],
    });

    peticion.flush(CANCION);
    await fixture.whenStable();
  });

  it("un cantoral vacío se guarda como nulo, no como cadena vacía", async () => {
    await crearEditor();

    escribir("titulo", "Alma misionera");
    escribir("cantoralOrigen", "   ");
    await fixture.whenStable();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    const peticion = peticiones.expectOne("/api/canciones");

    expect(peticion.request.body).toMatchObject({ cantoralOrigen: null });

    peticion.flush(CANCION);
    await fixture.whenStable();
  });

  it("al guardar bien vuelve a la biblioteca", async () => {
    await crearEditor();

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, "navigate").mockResolvedValue(true);

    escribir("titulo", "Alma misionera");
    await fixture.whenStable();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    peticiones.expectOne("/api/canciones").flush(CANCION);
    await fixture.whenStable();

    expect(navegar).toHaveBeenCalledWith(["/biblioteca"]);
  });

  it("si la API rechaza el guardado se enseña su mensaje y no se navega", async () => {
    await crearEditor();

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, "navigate").mockResolvedValue(true);

    escribir("titulo", "Alma misionera");
    escribir("contenido", "[SOL]VEN");
    await fixture.whenStable();

    elemento().querySelector<HTMLFormElement>("form")?.requestSubmit();
    await fixture.whenStable();

    peticiones
      .expectOne("/api/canciones")
      .flush(
        { error: "«tonoOriginal» no es un acorde válido en notación latina." },
        { status: 400, statusText: "Bad Request" },
      );

    await fixture.whenStable();

    expect(elemento().textContent).toContain("no es un acorde válido");
    expect(navegar).not.toHaveBeenCalled();
  });
});
