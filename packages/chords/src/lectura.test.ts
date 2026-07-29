import { describe, expect, it } from 'vitest';
import {
  adaptarAcorde,
  prepararContenido,
  tonoDeLectura,
  type OpcionesDeLectura,
} from './lectura.js';

const TAL_CUAL: OpcionesDeLectura = {
  tonoOriginal: 'SOL',
  semitonos: 0,
  notacion: 'latina',
};

function opciones(cambios: Partial<OpcionesDeLectura>): OpcionesDeLectura {
  return { ...TAL_CUAL, ...cambios };
}

/** Los acordes de cada linea, en orden, ignorando los huecos sin acorde. */
function acordes(contenido: string, como: OpcionesDeLectura): string[] {
  return prepararContenido(contenido, como)
    .flatMap((linea) => linea.segmentos)
    .map((segmento) => segmento.acorde)
    .filter((acorde): acorde is string => acorde !== null);
}

/** Vuelve a escribir la cancion en ChordPro, ya leida con estas opciones. */
function reescribir(contenido: string, como: OpcionesDeLectura): string {
  return prepararContenido(contenido, como)
    .map((linea) => {
      const texto = linea.segmentos
        .map(
          (segmento) =>
            (segmento.acorde === null ? '' : `[${segmento.acorde}]`) +
            segmento.texto,
        )
        .join('');

      return linea.negrita ? `**${texto}**` : texto;
    })
    .join('\n');
}

const ESTRIBILLO =
  '**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**\n' +
  'SE [DO]DERRAMARA COMO [SOL]AGUA LIMPIA';

describe('prepararContenido · transposicion', () => {
  it('sube todos los acordes de la cancion sin tocar la letra', () => {
    const como = opciones({ semitonos: 2 });

    expect(acordes(ESTRIBILLO, como)).toEqual(['LA', 'DO#m', 'RE', 'LA']);
    expect(
      prepararContenido(ESTRIBILLO, como)[0]?.segmentos.map((s) => s.texto),
    ).toEqual(['VEN A CELEBRAR EL ', 'AMOR DE DIOS']);
  });

  it('la enarmonia la decide el tono destino: de SOL a FA salen bemoles', () => {
    expect(acordes(ESTRIBILLO, opciones({ semitonos: -2 }))).toEqual([
      'FA',
      'LAm',
      'SIb',
      'FA',
    ]);
  });

  it('con 0 semitonos respeta la grafia original del acorde', () => {
    // En una cancion en SOL, un SIb anotado a mano no debe volverse LA#.
    expect(acordes('[SIb]Prestado', TAL_CUAL)).toEqual(['SIb']);
  });

  it('identidad: leer sin transponer ni cambiar notacion no altera nada', () => {
    expect(reescribir(ESTRIBILLO, TAL_CUAL)).toBe(ESTRIBILLO);
  });

  it('octava: doce semitonos suenan igual que el original', () => {
    expect(acordes(ESTRIBILLO, opciones({ semitonos: 12 }))).toEqual(
      acordes(ESTRIBILLO, TAL_CUAL),
    );
  });

  it('ida y vuelta: subir y bajar lo mismo devuelve la cancion original', () => {
    for (let n = 1; n <= 11; n++) {
      const subida = opciones({ semitonos: n });
      const bajada = opciones({
        tonoOriginal: tonoDeLectura(subida),
        semitonos: -n,
      });

      expect(reescribir(reescribir(ESTRIBILLO, subida), bajada), `+${n}`).toBe(
        ESTRIBILLO,
      );
    }
  });
});

describe('prepararContenido · notacion', () => {
  it('traduce a americana sin mover ningun acorde', () => {
    expect(acordes(ESTRIBILLO, opciones({ notacion: 'americana' }))).toEqual([
      'G',
      'Bm',
      'C',
      'G',
    ]);
  });

  it('transpone y traduce a la vez', () => {
    expect(
      acordes(
        ESTRIBILLO,
        opciones({ semitonos: 2, notacion: 'americana' }),
      ),
    ).toEqual(['A', 'C#m', 'D', 'A']);
  });
});

describe('prepararContenido · robustez y formato', () => {
  it('un token que no es un acorde se devuelve intacto', () => {
    expect(
      acordes('[N.C.]Sin acompanamiento [Solo]', opciones({ semitonos: 3 })),
    ).toEqual(['N.C.', 'Solo']);
  });

  it('conserva la negrita del estribillo y las lineas en blanco', () => {
    const lineas = prepararContenido(
      '**[SOL]Estribillo**\n\n[RE]Estrofa',
      opciones({ semitonos: 2 }),
    );

    expect(lineas[0]?.negrita).toBe(true);
    expect(lineas[1]?.segmentos).toEqual([]);
    expect(lineas[2]?.negrita).toBe(false);
  });

  it('conserva los huecos sin acorde, que son los que alinean las lineas', () => {
    const lineas = prepararContenido('SE [DO]DERRAMARA', opciones({ semitonos: 2 }));

    expect(lineas[0]?.segmentos).toEqual([
      { acorde: null, texto: 'SE ' },
      { acorde: 'RE', texto: 'DERRAMARA' },
    ]);
  });

  it('un contenido vacio no da lineas', () => {
    expect(prepararContenido('', opciones({ semitonos: 5 }))).toEqual([]);
  });

  it('ningun contenido raro hace fallar la preparacion', () => {
    const basura = ['[', ']', '[]', '[/]', '[((SOL))]', '\t[#]\n', '[SOL/]'];

    for (const contenido of basura) {
      for (const semitonos of [-12, -1, 0, 1, 12]) {
        expect(() =>
          prepararContenido(contenido, opciones({ semitonos })),
        ).not.toThrow();
      }
    }
  });
});

describe('tonoDeLectura', () => {
  it('devuelve el tono al que suena la cancion', () => {
    expect(tonoDeLectura(TAL_CUAL)).toBe('SOL');
    expect(tonoDeLectura(opciones({ semitonos: 2 }))).toBe('LA');
    expect(tonoDeLectura(opciones({ semitonos: -2 }))).toBe('FA');
  });

  it('respeta el modo menor del tono original', () => {
    expect(
      tonoDeLectura(opciones({ tonoOriginal: 'LAm', semitonos: 2 })),
    ).toBe('SIm');
  });
});

describe('adaptarAcorde', () => {
  it('aplica a un acorde suelto el mismo criterio que a la cancion', () => {
    expect(adaptarAcorde('SIm', opciones({ semitonos: 2 }))).toBe('DO#m');
    expect(adaptarAcorde('SIm', opciones({ notacion: 'americana' }))).toBe(
      'Bm',
    );
  });
});
