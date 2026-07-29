/**
 * Fuentes que pdfmake incrusta en el PDF.
 *
 * Los `.ttf` se generan a mano con `herramientas/generar-fuentes-pdf.py` y se
 * versionan en `public/fuentes-pdf/`. Se cargan aquí, ya en el navegador, en
 * el momento de exportar: son 93 kB que no tiene por qué pagar quien solo
 * entra a leer una canción.
 */

import { ErrorDeExportacion } from "./error-exportacion";

/** Nombre dentro del sistema de ficheros virtual → fichero servido. */
const FICHEROS: Readonly<Record<string, string>> = {
  "Inter-Regular.ttf": "fuentes-pdf/Inter-Regular.ttf",
  "Inter-Bold.ttf": "fuentes-pdf/Inter-Bold.ttf",
  "Fraunces-SemiBold.ttf": "fuentes-pdf/Fraunces-SemiBold.ttf",
};

/** Familias tal como las nombra el constructor del documento. */
export const FAMILIAS = {
  Inter: {
    normal: "Inter-Regular.ttf",
    bold: "Inter-Bold.ttf",
    italics: "Inter-Regular.ttf",
    bolditalics: "Inter-Bold.ttf",
  },
  Fraunces: {
    normal: "Fraunces-SemiBold.ttf",
    bold: "Fraunces-SemiBold.ttf",
    italics: "Fraunces-SemiBold.ttf",
    bolditalics: "Fraunces-SemiBold.ttf",
  },
} as const;

export type SistemaDeFicheros = Record<string, string>;

const TROZO = 0x8000;

function aBase64(datos: ArrayBuffer): string {
  const bytes = new Uint8Array(datos);
  let binario = "";

  // De golpe con `String.fromCharCode(...bytes)` se desborda la pila: hay que
  // ir por trozos.
  for (let inicio = 0; inicio < bytes.length; inicio += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + TROZO));
  }

  return btoa(binario);
}

let cache: SistemaDeFicheros | null = null;

/**
 * Descarga las tres fuentes y las deja listas para pdfmake.
 *
 * Si alguna falla, **lanza**: es preferible no dar PDF a dar uno con las
 * fuentes por defecto, que pierde todo el diseño sin que se note hasta que
 * el coro lo abre.
 */
export async function cargarFuentes(): Promise<SistemaDeFicheros> {
  if (cache !== null) return cache;

  const entradas = await Promise.all(
    Object.entries(FICHEROS).map(async ([nombre, ruta]) => {
      const respuesta = await fetch(ruta);

      if (!respuesta.ok) {
        throw new ErrorDeExportacion(
          `No se ha podido cargar la fuente ${nombre}: el PDF quedaría sin su tipografía.`,
        );
      }

      return [nombre, aBase64(await respuesta.arrayBuffer())] as const;
    }),
  );

  cache = Object.fromEntries(entradas);

  return cache;
}

/**
 * Espera a que el navegador tenga listas las fuentes de pantalla. Sin esto,
 * el canvas mediría con una tipografía cualquiera y el ajuste de tamaño
 * saldría mal.
 */
export async function esperarFuentesDePantalla(): Promise<void> {
  await Promise.all([
    document.fonts.load("400 17px Inter"),
    document.fonts.load("700 17px Inter"),
  ]);
}
