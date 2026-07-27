import { HttpErrorResponse } from "@angular/common/http";
import { describe, expect, it } from "vitest";
import { mensajeDeError } from "./mensaje-error";

describe("mensajeDeError", () => {
  it("enseña el motivo que devuelve la API", () => {
    const fallo = new HttpErrorResponse({
      status: 400,
      error: { error: "«titulo» es obligatorio y no puede estar vacío." },
    });

    expect(mensajeDeError(fallo)).toBe(
      "«titulo» es obligatorio y no puede estar vacío.",
    );
  });

  it("si el servidor no responde lo dice con claridad", () => {
    const fallo = new HttpErrorResponse({ status: 0 });

    expect(mensajeDeError(fallo)).toBe(
      "No se ha podido contactar con el servidor.",
    );
  });

  it("ante un cuerpo sin el formato esperado no enseña tripas", () => {
    const fallo = new HttpErrorResponse({
      status: 500,
      error: "<html>Gateway Timeout</html>",
    });

    expect(mensajeDeError(fallo)).toBe("Ha ocurrido un error inesperado.");
  });

  it("un error que no viene de HTTP también tiene mensaje", () => {
    expect(mensajeDeError(new Error("fallo raro"))).toBe(
      "Ha ocurrido un error inesperado.",
    );
    expect(mensajeDeError(undefined)).toBe("Ha ocurrido un error inesperado.");
  });
});
