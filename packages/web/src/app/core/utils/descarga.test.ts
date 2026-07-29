import { HttpErrorResponse } from "@angular/common/http";
import { describe, expect, it } from "vitest";
import { mensajeDeDescargaFallida, nombreDeDescarga } from "./descarga";

describe("nombreDeDescarga", () => {
  it("saca el nombre que propone la cabecera del servidor", () => {
    expect(
      nombreDeDescarga(
        'attachment; filename="cancionero-2026-03-12.json"',
        "respaldo.json",
      ),
    ).toBe("cancionero-2026-03-12.json");
  });

  it("admite el nombre sin comillas", () => {
    expect(
      nombreDeDescarga("attachment; filename=copia.db", "respaldo.db"),
    ).toBe("copia.db");
  });

  it("sin cabecera usa el nombre por defecto", () => {
    expect(nombreDeDescarga(null, "respaldo.json")).toBe("respaldo.json");
  });

  it("con una cabecera sin nombre usa el nombre por defecto", () => {
    expect(nombreDeDescarga("attachment", "respaldo.json")).toBe(
      "respaldo.json",
    );
  });

  it("se queda solo con el nombre: una ruta no puede escapar de Descargas", () => {
    expect(
      nombreDeDescarga('attachment; filename="../../.zshrc"', "respaldo.json"),
    ).toBe(".zshrc");
  });
});

describe("mensajeDeDescargaFallida", () => {
  it("distingue que el servidor no responde", () => {
    const caido = new HttpErrorResponse({ status: 0 });

    expect(mensajeDeDescargaFallida(caido)).toMatch(/contactar con el servidor/i);
  });

  it("ante un fallo del servidor invita a reintentar", () => {
    const fallo = new HttpErrorResponse({ status: 500 });

    expect(mensajeDeDescargaFallida(fallo)).toBe(
      "No se ha podido preparar la copia. Vuelve a intentarlo.",
    );
  });

  it("un fallo que no es HTTP tampoco se queda sin mensaje", () => {
    expect(mensajeDeDescargaFallida(new Error("vaya"))).not.toBe("");
  });
});
