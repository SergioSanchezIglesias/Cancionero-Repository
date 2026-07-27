import { provideZonelessChangeDetection } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { LetraConAcordesComponent } from "./letra-con-acordes.component";

describe("LetraConAcordesComponent", () => {
  let fixture: ComponentFixture<LetraConAcordesComponent>;

  async function pintar(contenido: string): Promise<HTMLElement> {
    fixture = TestBed.createComponent(LetraConAcordesComponent);
    fixture.componentRef.setInput("contenido", contenido);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }

  function textos(elemento: HTMLElement, selector: string): string[] {
    return [...elemento.querySelectorAll(selector)].map(
      (nodo) => nodo.textContent ?? "",
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it("coloca cada acorde encima de la sílaba a la que está anclado", async () => {
    const elemento = await pintar("[SOL]VEN A CELE[SIm]BRAR");

    expect(textos(elemento, ".segmento__acorde")).toEqual(["SOL", "SIm"]);
    expect(textos(elemento, ".segmento__letra")).toEqual([
      "VEN A CELE",
      "BRAR",
    ]);
  });

  it("una sílaba sin acorde conserva su hueco, para que las líneas se alineen", async () => {
    const elemento = await pintar("SE [DO]DERRAMARÁ");

    expect(textos(elemento, ".segmento__letra")).toEqual([
      "SE ",
      "DERRAMARÁ",
    ]);
    expect(elemento.querySelectorAll(".segmento__acorde")).toHaveLength(2);
    expect(
      elemento.querySelectorAll(".segmento__acorde--hueco"),
    ).toHaveLength(1);
  });

  it("no se come los espacios del final de un fragmento", async () => {
    const elemento = await pintar("[Mim]Os aseguro [SIm]que Yo");

    expect(textos(elemento, ".segmento__letra")).toEqual([
      "Os aseguro ",
      "que Yo",
    ]);
  });

  it("el estribillo se marca en negrita", async () => {
    const elemento = await pintar(
      "**[SOL]VEN A CELEBRAR**\n[Mim]Os aseguro",
    );

    const lineas = elemento.querySelectorAll(".linea");

    expect(lineas[0]?.classList.contains("linea--negrita")).toBe(true);
    expect(lineas[1]?.classList.contains("linea--negrita")).toBe(false);
  });

  it("la línea en blanco entre estrofas se conserva como separación", async () => {
    const elemento = await pintar("[SOL]Primera\n\n[RE]Segunda");

    expect(elemento.querySelectorAll(".linea")).toHaveLength(3);
    expect(elemento.querySelectorAll(".linea--vacia")).toHaveLength(1);
  });

  it("admite una línea instrumental, solo con acordes", async () => {
    const elemento = await pintar("[SOL][RE][Mim]");

    expect(textos(elemento, ".segmento__acorde")).toEqual([
      "SOL",
      "RE",
      "Mim",
    ]);
  });

  it("un contenido vacío no pinta nada ni revienta", async () => {
    const elemento = await pintar("");

    expect(elemento.querySelectorAll(".linea")).toHaveLength(0);
  });

  it("un token que no es un acorde se pinta tal cual, sin interpretarlo", async () => {
    const elemento = await pintar("[N.C.]Sin acompañamiento");

    expect(textos(elemento, ".segmento__acorde")).toEqual(["N.C."]);
  });
});
