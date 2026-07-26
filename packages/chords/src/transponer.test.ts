import { describe, expect, it } from 'vitest';
import { transponerAcorde } from './transponer.js';
import { transponerTono } from './tono.js';

// Baterias de la seccion 3 de la especificacion tecnica.

describe('transponerAcorde · SOL -> LA (+2, tono con sostenidos)', () => {
  it.each([
    ['SOL', 'LA'],
    ['SIm', 'DO#m'],
    ['DO', 'RE'],
    ['Mim', 'FA#m'],
    ['Lam', 'SIm'],
    ['RE', 'MI'],
    ['FA', 'SOL'],
    ['Dom', 'REm'],
    ['LA', 'SI'],
    ['(SOL)', '(LA)'],
    ['SOL/SI', 'LA/DO#'],
  ] as const)('%s -> %s', (entrada, esperado) => {
    expect(transponerAcorde(entrada, 2, 'LA')).toBe(esperado);
  });
});

describe('transponerAcorde · SOL -> FA (-2, tono con bemoles)', () => {
  it.each([
    ['SOL', 'FA'],
    ['SIm', 'LAm'],
    ['DO', 'SIb'],
    ['Mim', 'REm'],
    ['Lam', 'SOLm'],
    ['RE', 'DO'],
    ['FA', 'MIb'],
    ['Dom', 'SIbm'],
    ['LA', 'SOL'],
  ] as const)('%s -> %s', (entrada, esperado) => {
    expect(transponerAcorde(entrada, -2, 'FA')).toBe(esperado);
  });
});

describe('transponerAcorde · sufijos y bajos', () => {
  it.each([
    ['DO7', 2, 'RE', 'RE7'],
    ['REsus4', 1, 'MI', 'RE#sus4'],
    ['FA#m7', 1, 'SOL', 'SOLm7'],
    ['LAmaj7', -1, 'LAb', 'LAbmaj7'],
    ['SOL/SI', 5, 'DO', 'DO/MI'],
    ['MIadd9', 7, 'SI', 'SIadd9'],
  ] as const)(
    '%s %i semitonos hacia %s -> %s',
    (entrada, semitonos, destino, esperado) => {
      expect(transponerAcorde(entrada, semitonos, destino)).toBe(esperado);
    },
  );

  it('el bajo se transpone por separado', () => {
    expect(transponerAcorde('SOL/SI', 7, 'RE')).toBe('RE/FA#');
  });

  it('el sufijo se copia literalmente, sin interpretarlo', () => {
    expect(transponerAcorde('MIm7sus4add9', 2, 'LA')).toBe('FA#m7sus4add9');
  });
});

describe('transponerAcorde · el tono destino decide la grafia', () => {
  it('la misma tecla se escribe distinto segun la tonalidad', () => {
    // Indice 10: LA# en tonos con sostenidos, SIb en tonos con bemoles.
    expect(transponerAcorde('SOL', 3, 'SIb')).toBe('SIb');
    expect(transponerAcorde('SOL', 3, 'SI')).toBe('LA#');
  });
});

describe('transponerAcorde · tokens no reconocidos', () => {
  it.each(['N.C.', 'Solo', 'Coda', 'Intro', '%', '', '   '])(
    '%j se devuelve intacto',
    (token) => {
      expect(transponerAcorde(token, 2, 'LA')).toBe(token);
    },
  );
});

describe('transponerAcorde · normalizacion', () => {
  it('la fundamental sale siempre en mayusculas', () => {
    // "Dom" es DO menor; al transponer se reescribe en forma canonica.
    expect(transponerAcorde('Dom', 0, 'DO')).toBe('DOm');
    expect(transponerAcorde('Sol', 0, 'SOL')).toBe('SOL');
  });
});

describe('transponerAcorde · invariantes', () => {
  /** Acordes reales de una cancion en SOL, ya en forma canonica. */
  const ACORDES = [
    'SOL',
    'SIm',
    'DO',
    'MIm',
    'LAm',
    'RE',
    'FA',
    'LA',
    'DO7',
    'REsus4',
    'SOL/SI',
    '(SOL)',
  ] as const;

  it('identidad: transponer 0 semitonos no cambia nada', () => {
    for (const acorde of ACORDES) {
      expect(transponerAcorde(acorde, 0, 'SOL'), acorde).toBe(acorde);
    }
  });

  it('octava: transponer 12 semitonos equivale a no transponer', () => {
    for (const acorde of ACORDES) {
      expect(transponerAcorde(acorde, 12, 'SOL'), acorde).toBe(acorde);
      expect(transponerAcorde(acorde, -12, 'SOL'), acorde).toBe(acorde);
    }
  });

  it('ida y vuelta: +n seguido de -n devuelve el original', () => {
    for (let n = 1; n <= 11; n++) {
      const destino = transponerTono('SOL', n);
      for (const acorde of ACORDES) {
        const ida = transponerAcorde(acorde, n, destino);
        const vuelta = transponerAcorde(ida, -n, 'SOL');
        expect(vuelta, `${acorde} +${n} -> ${ida} -> vuelta`).toBe(acorde);
      }
    }
  });

  it('robustez: ningun token hace fallar la transposicion', () => {
    const basura = [
      '',
      ' ',
      '/',
      '//',
      'SOL/',
      '/SOL',
      '((SOL))',
      'SOL/SI/RE',
      '#',
      'b',
      '\n',
      '\t',
      'N.C.',
      'Solo',
    ];
    for (const token of basura) {
      for (const n of [-12, -1, 0, 1, 12]) {
        expect(() => transponerAcorde(token, n, 'SOL')).not.toThrow();
      }
    }
  });
});
