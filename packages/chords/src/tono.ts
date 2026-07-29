import { parsearAcorde } from "./acorde.js";
import {
  ESCALA_BEMOLES,
  ESCALA_SOSTENIDOS,
  indiceCromatico,
  type NotaLatina,
} from "./notas.js";

const MAYORES_CON_BEMOLES = new Set<NotaLatina>(["FA"]);
const MENORES_CON_BEMOLES = new Set<NotaLatina>(["RE", "SOL", "DO", "FA"]);

/**
 * Tonalidades mayores, una por cada grado de la escala cromática, con la
 * enarmonía que le corresponde a cada una.
 */
export const TONOS_MAYORES = [
  "DO",
  "REb",
  "RE",
  "MIb",
  "MI",
  "FA",
  "FA#",
  "SOL",
  "LAb",
  "LA",
  "SIb",
  "SI",
] as const;

/** Las mismas doce tonalidades en modo menor. */
export const TONOS_MENORES = [
  "DOm",
  "DO#m",
  "REm",
  "MIbm",
  "MIm",
  "FAm",
  "FA#m",
  "SOLm",
  "SOL#m",
  "LAm",
  "SIbm",
  "SIm",
] as const;

/** Catálogo completo de tonos, para ofrecerlo donde haya que elegir uno. */
export const TONOS: readonly string[] = [...TONOS_MAYORES, ...TONOS_MENORES];

function esModoMenor(sufijo: string): boolean {
  const s = sufijo.toLowerCase();
  return s.startsWith("m") && !s.startsWith("maj");
}

export function usaBemoles(tono: string): boolean {
  const t = parsearAcorde(tono);
  if (t === null) return false;

  if (t.alteracion === "b") return true;
  if (t.alteracion === "#") return false;

  return esModoMenor(t.sufijo)
    ? MENORES_CON_BEMOLES.has(t.raiz)
    : MAYORES_CON_BEMOLES.has(t.raiz);
}

export function escribirNota(indice: number, tonoDestino: string): string {
  const escala = usaBemoles(tonoDestino) ? ESCALA_BEMOLES : ESCALA_SOSTENIDOS;
  const i = ((indice % 12) + 12) % 12;
  return escala[i] ?? "";
}

export function transponerTono(tono: string, semitonos: number): string {
  const t = parsearAcorde(tono);
  if (t === null) return tono;

  const base = indiceCromatico(t.raiz, t.alteracion);
  const i = (((base + semitonos) % 12) + 12) % 12;

  return (esModoMenor(t.sufijo) ? TONOS_MENORES : TONOS_MAYORES)[i] ?? tono;
}
