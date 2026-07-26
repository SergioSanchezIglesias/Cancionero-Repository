import { describe, expect, it } from 'vitest';
import { aAmericana, aLatina, cambiarNotacion } from './notacion.js';

// Tabla de la seccion 2.5 de la especificacion tecnica.

describe('aAmericana · tabla de la especificacion', () => {
  it.each([
    ['SOL', 'G'],
    ['SIm', 'Bm'],
    ['FA#m7', 'F#m7'],
    ['SOL/SI', 'G/B'],
    ['Dom', 'Cm'],
  ] as const)('%s -> %s', (latina, americana) => {
    expect(aAmericana(latina)).toBe(americana);
  });
});

describe('aAmericana · las siete fundamentales', () => {
  it.each([
    ['DO', 'C'],
    ['RE', 'D'],
    ['MI', 'E'],
    ['FA', 'F'],
    ['SOL', 'G'],
    ['LA', 'A'],
    ['SI', 'B'],
  ] as const)('%s -> %s', (latina, americana) => {
    expect(aAmericana(latina)).toBe(americana);
  });
});

describe('aAmericana · alteraciones y sufijos', () => {
  it.each([
    ['SIb', 'Bb'],
    ['FA#', 'F#'],
    ['MIb', 'Eb'],
    ['LAmaj7', 'Amaj7'],
    ['REsus4', 'Dsus4'],
    ['MIadd9', 'Eadd9'],
    ['SOLdim', 'Gdim'],
    ['SIbm', 'Bbm'],
    ['MIm7sus4add9', 'Em7sus4add9'],
  ] as const)('%s -> %s', (latina, americana) => {
    expect(aAmericana(latina)).toBe(americana);
  });
});

describe('aAmericana · adornos y bajos', () => {
  it.each([
    ['(SOL)', '(G)'],
    ['(SIm)', '(Bm)'],
    ['SOL x2', 'G x2'],
    ['RE/FA#', 'D/F#'],
    ['SIb/RE', 'Bb/D'],
    ['FA#m7/LA', 'F#m7/A'],
  ] as const)('%s -> %s', (latina, americana) => {
    expect(aAmericana(latina)).toBe(americana);
  });
});

describe('aAmericana · tokens no reconocidos', () => {
  it.each(['N.C.', 'Solo', 'Coda', '%', '', '   '])(
    '%j se devuelve intacto',
    (token) => {
      expect(aAmericana(token)).toBe(token);
    },
  );
});

describe('aLatina', () => {
  it.each([
    ['G', 'SOL'],
    ['Bm', 'SIm'],
    ['F#m7', 'FA#m7'],
    ['G/B', 'SOL/SI'],
    ['Cm', 'DOm'],
    ['Bb', 'SIb'],
    ['A', 'LA'],
    ['Eb', 'MIb'],
    ['(G)', '(SOL)'],
    ['D/F#', 'RE/FA#'],
  ] as const)('%s -> %s', (americana, latina) => {
    expect(aLatina(americana)).toBe(latina);
  });

  it.each(['H', 'N.C.', 'Solo', '', '   '])(
    '%j se devuelve intacto',
    (token) => {
      expect(aLatina(token)).toBe(token);
    },
  );
});

describe('cambiarNotacion', () => {
  it('traduce cuando se pide americana', () => {
    expect(cambiarNotacion('SIm', 'americana')).toBe('Bm');
  });

  it('deja el acorde tal cual cuando se pide latina', () => {
    // El contenido siempre se guarda en latina: no hay nada que traducir.
    expect(cambiarNotacion('SIm', 'latina')).toBe('SIm');
  });
});

describe('invariante · idempotencia de notacion', () => {
  /** Acordes en forma canonica (fundamental en mayusculas). */
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
    'FA#m7',
    'SIb',
    'MIb',
    'SOL/SI',
    'RE/FA#',
    '(SOL)',
  ] as const;

  it('latina -> americana -> latina devuelve el original', () => {
    for (const acorde of ACORDES) {
      expect(aLatina(aAmericana(acorde)), acorde).toBe(acorde);
    }
  });

  it('la traduccion no pierde el sufijo ni el bajo', () => {
    for (const acorde of ACORDES) {
      const americana = aAmericana(acorde);
      expect(americana, acorde).not.toBe('');
      expect(americana.includes('/'), acorde).toBe(acorde.includes('/'));
    }
  });
});
