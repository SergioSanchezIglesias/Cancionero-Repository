export const NOTAS_LATINAS = [
  "DO",
  "RE",
  "MI",
  "FA",
  "SOL",
  "LA",
  "SI",
] as const;
export type NotaLatina = (typeof NOTAS_LATINAS)[number];

export type Alteracion = "" | "#" | "b";

export const ESCALA_SOSTENIDOS = [
  "DO",
  "DO#",
  "RE",
  "RE#",
  "MI",
  "FA",
  "FA#",
  "SOL",
  "SOL#",
  "LA",
  "LA#",
  "SI",
] as const;

export const ESCALA_BEMOLES = [
  "DO",
  "REb",
  "RE",
  "MIb",
  "MI",
  "FA",
  "SOLb",
  "SOL",
  "LAb",
  "LA",
  "SIb",
  "SI",
] as const;

export const LATINA_A_AMERICANA: Record<NotaLatina, string> = {
  DO: "C",
  RE: "D",
  MI: "E",
  FA: "F",
  SOL: "G",
  LA: "A",
  SI: "B",
};

export function indiceCromatico(
  raiz: NotaLatina,
  alteracion: Alteracion,
): number {
  const base = ESCALA_SOSTENIDOS.indexOf(raiz);
  const desplazamiento = alteracion === "#" ? 1 : alteracion === "b" ? -1 : 0;
  return (base + desplazamiento + 12) % 12;
}
