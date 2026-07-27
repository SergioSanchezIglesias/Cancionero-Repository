import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "../db/bd-temporal.prueba.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "../db/conexion.js";
import { aplicarMigraciones } from "../db/migraciones.js";
import {
  crearCancion,
  listarCanciones,
  type FiltroCanciones,
} from "./repositorio.js";

const ENTRADA = 1;
const OFERTORIO = 4;
const COMUNION = 7;
const VIRGEN_MARIA = 9;
const ALABANZA = 12;

describe("listarCanciones", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  function titulos(filtro?: FiltroCanciones): string[] {
    return listarCanciones(bd, filtro).map((cancion) => cancion.titulo);
  }

  /** Para comparar el *conjunto* de resultados sin depender del orden. */
  function conjuntoDeTitulos(filtro?: FiltroCanciones): string[] {
    return [...titulos(filtro)].sort();
  }

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  describe("biblioteca vacía", () => {
    it("devuelve una lista vacía", () => {
      expect(listarCanciones(bd)).toEqual([]);
    });

    it("devuelve una lista vacía también con filtros", () => {
      expect(listarCanciones(bd, { buscar: "algo", etiquetas: [1] })).toEqual(
        [],
      );
    });
  });

  describe("con repertorio cargado", () => {
    beforeEach(() => {
      crearCancion(bd, {
        titulo: "Ven a celebrar",
        contenido: "**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**",
        tonoOriginal: "SOL",
        etiquetas: [ENTRADA],
      });
      crearCancion(bd, {
        titulo: "Pan de vida",
        contenido: "Cuerpo y sangre del Señor",
        tonoOriginal: "RE",
        etiquetas: [COMUNION],
      });
      crearCancion(bd, {
        titulo: "Alabaré",
        contenido: "Alabaré a mi Señor",
        tonoOriginal: "LA",
        etiquetas: [ENTRADA, ALABANZA],
      });
      crearCancion(bd, {
        titulo: "Ángel de Dios",
        contenido: "Canto a la Virgen María",
        tonoOriginal: "MI",
        etiquetas: [VIRGEN_MARIA],
      });
      crearCancion(bd, {
        titulo: "alma mía",
        contenido: "bendice al Señor",
        tonoOriginal: "DO",
        etiquetas: [],
      });
    });

    describe("forma de cada fila", () => {
      it("devuelve id, título, tono original y etiquetas", () => {
        const alabare = listarCanciones(bd, { etiquetas: [ALABANZA] })[0];

        expect(alabare).toEqual({
          id: expect.any(Number),
          titulo: "Alabaré",
          tonoOriginal: "LA",
          etiquetas: [ENTRADA, ALABANZA],
        });
      });

      it("no manda el contenido: el listado no lo necesita", () => {
        // La biblioteca solo pinta título, tono y etiquetas (PRD §6.1). Enviar la
        // letra entera de todas las canciones es peso muerto en cada carga.
        for (const cancion of listarCanciones(bd)) {
          expect(cancion).not.toHaveProperty("contenido");
        }
      });

      it("devuelve las etiquetas de cada canción en el orden de la celebración", () => {
        const alabare = listarCanciones(bd, { buscar: "Alabaré" })[0];

        expect(alabare?.etiquetas).toEqual([ENTRADA, ALABANZA]);
      });

      it("devuelve una lista vacía de etiquetas para una canción sin etiquetar", () => {
        const alma = listarCanciones(bd, { buscar: "alma" })[0];

        expect(alma?.etiquetas).toEqual([]);
      });
    });

    describe("orden alfabético", () => {
      it("ordena por título tratando las tildes como su letra base y sin distinguir mayúsculas", () => {
        // El ORDER BY de SQLite daría «Alabaré, Pan de vida, Ven a celebrar,
        // alma mía, Ángel de Dios»: mayúsculas primero y tildes al final.
        expect(titulos()).toEqual([
          "Alabaré",
          "alma mía",
          "Ángel de Dios",
          "Pan de vida",
          "Ven a celebrar",
        ]);
      });

      it("mantiene el orden alfabético al filtrar por etiquetas", () => {
        expect(titulos({ etiquetas: [ENTRADA] })).toEqual([
          "Alabaré",
          "Ven a celebrar",
        ]);
      });
    });

    describe("búsqueda de texto", () => {
      it("encuentra por título", () => {
        expect(titulos({ buscar: "celebrar" })).toEqual(["Ven a celebrar"]);
      });

      it("encuentra por el texto de la letra", () => {
        expect(titulos({ buscar: "sangre" })).toEqual(["Pan de vida"]);
      });

      it("encuentra escribiendo solo el principio de la palabra", () => {
        expect(titulos({ buscar: "cele" })).toEqual(["Ven a celebrar"]);
      });

      it("ignora las tildes: «maria» encuentra «María»", () => {
        expect(titulos({ buscar: "maria" })).toEqual(["Ángel de Dios"]);
      });

      it("ignora la eñe: «senor» encuentra «Señor»", () => {
        expect(conjuntoDeTitulos({ buscar: "senor" })).toEqual([
          "Alabaré",
          "Pan de vida",
          "alma mía",
        ]);
      });

      it("exige todas las palabras escritas", () => {
        expect(titulos({ buscar: "cuerpo sangre" })).toEqual(["Pan de vida"]);
        expect(titulos({ buscar: "cuerpo celebrar" })).toEqual([]);
      });

      it("devuelve vacío si no hay coincidencias", () => {
        expect(titulos({ buscar: "zzzz" })).toEqual([]);
      });

      it("con la búsqueda vacía devuelve toda la biblioteca", () => {
        expect(titulos({ buscar: "" })).toHaveLength(5);
      });

      it("con la búsqueda en blanco devuelve toda la biblioteca", () => {
        expect(titulos({ buscar: "   " })).toHaveLength(5);
        expect(titulos({ buscar: " \t\n " })).toHaveLength(5);
      });

      // Cada uno de estos textos rompe FTS5 si llega sin sanear.
      const entradasHostiles = [
        '"',
        "*",
        "-",
        "(",
        ")",
        "^",
        ":",
        "OR",
        "AND",
        "NEAR",
        'di "hola"',
        "columna:valor",
        "DROP TABLE cancion",
      ];

      for (const entrada of entradasHostiles) {
        it(`no revienta buscando «${entrada}»`, () => {
          expect(() => listarCanciones(bd, { buscar: entrada })).not.toThrow();
        });
      }

      it("la biblioteca sigue intacta después de las búsquedas hostiles", () => {
        for (const entrada of entradasHostiles) {
          listarCanciones(bd, { buscar: entrada });
        }

        expect(listarCanciones(bd)).toHaveLength(5);
      });
    });

    describe("filtro por etiquetas", () => {
      it("filtra por una etiqueta", () => {
        expect(titulos({ etiquetas: [COMUNION] })).toEqual(["Pan de vida"]);
      });

      it("con varias etiquetas usa lógica OR, no AND", () => {
        // «Pan de vida» solo tiene Comunión y «Ven a celebrar» solo Entrada:
        // con AND no saldría ninguna. Es la decisión de producto de la PRD §6.6.
        expect(conjuntoDeTitulos({ etiquetas: [ENTRADA, COMUNION] })).toEqual([
          "Alabaré",
          "Pan de vida",
          "Ven a celebrar",
        ]);
      });

      it("no duplica una canción que tiene varias de las etiquetas filtradas", () => {
        // «Alabaré» tiene Entrada y Alabanza: el JOIN devuelve dos filas suyas.
        const resultado = titulos({ etiquetas: [ENTRADA, ALABANZA] });

        expect(resultado.filter((titulo) => titulo === "Alabaré")).toHaveLength(
          1,
        );
        expect(resultado).toEqual(["Alabaré", "Ven a celebrar"]);
      });

      it("con la lista de etiquetas vacía devuelve toda la biblioteca", () => {
        expect(titulos({ etiquetas: [] })).toHaveLength(5);
      });

      it("devuelve vacío si la etiqueta no tiene canciones", () => {
        expect(titulos({ etiquetas: [OFERTORIO] })).toEqual([]);
      });

      it("devuelve vacío con una etiqueta que no existe en el catálogo", () => {
        expect(titulos({ etiquetas: [999] })).toEqual([]);
      });
    });

    describe("búsqueda y etiquetas combinadas", () => {
      it("aplica los dos criterios a la vez", () => {
        // Con «senor» coinciden Alabaré, Pan de vida y alma mía; de esas, solo
        // Alabaré es de Entrada.
        expect(titulos({ buscar: "senor", etiquetas: [ENTRADA] })).toEqual([
          "Alabaré",
        ]);
      });

      it("devuelve vacío si el texto coincide pero la etiqueta no", () => {
        expect(titulos({ buscar: "sangre", etiquetas: [ENTRADA] })).toEqual([]);
      });

      it("mantiene el OR entre etiquetas dentro de una búsqueda", () => {
        expect(
          conjuntoDeTitulos({
            buscar: "senor",
            etiquetas: [ENTRADA, COMUNION],
          }),
        ).toEqual(["Alabaré", "Pan de vida"]);
      });

      it("ignora una búsqueda en blanco y aplica solo las etiquetas", () => {
        expect(titulos({ buscar: "  ", etiquetas: [ENTRADA] })).toEqual([
          "Alabaré",
          "Ven a celebrar",
        ]);
      });
    });
  });
});
