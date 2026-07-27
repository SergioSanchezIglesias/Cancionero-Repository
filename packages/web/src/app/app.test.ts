import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, expect, it } from "vitest";
import { App } from "./app";
import { rutas } from "./app.rutas";

describe("Arranque de la aplicación", () => {
  it("monta el componente raíz sin errores", async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it("la ruta vacía lleva a la biblioteca", () => {
    const raiz = rutas.find((ruta) => ruta.path === "");

    expect(raiz?.redirectTo).toBe("biblioteca");
  });
});
