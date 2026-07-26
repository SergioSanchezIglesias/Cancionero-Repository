import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  crearBaseDeDatosTemporal,
  type BaseDeDatosTemporal,
} from "./bd-temporal.prueba.js";
import { sanearConsultaFts } from "./busqueda.js";
import { abrirBaseDeDatos, type BaseDeDatos } from "./conexion.js";
import { aplicarMigraciones } from "./migraciones.js";

describe("sanearConsultaFts", () => {
  describe("consultas normales", () => {
    it("envuelve una palabra en comillas y la marca como prefijo", () => {
      expect(sanearConsultaFts("comunion")).toBe('"comunion"*');
    });

    it("trata varias palabras como términos independientes", () => {
      expect(sanearConsultaFts("ven celebrar")).toBe('"ven"* "celebrar"*');
    });

    it("recorta los espacios de los extremos", () => {
      expect(sanearConsultaFts("  comunion  ")).toBe('"comunion"*');
    });

    it("colapsa los espacios sobrantes entre palabras", () => {
      expect(sanearConsultaFts("ven    a\tcelebrar")).toBe(
        '"ven"* "a"* "celebrar"*',
      );
    });

    it("conserva los acentos y las mayúsculas tal cual", () => {
      expect(sanearConsultaFts("Comunión")).toBe('"Comunión"*');
    });
  });

  describe("consultas sin nada que buscar", () => {
    it("devuelve null con la cadena vacía", () => {
      expect(sanearConsultaFts("")).toBeNull();
    });

    it("devuelve null si solo hay espacios", () => {
      expect(sanearConsultaFts("     ")).toBeNull();
    });

    it("devuelve null si solo hay espacios en blanco de cualquier tipo", () => {
      expect(sanearConsultaFts(" \t \n ")).toBeNull();
    });
  });

  describe("neutraliza los operadores de FTS5", () => {
    it("duplica las comillas dobles para que no cierren la frase", () => {
      expect(sanearConsultaFts('di "hola"')).toBe('"di"* """hola"""*');
    });

    it("trata OR como texto, no como operador", () => {
      expect(sanearConsultaFts("santo OR cordero")).toBe(
        '"santo"* "OR"* "cordero"*',
      );
    });

    it("trata el guion como texto, no como negación", () => {
      expect(sanearConsultaFts("-santo")).toBe('"-santo"*');
    });

    it("trata los paréntesis como texto, no como agrupación", () => {
      expect(sanearConsultaFts("(santo)")).toBe('"(santo)"*');
    });

    it("trata el asterisco del usuario como texto", () => {
      expect(sanearConsultaFts("santo*")).toBe('"santo*"*');
    });
  });
});

describe("sanearConsultaFts contra una base de datos real", () => {
  let temporal: BaseDeDatosTemporal;
  let bd: BaseDeDatos;

  function buscarTitulos(expresion: string | null): unknown[] {
    if (expresion === null) return [];

    return bd
      .prepare(
        `SELECT c.titulo
           FROM cancion_fts f
           JOIN cancion c ON c.id = f.rowid
          WHERE cancion_fts MATCH ?
          ORDER BY rank`,
      )
      .pluck()
      .all(expresion);
  }

  beforeEach(() => {
    temporal = crearBaseDeDatosTemporal();
    bd = abrirBaseDeDatos(temporal.ruta);
    aplicarMigraciones(bd);

    const insertar = bd.prepare(
      "INSERT INTO cancion (titulo, contenido, tono_original) VALUES (?, ?, ?)",
    );
    insertar.run("Canto de Comunión", "Cuerpo y sangre del Señor", "SOL");
    insertar.run("Virgen María", "Madre llena de gracia", "RE");
  });

  afterEach(() => {
    bd.close();
    temporal.limpiar();
  });

  it("encuentra una canción escribiendo solo el principio de la palabra", () => {
    expect(buscarTitulos(sanearConsultaFts("comu"))).toEqual([
      "Canto de Comunión",
    ]);
  });

  it("encuentra una canción sin escribir los acentos", () => {
    expect(buscarTitulos(sanearConsultaFts("maria"))).toEqual(["Virgen María"]);
  });

  it("busca también dentro de la letra", () => {
    expect(buscarTitulos(sanearConsultaFts("gracia"))).toEqual([
      "Virgen María",
    ]);
  });

  it("exige que aparezcan todas las palabras escritas", () => {
    expect(buscarTitulos(sanearConsultaFts("virgen madre"))).toEqual([
      "Virgen María",
    ]);
    expect(buscarTitulos(sanearConsultaFts("virgen cuerpo"))).toEqual([]);
  });

  it("no encuentra nada si no hay coincidencias", () => {
    expect(buscarTitulos(sanearConsultaFts("zzzz"))).toEqual([]);
  });

  // Cada uno de estos textos rompe la búsqueda si se pasa sin sanear.
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
    "NOT",
    "NEAR",
    "a-b",
    'di "hola"',
    "...",
    "- ( )",
    "comunion*",
    "^inicio",
    "columna:valor",
    "DROP TABLE cancion",
  ];

  for (const entrada of entradasHostiles) {
    it(`no rompe la búsqueda con «${entrada}»`, () => {
      expect(() => buscarTitulos(sanearConsultaFts(entrada))).not.toThrow();
    });
  }

  it("las canciones siguen intactas después de las búsquedas hostiles", () => {
    for (const entrada of entradasHostiles) {
      buscarTitulos(sanearConsultaFts(entrada));
    }

    const total = bd.prepare("SELECT COUNT(*) FROM cancion").pluck().get();

    expect(total).toBe(2);
  });
});
