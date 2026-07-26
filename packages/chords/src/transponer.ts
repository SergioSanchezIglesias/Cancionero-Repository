import { parsearAcorde } from "./acorde.js";
import { indiceCromatico } from "./notas.js";
import { escribirNota } from "./tono.js";

export function transponerAcorde(
  token: string,
  semitonos: number,
  tonoDestino: string,
): string {
  const acorde = parsearAcorde(token);
  if (acorde === null) return token;

  const indiceRaiz = indiceCromatico(acorde.raiz, acorde.alteracion);

  let resultado =
    acorde.prefijo +
    escribirNota(indiceRaiz + semitonos, tonoDestino) +
    acorde.sufijo;

  if (acorde.bajo !== null) {
    const indiceBajo = indiceCromatico(acorde.bajo, acorde.bajoAlteracion);
    resultado += "/" + escribirNota(indiceBajo + semitonos, tonoDestino);
  }

  return resultado + acorde.sufijoExtra;
}
