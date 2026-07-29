import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./app";
import { routes } from "./app.routes";

describe("Arranque de la aplicación", () => {
  it("monta el shell con la barra lateral", async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector("app-sidebar")).not.toBeNull();
    expect(elemento.textContent).toContain("Biblioteca");

    // La barra lateral consulta el estado de la copia nada más montarse.
    const peticiones = TestBed.inject(HttpTestingController);

    for (const peticion of peticiones.match("/api/respaldo/estado")) {
      peticion.flush({
        ultimaCopia: null,
        canciones: 0,
        hayCambiosSinRespaldar: false,
      });
    }

    peticiones.verify();
  });

  it("la ruta vacía lleva a la biblioteca", () => {
    const raiz = routes.find((ruta) => ruta.path === "");

    expect(raiz?.redirectTo).toBe("biblioteca");
  });
});

/*
 * `canciones/nueva` y `canciones/:id` compiten por la misma forma de URL: si
 * alguien las reordena, «Nueva canción» acabaría abriendo el visor de una
 * canción llamada «nueva». Estas dos pruebas lo impiden.
 */
describe("Rutas de canción", () => {
  let peticiones: HttpTestingController;

  async function navegarA(url: string): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // El mismo montaje que `app.config.ts`: el `:id` llega como input.
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    peticiones = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create(url);

    for (const peticion of peticiones.match("/api/etiquetas")) {
      peticion.flush([]);
    }

    return harness.routeNativeElement ?? document.createElement("div");
  }

  afterEach(() => {
    peticiones.verify();
  });

  it("«canciones/nueva» abre el editor, no el visor", async () => {
    const elemento = await navegarA("/canciones/nueva");

    expect(elemento.tagName.toLowerCase()).toBe("app-editor-cancion");
  });

  it("«canciones/9» abre el visor", async () => {
    const elemento = await navegarA("/canciones/9");

    peticiones.expectOne("/api/canciones/9").flush({
      id: 9,
      titulo: "Ven a celebrar",
      contenido: "[SOL]VEN A CELEBRAR",
      tonoOriginal: "SOL",
      notacionPorDefecto: "latina",
      cantoralOrigen: null,
      creadoEn: "2026-01-01 10:00:00",
      editadoEn: "2026-01-01 10:00:00",
      etiquetas: [],
    });

    expect(elemento.tagName.toLowerCase()).toBe("app-visor-cancion");
  });
});
