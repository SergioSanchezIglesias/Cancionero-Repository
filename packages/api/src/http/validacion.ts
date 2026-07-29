import { parsearAcorde, type Notacion } from "@cancionero/chords";
import type { FiltroCanciones, NuevaCancion } from "../canciones/repositorio.js";
import {
  VERSION_RESPALDO,
  type CancionRespaldo,
  type Respaldo,
} from "../respaldo/repositorio.js";

export type Validado<T> =
  | { ok: true; valor: T }
  | { ok: false; error: string };

export interface CancionValidada {
  titulo: string;
  contenido: string;
  tonoOriginal: string;
  notacionPorDefecto: Notacion;
  cantoralOrigen: string | null;
  etiquetas: number[];
}

const NOTACIONES: readonly Notacion[] = ["latina", "americana"];

const RE_ENTERO_POSITIVO = /^[1-9]\d*$/;

function valido<T>(valor: T): Validado<T> {
  return { ok: true, valor };
}

function invalido<T>(error: string): Validado<T> {
  return { ok: false, error };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" && valor !== null && !Array.isArray(valor)
  );
}

function esNotacion(valor: unknown): valor is Notacion {
  return NOTACIONES.some((notacion) => notacion === valor);
}

function validarEtiquetas(valor: unknown): Validado<number[]> {
  if (valor === undefined) return valido([]);

  if (!Array.isArray(valor)) {
    return invalido("«etiquetas» debe ser una lista de identificadores.");
  }

  for (const id of valor) {
    if (typeof id !== "number" || !Number.isInteger(id) || id < 1) {
      return invalido(
        "«etiquetas» debe contener solo identificadores enteros positivos.",
      );
    }
  }

  return valido(valor as number[]);
}

type CamposDeCancion = Omit<CancionValidada, "etiquetas">;

function validarCamposDeCancion(
  cuerpo: Record<string, unknown>,
): Validado<CamposDeCancion> {
  const { titulo, contenido, tonoOriginal, notacionPorDefecto, cantoralOrigen } =
    cuerpo;

  if (typeof titulo !== "string" || titulo.trim() === "") {
    return invalido("«titulo» es obligatorio y no puede estar vacío.");
  }

  if (typeof contenido !== "string") {
    return invalido("«contenido» es obligatorio y debe ser texto.");
  }

  if (typeof tonoOriginal !== "string" || tonoOriginal.trim() === "") {
    return invalido("«tonoOriginal» es obligatorio y no puede estar vacío.");
  }

  if (parsearAcorde(tonoOriginal.trim()) === null) {
    return invalido(
      `«tonoOriginal» no es un acorde válido en notación latina: «${tonoOriginal}».`,
    );
  }

  if (notacionPorDefecto !== undefined && !esNotacion(notacionPorDefecto)) {
    return invalido("«notacionPorDefecto» solo admite «latina» o «americana».");
  }

  if (
    cantoralOrigen !== undefined &&
    cantoralOrigen !== null &&
    typeof cantoralOrigen !== "string"
  ) {
    return invalido("«cantoralOrigen» debe ser texto o null.");
  }

  const cantoral =
    typeof cantoralOrigen === "string" && cantoralOrigen.trim() !== ""
      ? cantoralOrigen.trim()
      : null;

  return valido({
    titulo: titulo.trim(),
    contenido,
    tonoOriginal: tonoOriginal.trim(),
    notacionPorDefecto: notacionPorDefecto ?? "latina",
    cantoralOrigen: cantoral,
  });
}

export function validarNuevaCancion(cuerpo: unknown): Validado<CancionValidada> {
  if (!esObjeto(cuerpo)) {
    return invalido("El cuerpo de la petición debe ser un objeto JSON.");
  }

  const campos = validarCamposDeCancion(cuerpo);
  if (!campos.ok) return invalido(campos.error);

  const etiquetas = validarEtiquetas(cuerpo["etiquetas"]);
  if (!etiquetas.ok) return invalido(etiquetas.error);

  return valido({
    ...campos.valor,
    etiquetas: etiquetas.valor,
  } satisfies NuevaCancion);
}

export function validarId(valor: unknown): number | null {
  if (typeof valor !== "string" || !RE_ENTERO_POSITIVO.test(valor)) return null;

  return Number(valor);
}

function validarIdsDeEtiquetas(valor: unknown): Validado<number[] | undefined> {
  if (valor === undefined) return valido(undefined);

  const textos = Array.isArray(valor) ? valor : [valor];
  const ids: number[] = [];

  for (const texto of textos) {
    if (typeof texto !== "string") {
      return invalido("«etiquetas» debe ser una lista de identificadores.");
    }

    for (const trozo of texto.split(",")) {
      const limpio = trozo.trim();
      if (limpio === "") continue;

      if (!RE_ENTERO_POSITIVO.test(limpio)) {
        return invalido(
          `«etiquetas» solo admite identificadores enteros positivos: «${limpio}».`,
        );
      }

      ids.push(Number(limpio));
    }
  }

  return valido(ids.length === 0 ? undefined : ids);
}

function validarCancionDeRespaldo(
  valor: unknown,
  posicion: number,
): Validado<CancionRespaldo> {
  const donde = `la canción ${posicion}`;

  if (!esObjeto(valor)) {
    return invalido(`En ${donde}: debe ser un objeto JSON.`);
  }

  const campos = validarCamposDeCancion(valor);

  if (!campos.ok) {
    return invalido(`En ${donde}: ${campos.error}`);
  }

  const etiquetas = valor["etiquetas"];
  const nombres: string[] = [];

  if (etiquetas !== undefined) {
    if (!Array.isArray(etiquetas)) {
      return invalido(`En ${donde}: «etiquetas» debe ser una lista de nombres.`);
    }

    for (const nombre of etiquetas) {
      if (typeof nombre !== "string" || nombre.trim() === "") {
        return invalido(
          `En ${donde}: «etiquetas» debe contener nombres de etiqueta.`,
        );
      }

      nombres.push(nombre.trim());
    }
  }

  const fechas: Pick<CancionRespaldo, "creadoEn" | "editadoEn"> = {};

  for (const campo of ["creadoEn", "editadoEn"] as const) {
    const fecha = valor[campo];

    if (fecha === undefined || fecha === null) continue;

    if (typeof fecha !== "string" || fecha.trim() === "") {
      return invalido(`En ${donde}: «${campo}» debe ser una fecha en texto.`);
    }

    fechas[campo] = fecha;
  }

  return valido({
    ...campos.valor,
    etiquetas: nombres,
    ...fechas,
  });
}

export function validarRespaldo(cuerpo: unknown): Validado<Respaldo> {
  if (!esObjeto(cuerpo)) {
    return invalido("El respaldo debe ser un objeto JSON.");
  }

  if (cuerpo["version"] !== VERSION_RESPALDO) {
    return invalido(
      `Versión de respaldo no soportada: se esperaba ${VERSION_RESPALDO}.`,
    );
  }

  const canciones = cuerpo["canciones"];

  if (!Array.isArray(canciones)) {
    return invalido("El respaldo debe traer una lista «canciones».");
  }

  const validadas: CancionRespaldo[] = [];

  for (const [indice, cancion] of canciones.entries()) {
    const validada = validarCancionDeRespaldo(cancion, indice + 1);

    if (!validada.ok) return invalido(validada.error);

    validadas.push(validada.valor);
  }

  const generadoEn = cuerpo["generadoEn"];

  return valido({
    version: VERSION_RESPALDO,
    generadoEn:
      typeof generadoEn === "string" ? generadoEn : new Date().toISOString(),
    canciones: validadas,
  });
}

export function validarFiltroCanciones(
  consulta: unknown,
): Validado<FiltroCanciones> {
  if (!esObjeto(consulta)) {
    return invalido("Los parámetros de búsqueda no son válidos.");
  }

  const buscar = consulta["buscar"];

  if (buscar !== undefined && typeof buscar !== "string") {
    return invalido("«buscar» debe ser texto.");
  }

  const etiquetas = validarIdsDeEtiquetas(consulta["etiquetas"]);
  if (!etiquetas.ok) return invalido(etiquetas.error);

  const filtro: FiltroCanciones = {};

  if (buscar !== undefined) filtro.buscar = buscar;
  if (etiquetas.valor !== undefined) filtro.etiquetas = etiquetas.valor;

  return valido(filtro);
}
