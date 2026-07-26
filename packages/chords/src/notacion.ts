import { sufijoValido } from "./acorde.js";
import { LATINA_A_AMERICANA, NOTAS_LATINAS, type NotaLatina } from "./notas.js";

export type Notacion = "latina" | "americana";

const AMERICANA_A_LATINA = Object.fromEntries(
  Object.entries(LATINA_A_AMERICANA).map(([latina, americana]) => [
    americana,
    latina,
  ]),
) as Record<string, NotaLatina>;

const ALTERNATIVAS_LATINAS = [...NOTAS_LATINAS]
  .sort((a, b) => b.length - a.length)
  .join("|");

const RE_LATINO = new RegExp(
  `^(${ALTERNATIVAS_LATINAS})([#b]?)([^/]*)(?:/(${ALTERNATIVAS_LATINAS})([#b]?))?$`,
  "i",
);

const RE_AMERICANO = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/;

function desenvolver(token: string): [string, string, string] {
  if (token.startsWith("(") && token.endsWith(")")) {
    return ["(", token.slice(1, -1), ")"];
  }
  return ["", token, ""];
}

function traducir(
  token: string,
  expresion: RegExp,
  tabla: Record<string, string>,
  normalizarRaiz: boolean,
): string {
  const [prefijo, cuerpo, sufijoExtra] = desenvolver(token);

  const m = expresion.exec(cuerpo);
  if (m === null) return token;

  const [
    ,
    raizBruta = "",
    alteracion = "",
    sufijo = "",
    bajoBruto,
    bajoAlteracion = "",
  ] = m;

  if (!sufijoValido(sufijo)) return token;

  const raiz = tabla[normalizarRaiz ? raizBruta.toUpperCase() : raizBruta];
  if (raiz === undefined) return token;

  let resultado = prefijo + raiz + alteracion.toLowerCase() + sufijo;

  if (bajoBruto !== undefined) {
    const bajo = tabla[normalizarRaiz ? bajoBruto.toUpperCase() : bajoBruto];
    if (bajo === undefined) return token;
    resultado += "/" + bajo + bajoAlteracion.toLowerCase();
  }

  return resultado + sufijoExtra;
}

export function aAmericana(token: string): string {
  return traducir(token, RE_LATINO, LATINA_A_AMERICANA, true);
}

export function aLatina(token: string): string {
  return traducir(token, RE_AMERICANO, AMERICANA_A_LATINA, false);
}

export function cambiarNotacion(token: string, notacion: Notacion): string {
  return notacion === "americana" ? aAmericana(token) : token;
}
