import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EstadoRespaldo } from "../../../core/interfaces/respaldo.interface";
import { SidebarComponent } from "./sidebar.component";

const AL_DIA: EstadoRespaldo = {
  ultimaCopia: new Date().toISOString(),
  canciones: 42,
  hayCambiosSinRespaldar: false,
};

const PENDIENTE: EstadoRespaldo = {
  ultimaCopia: null,
  canciones: 3,
  hayCambiosSinRespaldar: true,
};

describe("SidebarComponent", () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let peticiones: HttpTestingController;

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texto(): string {
    return elemento().textContent ?? "";
  }

  function tarjetaDeRespaldo(): HTMLElement {
    const tarjeta = elemento().querySelector<HTMLElement>(".respaldo");

    if (tarjeta === null) throw new Error("No hay tarjeta de respaldo.");

    return tarjeta;
  }

  async function pintar(estado: EstadoRespaldo = AL_DIA): Promise<void> {
    fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();

    for (const peticion of peticiones.match("/api/respaldo/estado")) {
      peticion.flush(estado);
    }

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

  it("todas las secciones son ya enlaces navegables", async () => {
    await pintar();

    const enlaces = [...elemento().querySelectorAll("a")].map((enlace) =>
      enlace.getAttribute("href"),
    );

    const pendientes = [
      ...elemento().querySelectorAll(".nav__enlace--inactivo"),
    ].map((seccion) => seccion.textContent ?? "");

    expect(enlaces).toContain("/biblioteca");
    expect(enlaces).toContain("/cancioneros");
    expect(enlaces).toContain("/ajustes");
    expect(pendientes).toHaveLength(0);
  });

  it("con la copia al día enseña cuándo se hizo", async () => {
    await pintar();

    expect(texto()).toContain("Última copia: Hoy");
    expect(tarjetaDeRespaldo().classList).not.toContain("respaldo--pendiente");
  });

  it("con cambios sin respaldar avisa y se resalta", async () => {
    await pintar(PENDIENTE);

    expect(texto()).toContain("Tienes cambios sin respaldar");
    expect(tarjetaDeRespaldo().classList).toContain("respaldo--pendiente");
  });

  it("mientras no sabe el estado no afirma nada", async () => {
    fixture = TestBed.createComponent(SidebarComponent);
    await fixture.whenStable();

    expect(texto()).toContain("Consultando…");

    for (const peticion of peticiones.match("/api/respaldo/estado")) {
      peticion.flush(AL_DIA);
    }
  });

  it("la tarjeta de la copia lleva a Ajustes", async () => {
    await pintar();

    expect(tarjetaDeRespaldo().getAttribute("href")).toBe("/ajustes");
  });
});
