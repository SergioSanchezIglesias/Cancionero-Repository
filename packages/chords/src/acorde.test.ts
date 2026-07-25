import { describe, expect, it } from 'vitest';
import { parsearAcorde, type AcordeParseado } from './acorde.js';

/**
 * Construye el objeto esperado rellenando con vacíos los campos que no
 * interesan en cada caso, para que los tests digan solo lo relevante.
 */
function ac(partes: Partial<AcordeParseado>): AcordeParseado {
  return {
    prefijo: '',
    raiz: 'DO',
    alteracion: '',
    sufijo: '',
    bajo: null,
    bajoAlteracion: '',
    sufijoExtra: '',
    ...partes,
  };
}

describe('parsearAcorde · las siete fundamentales', () => {
  it.each([
    ['DO', ac({ raiz: 'DO' })],
    ['RE', ac({ raiz: 'RE' })],
    ['MI', ac({ raiz: 'MI' })],
    ['FA', ac({ raiz: 'FA' })],
    ['SOL', ac({ raiz: 'SOL' })],
    ['LA', ac({ raiz: 'LA' })],
    ['SI', ac({ raiz: 'SI' })],
  ] as const)('%s', (token, esperado) => {
    expect(parsearAcorde(token)).toEqual(esperado);
  });

  it('SOL se parsea como SOL, no como SI (orden de alternativas)', () => {
    expect(parsearAcorde('SOL')?.raiz).toBe('SOL');
  });
});

describe('parsearAcorde · alteraciones', () => {
  it.each([
    ['DO#', ac({ raiz: 'DO', alteracion: '#' })],
    ['FA#', ac({ raiz: 'FA', alteracion: '#' })],
    ['SIb', ac({ raiz: 'SI', alteracion: 'b' })],
    ['MIb', ac({ raiz: 'MI', alteracion: 'b' })],
    ['LAb', ac({ raiz: 'LA', alteracion: 'b' })],
    ['SOLb', ac({ raiz: 'SOL', alteracion: 'b' })],
  ] as const)('%s', (token, esperado) => {
    expect(parsearAcorde(token)).toEqual(esperado);
  });
});

describe('parsearAcorde · sufijos', () => {
  it.each([
    ['SIm', ac({ raiz: 'SI', sufijo: 'm' })],
    ['Mim', ac({ raiz: 'MI', sufijo: 'm' })],
    ['Lam', ac({ raiz: 'LA', sufijo: 'm' })],
    ['DO7', ac({ raiz: 'DO', sufijo: '7' })],
    ['REsus4', ac({ raiz: 'RE', sufijo: 'sus4' })],
    ['LAmaj7', ac({ raiz: 'LA', sufijo: 'maj7' })],
    ['MIadd9', ac({ raiz: 'MI', sufijo: 'add9' })],
    ['SOLdim', ac({ raiz: 'SOL', sufijo: 'dim' })],
    ['FA#m7', ac({ raiz: 'FA', alteracion: '#', sufijo: 'm7' })],
    ['RE#sus4', ac({ raiz: 'RE', alteracion: '#', sufijo: 'sus4' })],
    ['SIbm', ac({ raiz: 'SI', alteracion: 'b', sufijo: 'm' })],
  ] as const)('%s', (token, esperado) => {
    expect(parsearAcorde(token)).toEqual(esperado);
  });

  it('"Dom" es DO menor, no un acorde dominante', () => {
    // Caso real del cantoral. Ver aviso de la seccion 2.5 de la especificacion.
    expect(parsearAcorde('Dom')).toEqual(ac({ raiz: 'DO', sufijo: 'm' }));
  });

  it('el sufijo se preserva literalmente, por encadenado que sea', () => {
    // El motor no interpreta armonia: solo mueve la fundamental.
    expect(parsearAcorde('MIm7sus4add9')).toEqual(
      ac({ raiz: 'MI', sufijo: 'm7sus4add9' }),
    );
  });

  it('acepta la fundamental en mayusculas y capitalizada', () => {
    // Convencion del cantoral: MAYUSCULAS para mayor, Capitalizado para menor.
    expect(parsearAcorde('SOL')?.raiz).toBe('SOL');
    expect(parsearAcorde('Sol')?.raiz).toBe('SOL');
    expect(parsearAcorde('Solm')?.raiz).toBe('SOL');
  });
});

describe('parsearAcorde · acordes con bajo (slash chords)', () => {
  it.each([
    ['SOL/SI', ac({ raiz: 'SOL', bajo: 'SI' })],
    ['RE/FA#', ac({ raiz: 'RE', bajo: 'FA', bajoAlteracion: '#' })],
    ['DO/MI', ac({ raiz: 'DO', bajo: 'MI' })],
    ['FA#m7/LA', ac({ raiz: 'FA', alteracion: '#', sufijo: 'm7', bajo: 'LA' })],
    ['SIb/RE', ac({ raiz: 'SI', alteracion: 'b', bajo: 'RE' })],
  ] as const)('%s', (token, esperado) => {
    expect(parsearAcorde(token)).toEqual(esperado);
  });

  it('normaliza tambien la nota del bajo', () => {
    expect(parsearAcorde('Sol/si')).toEqual(ac({ raiz: 'SOL', bajo: 'SI' }));
    expect(parsearAcorde('Mim/SOL')).toEqual(
      ac({ raiz: 'MI', sufijo: 'm', bajo: 'SOL' }),
    );
  });
});

describe('parsearAcorde · adornos', () => {
  it('desenvuelve los parentesis', () => {
    expect(parsearAcorde('(SOL)')).toEqual(
      ac({ prefijo: '(', raiz: 'SOL', sufijoExtra: ')' }),
    );
  });

  it('desenvuelve los parentesis conservando el sufijo', () => {
    expect(parsearAcorde('(SIm)')).toEqual(
      ac({ prefijo: '(', raiz: 'SI', sufijo: 'm', sufijoExtra: ')' }),
    );
  });

  it('trata las repeticiones como parte del sufijo', () => {
    expect(parsearAcorde('SOL x2')).toEqual(
      ac({ raiz: 'SOL', sufijo: ' x2' }),
    );
  });
});

describe('parsearAcorde · tokens no reconocidos devuelven null', () => {
  it.each([
    [''],
    ['   '],
    ['N.C.'],
    ['Solo'],
    ['Coda'],
    ['Intro'],
    ['%'],
    ['123'],
    ['H'],
  ])('%j -> null', (token) => {
    expect(parsearAcorde(token)).toBeNull();
  });

  it('rechaza las alteraciones dobles', () => {
    expect(parsearAcorde('SOLbb')).toBeNull();
    expect(parsearAcorde('DO##')).toBeNull();
  });

  it('rechaza las anotaciones que empiezan como un acorde', () => {
    // Al aceptar la fundamental capitalizada, "Solo" seria SOL + sufijo "o".
    // Lo impide la lista blanca de caracteres con los que puede empezar un sufijo.
    for (const anotacion of [
      'Solo',
      'Silencio',
      'Refran',
      'Final',
      'Estribillo',
      'Puente',
      'Bis',
    ]) {
      expect(parsearAcorde(anotacion), anotacion).toBeNull();
    }
  });
});

describe('parsearAcorde · robustez', () => {
  it('ningun token hace fallar el parser', () => {
    const basura = [
      '', ' ', '/', '//', 'SOL/', '/SOL', '((SOL))', 'SOL/SI/RE',
      '#', 'b', 'DO#b', '\n', '\t', 'DO ', ' DO', 'sol', 'do',
    ];
    for (const token of basura) {
      expect(() => parsearAcorde(token)).not.toThrow();
    }
  });
});
