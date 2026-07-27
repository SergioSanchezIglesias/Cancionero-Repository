import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { describe, expect, it } from "vitest";
import { App } from "./app";
import { routes } from "./app.routes";

describe("Arranque de la aplicación", () => {
  it("monta el shell con la barra lateral", async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const elemento = fixture.nativeElement as HTMLElement;

    expect(elemento.querySelector("app-sidebar")).not.toBeNull();
    expect(elemento.textContent).toContain("Biblioteca");
  });

  it("la ruta vacía lleva a la biblioteca", () => {
    const raiz = routes.find((ruta) => ruta.path === "");

    expect(raiz?.redirectTo).toBe("biblioteca");
  });
});
