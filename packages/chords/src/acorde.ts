import { NOTAS_LATINAS, type Alteracion, type NotaLatina } from "./notas.js";

export interface AcordeParseado {
  prefijo: string;
  raiz: NotaLatina;
  alteracion: Alteracion;
  sufijo: string;
  bajo: NotaLatina | null;
  bajoAlteracion: Alteracion;
  sufijoExtra: string;
}

const ALTERNATIVAS = [...NOTAS_LATINAS]
  .sort((a, b) => b.length - a.length)
  .join("|");

const RE_ACORDE = new RegExp(
  `^(${ALTERNATIVAS})([#b]?)([^/]*)(?:/(${ALTERNATIVAS})([#b]?))?$`,
  "i", // ← el segundo argumento son los flags
);

const INICIO_SUFIJO = /^[mM0-9sdaA+\-°º( ]/;

export function sufijoValido(sufijo: string): boolean {
  return sufijo === "" || INICIO_SUFIJO.test(sufijo);
}

export function parsearAcorde(token: string): AcordeParseado | null {
  let cuerpo = token;
  let prefijo = "";
  let sufijoExtra = "";

  if (cuerpo.startsWith("(") && cuerpo.endsWith(")")) {
    prefijo = "(";
    sufijoExtra = ")";
    cuerpo = cuerpo.slice(1, -1);
  }

  const m = RE_ACORDE.exec(cuerpo);
  if (m === null) return null;

  const [
    ,
    raizBruta = "",
    altBruta = "",
    sufijo = "",
    bajoBruto,
    bajoAltBruta = "",
  ] = m;

  const raiz = raizBruta.toUpperCase() as NotaLatina;
  const alteracion = altBruta.toLowerCase() as Alteracion;
  const bajo =
    bajoBruto === undefined ? null : (bajoBruto.toUpperCase() as NotaLatina);
  const bajoAlteracion = bajoAltBruta.toLowerCase() as Alteracion;

  if (!sufijoValido(sufijo)) return null;

  const acordeParseado: AcordeParseado = {
    prefijo,
    raiz,
    alteracion,
    sufijo,
    bajo,
    bajoAlteracion,
    sufijoExtra,
  };

  return acordeParseado;
}
