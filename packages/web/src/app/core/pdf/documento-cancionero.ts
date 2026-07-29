import {
  cambiarNotacion,
  prepararContenido,
  tonoDeLectura,
  type Linea,
  type Notacion,
} from "@cancionero/chords";
import type {
  Content,
  ContentColumns,
  TDocumentDefinitions,
} from "pdfmake/interfaces";
import type { Cancion } from "../interfaces/cancion.interface";
import {
  ACORDE,
  ALTO_UTIL,
  escalaQueCabe,
  LETRA,
  PAGINA,
  paginasQueOcupa,
  SEPARACION_ACORDE,
} from "./maqueta";
import type { Medidor } from "./medidor";

/** Colores del sistema de diseño que viajan al PDF — PRD §15.1. */
const COLOR = {
  primary: "#BF1525",
  text: "#241C1A",
  text2: "#6E5C57",
  text3: "#A08F89",
  bgWarm2: "#FAF0EC",
} as const;

const FUENTE_TITULOS = "Fraunces";
const FUENTE_TEXTO = "Inter";

/** Lo que el editor elige en la pantalla de cancionero. */
export interface OpcionesDelCancionero {
  readonly titulo: string;
  readonly canciones: readonly Cancion[];
  readonly notacion: Notacion;
  readonly portada: boolean;
  readonly indice: boolean;
  readonly numeracion: boolean;
  /**
   * Semitonos que se aplican al exportar. El cancionero del coro va siempre a
   * `0`, en el tono guardado; lo usa la descarga de una canción suelta desde
   * el visor, que imprime lo que el editor está viendo.
   */
  readonly semitonos?: number;
}

interface CancionMaquetada {
  readonly cancion: Cancion;
  readonly lineas: readonly Linea[];
  /** Tono en el que se imprime, ya con la notación y los semitonos pedidos. */
  readonly tono: string;
  readonly escala: number;
  readonly pagina: number;
}

/**
 * El espacio en blanco de una línea vacía se reserva con un espacio duro: un
 * texto vacío no ocupa alto en pdfmake y las estrofas se pegarían.
 */
const ESPACIO_DURO = "\u00A0";

/**
 * Cada segmento es indivisible: va debajo de su acorde y no puede partirse.
 *
 * Con espacios normales, pdfmake mide el que va al final del fragmento como si
 * no ocupara nada pero después lo pinta, así que la columna siguiente se queda
 * corta y se le escapa la última letra a la línea de abajo. Con espacio duro
 * mide lo mismo que dibuja, y además no encuentra por dónde partir.
 */
function sinCortes(texto: string): string {
  return texto.replace(/ /g, ESPACIO_DURO);
}

function maquetar(
  opciones: OpcionesDelCancionero,
  medidor: Medidor,
): CancionMaquetada[] {
  // La primera canción arranca después de la portada y del índice, si los hay.
  let pagina = 1 + (opciones.portada ? 1 : 0) + (opciones.indice ? 1 : 0);

  return opciones.canciones.map((cancion) => {
    const lectura = {
      tonoOriginal: cancion.tonoOriginal,
      semitonos: opciones.semitonos ?? 0,
      notacion: opciones.notacion,
    };

    const lineas = prepararContenido(cancion.contenido, lectura);
    const tono = cambiarNotacion(tonoDeLectura(lectura), opciones.notacion);

    const escala = escalaQueCabe(lineas, medidor);
    const maquetada = { cancion, lineas, tono, escala, pagina };

    pagina += paginasQueOcupa(lineas, escala);

    return maquetada;
  });
}

function pintarLinea(linea: Linea, escala: number): ContentColumns {
  const columnas: Content[] = linea.segmentos.map((segmento) => ({
    width: "auto",
    stack: [
      {
        text: segmento.acorde === null || segmento.acorde === ""
          ? ESPACIO_DURO
          : sinCortes(segmento.acorde),
        font: FUENTE_TEXTO,
        bold: true,
        color: COLOR.primary,
        fontSize: ACORDE * escala,
        // El hueco a la derecha impide que dos acordes seguidos se toquen.
        margin: [0, 0, SEPARACION_ACORDE * escala, 0],
      },
      {
        text: segmento.texto === "" ? ESPACIO_DURO : sinCortes(segmento.texto),
        font: FUENTE_TEXTO,
        bold: linea.negrita,
        color: COLOR.text,
        fontSize: LETRA * escala,
        // Aunque sean duros, pdfmake recorta los espacios de los extremos si
        // no se le dice lo contrario, y las palabras acabarían pegadas.
        preserveLeadingSpaces: true,
        preserveTrailingSpaces: true,
      },
    ],
  }));

  return { columns: columnas, columnGap: 0 };
}

/** Ancla a la que apunta el índice para poder saltar a la canción. */
function anclaDe(cancion: Cancion): string {
  return `cancion-${cancion.id}`;
}

function pintarCancion(maquetada: CancionMaquetada, saltar: boolean): Content[] {
  const { cancion, lineas, escala } = maquetada;

  const cabecera: Content[] = [
    {
      text: cancion.titulo,
      id: anclaDe(cancion),
      font: FUENTE_TITULOS,
      fontSize: 19,
      color: COLOR.primary,
      margin: [0, 0, 0, 16],
      ...(saltar ? { pageBreak: "before" as const } : {}),
    },
  ];

  const cuerpo: Content[] = lineas.map((linea) =>
    linea.segmentos.length === 0
      ? { text: ESPACIO_DURO, fontSize: LETRA * escala * 0.7 }
      : pintarLinea(linea, escala),
  );

  return [...cabecera, ...cuerpo];
}

function pintarPortada(titulo: string): Content[] {
  return [
    {
      text: titulo,
      font: FUENTE_TITULOS,
      fontSize: 30,
      color: COLOR.primary,
      alignment: "center",
      margin: [0, ALTO_UTIL / 3, 0, 0],
    },
    {
      text: "Cancionero · San Ildefonso",
      font: FUENTE_TEXTO,
      fontSize: 11,
      color: COLOR.text2,
      alignment: "center",
      margin: [0, 10, 0, 0],
      pageBreak: "after",
    },
  ];
}

function pintarIndice(maquetadas: readonly CancionMaquetada[]): Content[] {
  return [
    {
      text: "Índice",
      font: FUENTE_TITULOS,
      fontSize: 20,
      color: COLOR.primary,
      margin: [0, 0, 0, 18],
    },
    {
      table: {
        /*
         * La última columna es ancha a propósito: pdfmake reserva el sitio del
         * número de página con el texto «00000», y si no cabe entero parte en
         * dos líneas y deja los ceros sobrantes a la vista.
         */
        widths: [18, "*", 42, 40],
        body: maquetadas.map((maquetada, posicion) => {
          // La fila entera lleva al sitio: en el móvil se agradece un blanco
          // grande al que apuntar con el dedo.
          const salta = { linkToDestination: anclaDe(maquetada.cancion) };

          return [
            {
              ...salta,
              text: String(posicion + 1),
              font: FUENTE_TEXTO,
              fontSize: 11,
              color: COLOR.text3,
            },
            {
              ...salta,
              text: maquetada.cancion.titulo,
              font: FUENTE_TEXTO,
              fontSize: 11,
              color: COLOR.text,
            },
            {
              ...salta,
              text: maquetada.tono,
              font: FUENTE_TEXTO,
              fontSize: 9,
              color: COLOR.text2,
              alignment: "right",
            },
            {
              ...salta,
              // El número lo resuelve pdfmake mirando dónde acabó la canción,
              // en vez de fiarse de lo que estimó la maqueta.
              pageReference: anclaDe(maquetada.cancion),
              font: FUENTE_TEXTO,
              fontSize: 11,
              bold: true,
              color: COLOR.primary,
              alignment: "right",
            },
          ];
        }),
      },
      layout: {
        hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
          i === 0 || i === node.table.body.length ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => COLOR.bgWarm2,
        paddingTop: () => 7,
        paddingBottom: () => 7,
      },
      pageBreak: "after",
    },
  ];
}

/**
 * Arma el cancionero completo: portada, índice y una canción por página.
 * Es una función pura — recibe las canciones y un medidor, y devuelve la
 * definición que pdfmake sabe imprimir.
 */
export function construirDocumento(
  opciones: OpcionesDelCancionero,
  medidor: Medidor,
): TDocumentDefinitions {
  const maquetadas = maquetar(opciones, medidor);

  const contenido: Content[] = [
    ...(opciones.portada ? pintarPortada(opciones.titulo) : []),
    ...(opciones.indice ? pintarIndice(maquetadas) : []),
    ...maquetadas.flatMap((maquetada, posicion) =>
      pintarCancion(maquetada, posicion > 0),
    ),
  ];

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [
      PAGINA.margenHorizontal,
      PAGINA.margenSuperior,
      PAGINA.margenHorizontal,
      PAGINA.margenInferior,
    ],
    info: { title: opciones.titulo, creator: "Cancionero" },
    defaultStyle: { font: FUENTE_TEXTO, fontSize: LETRA, lineHeight: 1.35 },
    content: contenido,
    // Sin numeración no hay pie: la hoja del coro se queda limpia.
    ...(opciones.numeracion
      ? {
          footer: (paginaActual: number): Content => ({
            text: String(paginaActual),
            font: FUENTE_TEXTO,
            fontSize: 9,
            color: COLOR.text3,
            alignment: "center",
            margin: [0, 16, 0, 0],
          }),
        }
      : {}),
  };
}

/** Nombre del fichero que se descarga, con la fecha para no pisar copias. */
export function nombreDelFichero(titulo: string, ahora = new Date()): string {
  const limpio = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const fecha = ahora.toISOString().slice(0, 10);

  return `${limpio === "" ? "cancionero" : limpio}-${fecha}.pdf`;
}

/** Solo para las pruebas y la vista de detalle: cuántas páginas saldrán. */
export function paginasTotales(
  opciones: OpcionesDelCancionero,
  medidor: Medidor,
): number {
  const maquetadas = maquetar(opciones, medidor);
  const ultima = maquetadas.at(-1);

  if (ultima === undefined) {
    return (opciones.portada ? 1 : 0) + (opciones.indice ? 1 : 0);
  }

  return (
    ultima.pagina + paginasQueOcupa(ultima.lineas, ultima.escala) - 1
  );
}
