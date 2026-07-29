import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import type {
  Cancion,
  CancionResumen,
} from "../../core/interfaces/cancion.interface";
import type { Etiqueta } from "../../core/interfaces/etiqueta.interface";
import type { OpcionesDelCancionero } from "../../core/pdf/documento-cancionero";
import { ErrorDeExportacion } from "../../core/pdf/error-exportacion";
import { MEDIDOR, type Medidor } from "../../core/pdf/medidor";
import { CancioneroPdfService } from "../../core/services/cancionero-pdf.service";
import { CancioneroPage } from "./cancionero.page";

const MEDIDOR_DE_PRUEBA: Medidor = {
  ancho: (texto, tamano) => texto.length * tamano * 0.5,
};

const CATALOGO: Etiqueta[] = [
  { id: 1, nombre: "Entrada", grupo: "misa", orden: 1, total: 2 },
  { id: 4, nombre: "Ofertorio", grupo: "misa", orden: 4, total: 1 },
];

const CANCIONES: CancionResumen[] = [
  { id: 3, titulo: "Alma misionera", tonoOriginal: "RE", etiquetas: [4] },
  { id: 1, titulo: "Ven a celebrar", tonoOriginal: "SOL", etiquetas: [1] },
  { id: 7, titulo: "Kirie", tonoOriginal: "RE", etiquetas: [1] },
];

function detalle(resumen: CancionResumen): Cancion {
  return {
    ...resumen,
    contenido: "[SOL]VEN A CELE[SIm]BRAR",
    notacionPorDefecto: "latina",
    cantoralOrigen: null,
    creadoEn: "2026-01-01 10:00:00",
    editadoEn: "2026-01-01 10:00:00",
  };
}

describe("CancioneroPage", () => {
  let fixture: ComponentFixture<CancioneroPage>;
  let peticiones: HttpTestingController;

  const descargar = vi.fn<(opciones: OpcionesDelCancionero) => Promise<void>>();
  const abrir = vi.fn<(opciones: OpcionesDelCancionero) => Promise<void>>();

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function candidatas(): HTMLButtonElement[] {
    return [...elemento().querySelectorAll<HTMLButtonElement>(".candidata")];
  }

  function entradas(): string[] {
    return [...elemento().querySelectorAll(".entrada__titulo")].map(
      (nodo) => nodo.textContent?.trim() ?? "",
    );
  }

  function boton(prueba: string): HTMLButtonElement {
    const encontrado = elemento().querySelector<HTMLButtonElement>(
      `[data-prueba="${prueba}"]`,
    );

    if (encontrado === null) throw new Error(`No existe «${prueba}».`);

    return encontrado;
  }

  /** Marca una canción de la izquierda y responde a la carga de su contenido. */
  async function elegir(titulo: string): Promise<void> {
    const candidata = candidatas().find((boton) =>
      boton.textContent?.includes(titulo),
    );

    if (candidata === undefined) throw new Error(`No está «${titulo}».`);

    candidata.click();
    await fixture.whenStable();

    const resumen = CANCIONES.find((cancion) => cancion.titulo === titulo);

    if (resumen !== undefined) {
      peticiones
        .expectOne(`/api/canciones/${resumen.id}`)
        .flush(detalle(resumen));
    }

    await fixture.whenStable();
  }

  async function pintar(): Promise<void> {
    fixture = TestBed.createComponent(CancioneroPage);
    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(CATALOGO);
    peticiones.expectOne("/api/canciones").flush(CANCIONES);

    await fixture.whenStable();
  }

  beforeEach(() => {
    descargar.mockReset();
    descargar.mockResolvedValue(undefined);
    abrir.mockReset();
    abrir.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CancioneroPdfService, useValue: { descargar, abrir } },
        // En jsdom no hay canvas: la regla la pone la prueba.
        { provide: MEDIDOR, useValue: MEDIDOR_DE_PRUEBA },
      ],
    });

    peticiones = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    peticiones.verify();
  });

  it("lista las canciones de la biblioteca para elegir", async () => {
    await pintar();

    expect(candidatas()).toHaveLength(3);
    expect(elemento().textContent).toContain("Alma misionera");
  });

  it("al marcar una canción entra en el cancionero", async () => {
    await pintar();
    await elegir("Ven a celebrar");

    expect(entradas()).toEqual(["Ven a celebrar"]);
  });

  it("las canciones se numeran en el orden en que se marcan", async () => {
    await pintar();
    await elegir("Kirie");
    await elegir("Alma misionera");

    expect(entradas()).toEqual(["Kirie", "Alma misionera"]);
  });

  it("se pueden reordenar con las flechas", async () => {
    await pintar();
    await elegir("Kirie");
    await elegir("Alma misionera");

    const bajar = elemento().querySelector<HTMLButtonElement>(
      '[aria-label="Bajar Kirie"]',
    );

    bajar?.click();
    await fixture.whenStable();

    expect(entradas()).toEqual(["Alma misionera", "Kirie"]);
  });

  it("no se puede subir la primera ni bajar la última", async () => {
    await pintar();
    await elegir("Kirie");
    await elegir("Alma misionera");

    const subir = elemento().querySelector<HTMLButtonElement>(
      '[aria-label="Subir Kirie"]',
    );
    const bajar = elemento().querySelector<HTMLButtonElement>(
      '[aria-label="Bajar Alma misionera"]',
    );

    expect(subir?.disabled).toBe(true);
    expect(bajar?.disabled).toBe(true);
  });

  it("se puede quitar una canción del cancionero", async () => {
    await pintar();
    await elegir("Kirie");

    elemento()
      .querySelector<HTMLButtonElement>('[aria-label="Quitar Kirie"]')
      ?.click();
    await fixture.whenStable();

    expect(entradas()).toEqual([]);
  });

  it("desmarcar la canción también la saca", async () => {
    await pintar();
    await elegir("Kirie");

    candidatas()
      .find((boton) => boton.textContent?.includes("Kirie"))
      ?.click();
    await fixture.whenStable();

    expect(entradas()).toEqual([]);
  });

  it("sin canciones no deja generar nada", async () => {
    await pintar();

    expect(boton("generar").disabled).toBe(true);
    expect(boton("vista-previa").disabled).toBe(true);
  });

  it("anuncia cuántas páginas va a tener el PDF", async () => {
    await pintar();
    await elegir("Kirie");

    // Portada, índice y la canción.
    expect(boton("resumen").textContent).toContain("3 páginas");
    expect(boton("resumen").textContent).toContain("notación latina");
  });

  it("genera el PDF con las canciones en su orden y las opciones elegidas", async () => {
    await pintar();
    await elegir("Kirie");
    await elegir("Alma misionera");

    const titulo = elemento().querySelector<HTMLInputElement>(".titulo");

    if (titulo !== null) {
      titulo.value = "Domingo 12 de marzo";
      titulo.dispatchEvent(new Event("input"));
      await fixture.whenStable();
    }

    boton("generar").click();
    await fixture.whenStable();

    expect(descargar).toHaveBeenCalledTimes(1);

    const opciones = descargar.mock.calls[0]?.[0];

    expect(opciones?.titulo).toBe("Domingo 12 de marzo");
    expect(opciones?.canciones.map((cancion) => cancion.titulo)).toEqual([
      "Kirie",
      "Alma misionera",
    ]);
    expect(opciones?.portada).toBe(true);
    expect(opciones?.indice).toBe(true);
    expect(opciones?.notacion).toBe("latina");
  });

  it("sin título escrito el cancionero se llama «Cancionero»", async () => {
    await pintar();
    await elegir("Kirie");

    boton("generar").click();
    await fixture.whenStable();

    expect(descargar.mock.calls[0]?.[0].titulo).toBe("Cancionero");
  });

  it("la notación americana viaja al PDF", async () => {
    await pintar();
    await elegir("Kirie");

    boton("notacion-americana").click();
    await fixture.whenStable();

    boton("generar").click();
    await fixture.whenStable();

    expect(descargar.mock.calls[0]?.[0].notacion).toBe("americana");
  });

  it("la vista previa abre el mismo documento en otra pestaña", async () => {
    await pintar();
    await elegir("Kirie");

    boton("vista-previa").click();
    await fixture.whenStable();

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(descargar).not.toHaveBeenCalled();
  });

  it("si falla la generación lo cuenta y no se queda colgado", async () => {
    await pintar();
    await elegir("Kirie");

    descargar.mockRejectedValueOnce(
      new ErrorDeExportacion(
        "No se ha podido cargar la fuente Inter-Regular.ttf: el PDF quedaría sin su tipografía.",
      ),
    );

    boton("generar").click();
    // El fallo llega en una promesa suelta: hay que dejar correr los
    // microtasks antes de mirar la pantalla.
    await new Promise((seguir) => setTimeout(seguir, 0));
    await fixture.whenStable();

    expect(elemento().textContent).toContain("No se ha podido cargar la fuente");
    expect(boton("generar").disabled).toBe(false);
  });
});
