import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Cancion } from "../../core/interfaces/cancion.interface";
import type { Etiqueta } from "../../core/interfaces/etiqueta.interface";
import { VisorCancionPage } from "./visor-cancion.page";

const CATALOGO: Etiqueta[] = [
  { id: 1, nombre: "Entrada", grupo: "misa", orden: 1, total: 2 },
  { id: 12, nombre: "Alabanza", grupo: "adoracion_alabanza", orden: 12, total: 5 },
];

const CANCION: Cancion = {
  id: 9,
  titulo: "Ven a celebrar",
  contenido: "**[SOL]VEN A CELE[SIm]BRAR**\nSE [DO]DERRAMARÁ",
  tonoOriginal: "SOL",
  notacionPorDefecto: "latina",
  cantoralOrigen: "Abrir Abrir",
  creadoEn: "2026-01-01 10:00:00",
  editadoEn: "2026-01-01 10:00:00",
  etiquetas: [1, 12],
};

describe("VisorCancionPage", () => {
  let fixture: ComponentFixture<VisorCancionPage>;
  let peticiones: HttpTestingController;

  function elemento(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texto(): string {
    return elemento().textContent ?? "";
  }

  function porPrueba(prueba: string): HTMLElement {
    const encontrado = elemento().querySelector<HTMLElement>(
      `[data-prueba="${prueba}"]`,
    );

    if (encontrado === null) {
      throw new Error(`No se ha encontrado «${prueba}».`);
    }

    return encontrado;
  }

  function boton(prueba: string): HTMLButtonElement {
    const encontrado = porPrueba(prueba);

    if (!(encontrado instanceof HTMLButtonElement)) {
      throw new Error(`«${prueba}» no es un botón.`);
    }

    return encontrado;
  }

  function acordes(): string[] {
    return [...elemento().querySelectorAll(".segmento__acorde")]
      .map((nodo) => nodo.textContent ?? "")
      .filter((acorde) => acorde !== "");
  }

  function tonoActual(): string {
    return porPrueba("tono-actual").textContent?.trim() ?? "";
  }

  async function pulsar(prueba: string): Promise<void> {
    boton(prueba).click();
    await fixture.whenStable();
  }

  async function abrir(cancion: Cancion = CANCION): Promise<void> {
    fixture = TestBed.createComponent(VisorCancionPage);
    fixture.componentRef.setInput("id", String(cancion.id));

    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(CATALOGO);
    peticiones.expectOne(`/api/canciones/${cancion.id}`).flush(cancion);

    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
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

  it("presenta la canción con su tono original y sus etiquetas", async () => {
    await abrir();

    expect(texto()).toContain("Ven a celebrar");
    expect(texto()).toContain("Tono original: SOL");
    expect(texto()).toContain("Cantoral: Abrir Abrir");
    expect(texto()).toContain("Entrada");
    expect(texto()).toContain("Alabanza");
  });

  it("pinta la letra con sus acordes tal como está guardada", async () => {
    await abrir();

    expect(acordes()).toEqual(["SOL", "SIm", "DO"]);
    expect(tonoActual()).toBe("SOL");
  });

  it("subir un tono mueve todos los acordes y el tono que se anuncia", async () => {
    await abrir();

    await pulsar("subir-tono");

    expect(tonoActual()).toBe("LA");
    expect(acordes()).toEqual(["LA", "DO#m", "RE"]);
  });

  it("bajar un tono elige bemoles cuando el tono destino los pide", async () => {
    await abrir();

    await pulsar("bajar-tono");

    expect(tonoActual()).toBe("FA");
    expect(acordes()).toEqual(["FA", "LAm", "SIb"]);
  });

  it("los medios tonos se acumulan", async () => {
    await abrir();

    await pulsar("subir-semitono");
    await pulsar("subir-semitono");

    expect(tonoActual()).toBe("LA");
  });

  it("volver al original deshace la transposición", async () => {
    await abrir();

    await pulsar("subir-tono");
    await pulsar("volver-al-original");

    expect(tonoActual()).toBe("SOL");
    expect(acordes()).toEqual(["SOL", "SIm", "DO"]);
  });

  it("no se puede volver al original si no se ha transpuesto", async () => {
    await abrir();

    expect(boton("volver-al-original").disabled).toBe(true);
  });

  it("avisa de que la transposición no cambia la canción guardada", async () => {
    await abrir();

    expect(porPrueba("estado-tono").textContent).toContain("Tono original");

    await pulsar("subir-semitono");

    const estado = porPrueba("estado-tono");

    expect(estado.textContent).toContain("Transpuesta");
    // Medio tono por encima de SOL es LAb: el tono destino manda sobre la
    // enarmonía, igual que en la canción.
    expect(estado.title).toBe(
      "Se lee en LAb, pero la canción sigue guardada en SOL.",
    );
  });

  it("no deja pasar de una octava, que es volver al punto de partida", async () => {
    await abrir();

    // Cinco tonos son diez semitonos: subir otro entero se saldría de la octava.
    for (let vez = 0; vez < 5; vez++) await pulsar("subir-tono");

    expect(tonoActual()).toBe("FA");
    expect(boton("subir-tono").disabled).toBe(true);
    expect(boton("subir-semitono").disabled).toBe(false);

    await pulsar("subir-semitono");

    expect(tonoActual()).toBe("FA#");
    expect(boton("subir-semitono").disabled).toBe(true);
  });

  it("el conmutador de notación traduce los acordes sin moverlos", async () => {
    await abrir();

    await pulsar("notacion-americana");

    expect(acordes()).toEqual(["G", "Bm", "C"]);
    expect(tonoActual()).toBe("G");
    expect(texto()).toContain("Tono original: G");
  });

  it("la notación se combina con la transposición", async () => {
    await abrir();

    await pulsar("notacion-americana");
    await pulsar("subir-tono");

    expect(acordes()).toEqual(["A", "C#m", "D"]);
    expect(tonoActual()).toBe("A");
  });

  it("abre cada canción en la notación con la que se escribió", async () => {
    await abrir({ ...CANCION, notacionPorDefecto: "americana" });

    expect(acordes()).toEqual(["G", "Bm", "C"]);
    expect(boton("notacion-americana").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("A+ y A− ajustan el tamaño de la letra sin tocar la canción", async () => {
    await abrir();

    const escala = (): string | null =>
      elemento().style.getPropertyValue("--escala-lectura");

    expect(escala()).toBe("1");

    await pulsar("agrandar-letra");
    expect(escala()).toBe("1.15");

    await pulsar("reducir-letra");
    await pulsar("reducir-letra");
    expect(escala()).toBe("0.9");

    expect(acordes()).toEqual(["SOL", "SIm", "DO"]);
  });

  it("si la canción no existe lo dice y no pinta el transpositor", async () => {
    fixture = TestBed.createComponent(VisorCancionPage);
    fixture.componentRef.setInput("id", "404");

    await fixture.whenStable();

    peticiones.expectOne("/api/etiquetas").flush(CATALOGO);
    peticiones
      .expectOne("/api/canciones/404")
      .flush({ error: "No existe la canción 404." }, { status: 404, statusText: "Not Found" });

    await fixture.whenStable();

    expect(texto()).toContain("No existe la canción 404.");
    expect(elemento().querySelector('[data-prueba="tono-actual"]')).toBeNull();
  });
});
