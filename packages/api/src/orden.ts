const COLACION_ESPANOL = new Intl.Collator("es", { sensitivity: "base" });

export function compararTitulos(a: string, b: string): number {
  return COLACION_ESPANOL.compare(a, b);
}
