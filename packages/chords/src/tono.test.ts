import { describe, expect, it } from 'vitest';
import { parsearAcorde } from './acorde.js';
import {
  escribirNota,
  TONOS,
  TONOS_MAYORES,
  TONOS_MENORES,
  transponerTono,
  usaBemoles,
} from './tono.js';

// Tabla de la seccion 2.4 de la especificacion tecnica.

describe('usaBemoles · tonos mayores', () => {
  it.each(['DO', 'SOL', 'RE', 'LA', 'MI', 'SI', 'FA#'])(
    '%s se escribe con sostenidos',
    (tono) => {
      expect(usaBemoles(tono)).toBe(false);
    },
  );

  it.each(['FA', 'SIb', 'MIb', 'LAb', 'REb', 'SOLb'])(
    '%s se escribe con bemoles',
    (tono) => {
      expect(usaBemoles(tono)).toBe(true);
    },
  );
});

describe('usaBemoles · tonos menores', () => {
  it.each(['LAm', 'MIm', 'SIm', 'FA#m', 'DO#m', 'SOL#m'])(
    '%s se escribe con sostenidos',
    (tono) => {
      expect(usaBemoles(tono)).toBe(false);
    },
  );

  it.each(['REm', 'SOLm', 'DOm', 'FAm', 'SIbm'])(
    '%s se escribe con bemoles',
    (tono) => {
      expect(usaBemoles(tono)).toBe(true);
    },
  );
});

describe('usaBemoles · robustez', () => {
  it('acepta el tono escrito de cualquier forma', () => {
    expect(usaBemoles('Dom')).toBe(true);
    expect(usaBemoles('Lam')).toBe(false);
  });

  it('un tono desconocido no rompe', () => {
    for (const basura of ['', '   ', 'cualquiera', 'N.C.', '%']) {
      expect(() => usaBemoles(basura)).not.toThrow();
    }
  });
});

describe('escribirNota', () => {
  it('elige la grafia segun el tono destino', () => {
    expect(escribirNota(1, 'LA')).toBe('DO#');
    expect(escribirNota(1, 'FA')).toBe('REb');
    expect(escribirNota(10, 'RE')).toBe('LA#');
    expect(escribirNota(10, 'FA')).toBe('SIb');
  });

  it('las notas naturales se escriben igual en ambas escalas', () => {
    for (const indice of [0, 2, 4, 5, 7, 9, 11]) {
      expect(escribirNota(indice, 'DO')).toBe(escribirNota(indice, 'FA'));
    }
  });

  it('normaliza indices fuera del rango 0..11', () => {
    expect(escribirNota(12, 'DO')).toBe('DO');
    expect(escribirNota(25, 'DO')).toBe('DO#');
    expect(escribirNota(-1, 'RE')).toBe('SI');
    expect(escribirNota(-13, 'RE')).toBe('SI');
  });

  it('cubre los doce indices sin devolver vacio', () => {
    // Si esta prueba pasa, el valor por defecto del acceso al array
    // es codigo inalcanzable.
    for (let i = 0; i < 12; i++) {
      expect(escribirNota(i, 'DO')).not.toBe('');
      expect(escribirNota(i, 'FA')).not.toBe('');
    }
  });
});

describe('transponerTono', () => {
  it.each([
    ['SOL', 2, 'LA'],
    ['SOL', -2, 'FA'],
    ['SOL', 1, 'LAb'],
    ['SOL', 5, 'DO'],
    ['FA#', 1, 'SOL'],
    ['DO', 0, 'DO'],
    ['SOL', 12, 'SOL'],
    ['SOL', -12, 'SOL'],
  ] as const)('%s %i semitonos -> %s', (tono, semitonos, esperado) => {
    expect(transponerTono(tono, semitonos)).toBe(esperado);
  });

  it('conserva el modo menor', () => {
    expect(transponerTono('Lam', 2)).toBe('SIm');
    expect(transponerTono('Dom', -2)).toBe('SIbm');
    expect(transponerTono('Mim', 1)).toBe('FAm');
    expect(transponerTono('SIm', 2)).toBe('DO#m');
  });

  it('devuelve intacto un tono que no reconoce', () => {
    expect(transponerTono('loquesea', 2)).toBe('loquesea');
    expect(transponerTono('', 2)).toBe('');
  });
});

describe('catalogo de tonos', () => {
  it('ofrece los doce mayores y los doce menores', () => {
    expect(TONOS_MAYORES).toHaveLength(12);
    expect(TONOS_MENORES).toHaveLength(12);
    expect(TONOS).toHaveLength(24);
  });

  it('todos los tonos del catalogo son acordes que el motor reconoce', () => {
    for (const tono of TONOS) {
      expect(parsearAcorde(tono)).not.toBeNull();
    }
  });

  it('transponer un tono del catalogo devuelve otro tono del catalogo', () => {
    for (const tono of TONOS) {
      for (let semitonos = -12; semitonos <= 12; semitonos++) {
        expect(TONOS).toContain(transponerTono(tono, semitonos));
      }
    }
  });

  it('no repite ningun tono', () => {
    expect(new Set(TONOS).size).toBe(TONOS.length);
  });
});
