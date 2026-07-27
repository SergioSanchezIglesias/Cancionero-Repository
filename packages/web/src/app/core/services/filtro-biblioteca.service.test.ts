import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiltroBibliotecaService } from "./filtro-biblioteca.service";

const REPOSO_MS = 250;

describe("FiltroBibliotecaService", () => {
  let filtro: FiltroBibliotecaService;

  /**
   * Deja pasar el reposo del buscador. Primero se vacía la cola de efectos
   * (es lo que empuja el texto al flujo) y luego se avanza el reloj.
   */
  function pasarElReposo(): void {
    TestBed.tick();
    vi.advanceTimersByTime(REPOSO_MS);
  }

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    filtro = TestBed.inject(FiltroBibliotecaService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("arranca sin búsqueda ni etiquetas marcadas", () => {
    expect(filtro.filtro()).toEqual({ buscar: "", etiquetas: [] });
    expect(filtro.hayFiltro()).toBe(false);
  });

  it("marcar varias etiquetas las acumula: es un OR, no un AND", () => {
    filtro.alternarEtiqueta(4);
    filtro.alternarEtiqueta(7);

    expect(filtro.filtro().etiquetas).toEqual([4, 7]);
  });

  it("volver a pulsar una etiqueta marcada la desmarca", () => {
    filtro.alternarEtiqueta(4);
    filtro.alternarEtiqueta(7);
    filtro.alternarEtiqueta(4);

    expect(filtro.filtro().etiquetas).toEqual([7]);
    expect(filtro.estaMarcada(4)).toBe(false);
    expect(filtro.estaMarcada(7)).toBe(true);
  });

  it("el buscador espera a que se deje de teclear antes de filtrar", () => {
    filtro.escribir("com");
    filtro.escribir("comun");
    filtro.escribir("comunion");

    expect(filtro.filtro().buscar).toBe("");

    pasarElReposo();

    expect(filtro.filtro().buscar).toBe("comunion");
  });

  it("la búsqueda y las etiquetas conviven en el mismo filtro", () => {
    filtro.escribir("maria");
    filtro.alternarEtiqueta(9);

    pasarElReposo();

    expect(filtro.filtro()).toEqual({ buscar: "maria", etiquetas: [9] });
  });

  it("limpiar deja el filtro como al principio", () => {
    filtro.escribir("maria");
    filtro.alternarEtiqueta(9);
    pasarElReposo();

    filtro.limpiar();
    pasarElReposo();

    expect(filtro.filtro()).toEqual({ buscar: "", etiquetas: [] });
    expect(filtro.hayFiltro()).toBe(false);
  });

  it("marcar una etiqueta ya cuenta como filtro activo", () => {
    filtro.alternarEtiqueta(1);

    expect(filtro.hayFiltro()).toBe(true);
  });
});
