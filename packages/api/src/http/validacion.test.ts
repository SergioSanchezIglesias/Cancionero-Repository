import { describe, expect, it } from "vitest";
import {
  validarFiltroCanciones,
  validarId,
  validarNuevaCancion,
} from "./validacion.js";

const CANCION_MINIMA = {
  titulo: "Ven a celebrar",
  contenido: "[SOL]VEN A CELEBRAR",
  tonoOriginal: "SOL",
};

/** Extrae el valor de un resultado válido, o falla el test si no lo es. */
function valorDe<T>(
  resultado: { ok: true; valor: T } | { ok: false; error: string },
): T {
  if (!resultado.ok) {
    throw new Error(`Se esperaba un resultado válido, llegó: ${resultado.error}`);
  }

  return resultado.valor;
}

function errorDe(
  resultado: { ok: true; valor: unknown } | { ok: false; error: string },
): string {
  if (resultado.ok) {
    throw new Error("Se esperaba un error de validación y llegó un valor");
  }

  return resultado.error;
}

describe("validarNuevaCancion", () => {
  describe("cuerpo válido", () => {
    it("acepta la canción mínima", () => {
      expect(valorDe(validarNuevaCancion(CANCION_MINIMA))).toEqual({
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELEBRAR",
        tonoOriginal: "SOL",
        notacionPorDefecto: "latina",
        cantoralOrigen: null,
        etiquetas: [],
      });
    });

    it("acepta la canción completa", () => {
      expect(
        valorDe(
          validarNuevaCancion({
            ...CANCION_MINIMA,
            notacionPorDefecto: "americana",
            cantoralOrigen: "Cantoral San Ildefonso",
            etiquetas: [1, 4],
          }),
        ),
      ).toEqual({
        titulo: "Ven a celebrar",
        contenido: "[SOL]VEN A CELEBRAR",
        tonoOriginal: "SOL",
        notacionPorDefecto: "americana",
        cantoralOrigen: "Cantoral San Ildefonso",
        etiquetas: [1, 4],
      });
    });

    it("ignora los campos que no conoce en vez de protestar", () => {
      const valor = valorDe(
        validarNuevaCancion({ ...CANCION_MINIMA, inventado: "algo", id: 99 }),
      );

      expect(valor).not.toHaveProperty("inventado");
      expect(valor).not.toHaveProperty("id");
    });
  });

  describe("cuerpo que no es un objeto", () => {
    for (const cuerpo of [null, undefined, "texto", 42, true, []]) {
      it(`rechaza ${JSON.stringify(cuerpo) ?? "undefined"}`, () => {
        expect(errorDe(validarNuevaCancion(cuerpo))).toMatch(/objeto/i);
      });
    }
  });

  describe("titulo", () => {
    it("recorta los espacios de los extremos", () => {
      const valor = valorDe(
        validarNuevaCancion({ ...CANCION_MINIMA, titulo: "  Ven a celebrar  " }),
      );

      expect(valor.titulo).toBe("Ven a celebrar");
    });

    it("rechaza que falte", () => {
      const { titulo: _, ...sinTitulo } = CANCION_MINIMA;

      expect(errorDe(validarNuevaCancion(sinTitulo))).toMatch(/titulo|título/i);
    });

    it("rechaza que esté vacío", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, titulo: "" })),
      ).toMatch(/titulo|título/i);
    });

    it("rechaza que sean solo espacios", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, titulo: "   " })),
      ).toMatch(/titulo|título/i);
    });

    it("rechaza que no sea texto", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, titulo: 42 })),
      ).toMatch(/titulo|título/i);
    });
  });

  describe("contenido", () => {
    it("NO recorta el contenido: los espacios y saltos son parte de la canción", () => {
      const contenido = "  [SOL]sangrado\n\n  y con línea en blanco  ";

      const valor = valorDe(
        validarNuevaCancion({ ...CANCION_MINIMA, contenido }),
      );

      expect(valor.contenido).toBe(contenido);
    });

    it("acepta el contenido vacío para poder guardar una canción a medias", () => {
      expect(
        valorDe(validarNuevaCancion({ ...CANCION_MINIMA, contenido: "" }))
          .contenido,
      ).toBe("");
    });

    it("rechaza que falte", () => {
      const { contenido: _, ...sinContenido } = CANCION_MINIMA;

      expect(errorDe(validarNuevaCancion(sinContenido))).toMatch(/contenido/i);
    });

    it("rechaza que no sea texto", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, contenido: 42 })),
      ).toMatch(/contenido/i);
    });
  });

  describe("tonoOriginal", () => {
    for (const tono of ["SOL", "DO", "Mim", "FA#m7", "SIb", "Dom", "SOL/SI"]) {
      it(`acepta «${tono}»`, () => {
        expect(
          valorDe(validarNuevaCancion({ ...CANCION_MINIMA, tonoOriginal: tono }))
            .tonoOriginal,
        ).toBe(tono);
      });
    }

    it("rechaza un tono que no es un acorde", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, tonoOriginal: "ZZ" })),
      ).toMatch(/tono/i);
    });

    it("rechaza un tono en notación americana: en base de datos todo va en latina", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, tonoOriginal: "G" })),
      ).toMatch(/latina/i);
    });

    it("rechaza que falte", () => {
      const { tonoOriginal: _, ...sinTono } = CANCION_MINIMA;

      expect(errorDe(validarNuevaCancion(sinTono))).toMatch(/tono/i);
    });

    it("rechaza que esté vacío", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, tonoOriginal: "" })),
      ).toMatch(/tono/i);
    });
  });

  describe("notacionPorDefecto", () => {
    it("por defecto es latina", () => {
      expect(valorDe(validarNuevaCancion(CANCION_MINIMA)).notacionPorDefecto).toBe(
        "latina",
      );
    });

    it("acepta americana", () => {
      expect(
        valorDe(
          validarNuevaCancion({
            ...CANCION_MINIMA,
            notacionPorDefecto: "americana",
          }),
        ).notacionPorDefecto,
      ).toBe("americana");
    });

    it("rechaza una notación inventada", () => {
      expect(
        errorDe(
          validarNuevaCancion({
            ...CANCION_MINIMA,
            notacionPorDefecto: "tablatura",
          }),
        ),
      ).toMatch(/notacion|notación/i);
    });
  });

  describe("cantoralOrigen", () => {
    it("por defecto es null", () => {
      expect(valorDe(validarNuevaCancion(CANCION_MINIMA)).cantoralOrigen).toBeNull();
    });

    it("acepta null explícito", () => {
      expect(
        valorDe(
          validarNuevaCancion({ ...CANCION_MINIMA, cantoralOrigen: null }),
        ).cantoralOrigen,
      ).toBeNull();
    });

    it("convierte una cadena vacía en null", () => {
      expect(
        valorDe(validarNuevaCancion({ ...CANCION_MINIMA, cantoralOrigen: "  " }))
          .cantoralOrigen,
      ).toBeNull();
    });

    it("rechaza que no sea texto", () => {
      expect(
        errorDe(
          validarNuevaCancion({ ...CANCION_MINIMA, cantoralOrigen: 42 }),
        ),
      ).toMatch(/cantoral/i);
    });
  });

  describe("etiquetas", () => {
    it("por defecto es una lista vacía", () => {
      expect(valorDe(validarNuevaCancion(CANCION_MINIMA)).etiquetas).toEqual([]);
    });

    it("acepta una lista de ids", () => {
      expect(
        valorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: [1, 4] }))
          .etiquetas,
      ).toEqual([1, 4]);
    });

    it("rechaza que no sea una lista", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: 4 })),
      ).toMatch(/etiquetas/i);
    });

    it("rechaza ids que no son números", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: ["4"] })),
      ).toMatch(/etiquetas/i);
    });

    it("rechaza ids con decimales", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: [1.5] })),
      ).toMatch(/etiquetas/i);
    });

    it("rechaza ids negativos o cero", () => {
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: [0] })),
      ).toMatch(/etiquetas/i);
      expect(
        errorDe(validarNuevaCancion({ ...CANCION_MINIMA, etiquetas: [-1] })),
      ).toMatch(/etiquetas/i);
    });
  });
});

describe("validarId", () => {
  it("acepta un id numérico en texto, como llega en la URL", () => {
    expect(validarId("7")).toBe(7);
  });

  it("rechaza texto que no es un número", () => {
    expect(validarId("abc")).toBeNull();
  });

  it("rechaza un id vacío", () => {
    expect(validarId("")).toBeNull();
    expect(validarId(undefined)).toBeNull();
  });

  it("rechaza cero y negativos", () => {
    expect(validarId("0")).toBeNull();
    expect(validarId("-3")).toBeNull();
  });

  it("rechaza decimales", () => {
    expect(validarId("1.5")).toBeNull();
  });

  it("rechaza un número con basura pegada", () => {
    expect(validarId("7abc")).toBeNull();
    expect(validarId("7 ")).toBeNull();
  });
});

describe("validarFiltroCanciones", () => {
  it("sin parámetros devuelve un filtro vacío", () => {
    expect(valorDe(validarFiltroCanciones({}))).toEqual({});
  });

  it("acepta el texto de búsqueda tal cual", () => {
    expect(valorDe(validarFiltroCanciones({ buscar: "comunion" }))).toEqual({
      buscar: "comunion",
    });
  });

  it("acepta caracteres hostiles en la búsqueda: sanearlos es cosa de FTS5", () => {
    expect(valorDe(validarFiltroCanciones({ buscar: 'di "hola" -OR' }))).toEqual({
      buscar: 'di "hola" -OR',
    });
  });

  it("acepta una etiqueta", () => {
    expect(valorDe(validarFiltroCanciones({ etiquetas: "4" }))).toEqual({
      etiquetas: [4],
    });
  });

  it("acepta varias etiquetas separadas por comas", () => {
    expect(valorDe(validarFiltroCanciones({ etiquetas: "1,4,7" }))).toEqual({
      etiquetas: [1, 4, 7],
    });
  });

  it("acepta el parámetro repetido: ?etiquetas=1&etiquetas=4", () => {
    expect(valorDe(validarFiltroCanciones({ etiquetas: ["1", "4"] }))).toEqual({
      etiquetas: [1, 4],
    });
  });

  it("ignora los espacios alrededor de las comas", () => {
    expect(valorDe(validarFiltroCanciones({ etiquetas: "1, 4 , 7" }))).toEqual({
      etiquetas: [1, 4, 7],
    });
  });

  it("trata la lista vacía como sin filtro de etiquetas", () => {
    expect(valorDe(validarFiltroCanciones({ etiquetas: "" }))).toEqual({});
  });

  it("combina búsqueda y etiquetas", () => {
    expect(
      valorDe(validarFiltroCanciones({ buscar: "senor", etiquetas: "1,7" })),
    ).toEqual({ buscar: "senor", etiquetas: [1, 7] });
  });

  it("rechaza una etiqueta que no es un número", () => {
    expect(errorDe(validarFiltroCanciones({ etiquetas: "1,abc" }))).toMatch(
      /etiquetas/i,
    );
  });

  it("rechaza una búsqueda que no es texto", () => {
    expect(errorDe(validarFiltroCanciones({ buscar: ["a", "b"] }))).toMatch(
      /buscar/i,
    );
  });
});
