import { HttpErrorResponse } from "@angular/common/http";
import { describe, expect, it } from "vitest";
import { ErrorDeExportacion, mensajeDeExportacion } from "./error-exportacion";

describe("mensajeDeExportacion", () => {
  it("enseña tal cual lo que falló al exportar", () => {
    const fallo = new ErrorDeExportacion(
      "No se ha podido cargar la fuente Inter-Regular.ttf: el PDF quedaría sin su tipografía.",
    );

    expect(mensajeDeExportacion(fallo)).toContain("Inter-Regular.ttf");
  });

  it("no destapa el detalle de un fallo interno cualquiera", () => {
    const fallo = new TypeError("cannot read property 'x' of undefined");

    expect(mensajeDeExportacion(fallo)).toBe("Ha ocurrido un error inesperado.");
  });

  it("sigue traduciendo los errores de la API", () => {
    const fallo = new HttpErrorResponse({
      status: 404,
      error: { error: "No existe la canción 9." },
    });

    expect(mensajeDeExportacion(fallo)).toBe("No existe la canción 9.");
  });
});
