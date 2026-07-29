import { describe, expect, it } from "vitest";
import { resumirAntiguedad } from "./antiguedad";

const AHORA = new Date(2026, 2, 12, 18, 30);

/**
 * Fecha tal y como la envía la API: en UTC. Se construye desde días y horas
 * locales para que el test valga en cualquier zona horaria.
 */
function copiaHecha(diasAntes: number, horaLocal: number): string {
  const momento = new Date(AHORA);

  momento.setDate(momento.getDate() - diasAntes);
  momento.setHours(horaLocal, 50, 0, 0);

  return momento.toISOString();
}

describe("resumirAntiguedad", () => {
  it("sin fecha dice que no hay ninguna copia", () => {
    expect(resumirAntiguedad(null, AHORA)).toBe("Nunca");
  });

  it("una copia de hoy dice «Hoy», aunque sea de primera hora", () => {
    expect(resumirAntiguedad(copiaHecha(0, 6), AHORA)).toBe("Hoy");
  });

  it("una copia de ayer dice «Ayer»", () => {
    expect(resumirAntiguedad(copiaHecha(1, 23), AHORA)).toBe("Ayer");
  });

  it("cuenta días de calendario, no periodos de 24 horas", () => {
    // Anoche a las 23:50 hace menos de 24 horas, pero es «Ayer», no «Hoy».
    expect(resumirAntiguedad(copiaHecha(1, 23), AHORA)).not.toBe("Hoy");
  });

  it("una copia de la semana pasada dice cuántos días hace", () => {
    expect(resumirAntiguedad(copiaHecha(7, 10), AHORA)).toBe("Hace 7 días");
  });

  it("una fecha en el futuro se trata como de hoy: el reloj no cuadra", () => {
    expect(resumirAntiguedad(copiaHecha(-8, 10), AHORA)).toBe("Hoy");
  });

  it("una fecha ilegible no rompe la interfaz", () => {
    expect(resumirAntiguedad("esto no es una fecha", AHORA)).toBe("Nunca");
  });
});
