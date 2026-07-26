import { describe, expect, it } from 'vitest';
import { indiceCromatico } from './notas.js';

describe('indiceCromatico · notas naturales', () => {
  it.each([
    ['DO', 0],
    ['RE', 2],
    ['MI', 4],
    ['FA', 5],
    ['SOL', 7],
    ['LA', 9],
    ['SI', 11],
  ] as const)('%s -> %i', (raiz, esperado) => {
    expect(indiceCromatico(raiz, '')).toBe(esperado);
  });
});

describe('indiceCromatico · alteraciones', () => {
  it.each([
    ['DO', '#', 1],
    ['RE', '#', 3],
    ['FA', '#', 6],
    ['SOL', '#', 8],
    ['LA', '#', 10],
    ['RE', 'b', 1],
    ['MI', 'b', 3],
    ['SOL', 'b', 6],
    ['LA', 'b', 8],
    ['SI', 'b', 10],
  ] as const)('%s%s -> %i', (raiz, alteracion, esperado) => {
    expect(indiceCromatico(raiz, alteracion)).toBe(esperado);
  });

  it('da la vuelta en los extremos de la escala', () => {
    expect(indiceCromatico('DO', 'b')).toBe(11); // DOb suena como SI
    expect(indiceCromatico('SI', '#')).toBe(0); // SI# suena como DO
  });
});

describe('indiceCromatico · enarmonias', () => {
  it('dos grafias de la misma tecla dan el mismo indice', () => {
    expect(indiceCromatico('DO', '#')).toBe(indiceCromatico('RE', 'b'));
    expect(indiceCromatico('FA', '#')).toBe(indiceCromatico('SOL', 'b'));
    expect(indiceCromatico('LA', '#')).toBe(indiceCromatico('SI', 'b'));
  });

  it('siempre devuelve un indice entre 0 y 11', () => {
    const raices = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'] as const;
    const alteraciones = ['', '#', 'b'] as const;
    for (const raiz of raices) {
      for (const alteracion of alteraciones) {
        const i = indiceCromatico(raiz, alteracion);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThanOrEqual(11);
      }
    }
  });
});
