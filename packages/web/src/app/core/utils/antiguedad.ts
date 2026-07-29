const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Medianoche local del día al que pertenece el instante. */
function inicioDelDia(momento: Date): number {
  return new Date(
    momento.getFullYear(),
    momento.getMonth(),
    momento.getDate(),
  ).getTime();
}

/**
 * Antigüedad en lenguaje llano de una fecha ISO. Cuenta días de calendario,
 * que es como los cuenta una persona: una copia de anoche es «Ayer» aunque
 * hayan pasado ocho horas.
 */
export function resumirAntiguedad(
  iso: string | null,
  ahora: Date = new Date(),
): string {
  if (iso === null) return "Nunca";

  const momento = new Date(iso);

  if (Number.isNaN(momento.getTime())) return "Nunca";

  const dias = Math.round(
    (inicioDelDia(ahora) - inicioDelDia(momento)) / MS_POR_DIA,
  );

  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";

  return `Hace ${dias} días`;
}
