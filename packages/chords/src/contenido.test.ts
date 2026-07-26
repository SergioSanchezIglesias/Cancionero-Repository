import { describe, expect, it } from 'vitest';
import { parsearContenido, type Segmento } from './contenido.js';

function seg(acorde: string | null, texto: string): Segmento {
  return { acorde, texto };
}

describe('parsearContenido · una linea, casos basicos', () => {
  it('linea sin acordes', () => {
    expect(parsearContenido('Os aseguro')).toEqual([
      { negrita: false, segmentos: [seg(null, 'Os aseguro')] },
    ]);
  });

  it('acorde al principio de la linea', () => {
    expect(parsearContenido('[SOL]VEN A CELEBRAR')).toEqual([
      { negrita: false, segmentos: [seg('SOL', 'VEN A CELEBRAR')] },
    ]);
  });

  it('texto antes del primer acorde', () => {
    expect(parsearContenido('SE [DO]DERRAMARA')).toEqual([
      {
        negrita: false,
        segmentos: [seg(null, 'SE '), seg('DO', 'DERRAMARA')],
      },
    ]);
  });

  it('varios acordes en la misma linea', () => {
    expect(parsearContenido('[Mim]Os aseguro [SIm]que Yo [FA]estare')).toEqual([
      {
        negrita: false,
        segmentos: [
          seg('Mim', 'Os aseguro '),
          seg('SIm', 'que Yo '),
          seg('FA', 'estare'),
        ],
      },
    ]);
  });

  it('acorde a mitad de palabra', () => {
    // "VEN A CELE[SIm]BRAR": el acorde se ancla a la silaba siguiente.
    expect(parsearContenido('[SOL]VEN A CELE[SIm]BRAR')).toEqual([
      {
        negrita: false,
        segmentos: [seg('SOL', 'VEN A CELE'), seg('SIm', 'BRAR')],
      },
    ]);
  });

  it('acorde al final, sin letra debajo', () => {
    expect(parsearContenido('AMOR[SOL]')).toEqual([
      { negrita: false, segmentos: [seg(null, 'AMOR'), seg('SOL', '')] },
    ]);
  });

  it('linea instrumental: solo acordes', () => {
    expect(parsearContenido('[SOL] [DO]')).toEqual([
      { negrita: false, segmentos: [seg('SOL', ' '), seg('DO', '')] },
    ]);
  });

  it('conserva los adornos del acorde tal cual', () => {
    expect(parsearContenido('[(SOL)]fin')).toEqual([
      { negrita: false, segmentos: [seg('(SOL)', 'fin')] },
    ]);
  });
});

describe('parsearContenido · preservacion literal', () => {
  it('conserva los espacios iniciales', () => {
    expect(parsearContenido('   [SOL]VEN')).toEqual([
      { negrita: false, segmentos: [seg(null, '   '), seg('SOL', 'VEN')] },
    ]);
  });

  it('conserva los espacios multiples entre palabras', () => {
    expect(parsearContenido('uno   dos')).toEqual([
      { negrita: false, segmentos: [seg(null, 'uno   dos')] },
    ]);
  });

  it('una linea por cada salto de linea', () => {
    const resultado = parsearContenido('primera\nsegunda\ntercera');
    expect(resultado).toHaveLength(3);
    expect(resultado[0]?.segmentos[0]?.texto).toBe('primera');
    expect(resultado[2]?.segmentos[0]?.texto).toBe('tercera');
  });

  it('la linea en blanco que separa estrofas se conserva', () => {
    const resultado = parsearContenido('estrofa uno\n\nestrofa dos');
    expect(resultado).toHaveLength(3);
    expect(resultado[1]).toEqual({ negrita: false, segmentos: [] });
  });

  it('acepta saltos de linea de Windows', () => {
    expect(parsearContenido('uno\r\ndos')).toHaveLength(2);
  });

  it('el contenido vacio no produce lineas', () => {
    expect(parsearContenido('')).toEqual([]);
  });
});

describe('parsearContenido · negrita (estribillo)', () => {
  it('marca la linea envuelta en asteriscos dobles', () => {
    expect(parsearContenido('**[SOL]VEN A CELEBRAR**')).toEqual([
      { negrita: true, segmentos: [seg('SOL', 'VEN A CELEBRAR')] },
    ]);
  });

  it('funciona sin acordes', () => {
    expect(parsearContenido('**ESTRIBILLO**')).toEqual([
      { negrita: true, segmentos: [seg(null, 'ESTRIBILLO')] },
    ]);
  });

  it('una linea normal no va en negrita', () => {
    expect(parsearContenido('[SOL]VEN')[0]?.negrita).toBe(false);
  });

  it('los asteriscos a mitad de linea no marcan negrita', () => {
    // La negrita es una propiedad de LINEA: o envuelve toda la linea o nada.
    expect(parsearContenido('Hola **mundo**')).toEqual([
      { negrita: false, segmentos: [seg(null, 'Hola **mundo**')] },
    ]);
  });
});

describe('parsearContenido · robustez', () => {
  it('un corchete sin cerrar se trata como texto', () => {
    expect(parsearContenido('[SOL VEN')).toEqual([
      { negrita: false, segmentos: [seg(null, '[SOL VEN')] },
    ]);
  });

  it('un token que no es un acorde se conserva igual', () => {
    // parsearContenido trocea, no valida. Ya se encargara transponerAcorde.
    expect(parsearContenido('[N.C.]silencio')).toEqual([
      { negrita: false, segmentos: [seg('N.C.', 'silencio')] },
    ]);
  });

  it('ningun contenido hace fallar el parser', () => {
    const basura = [
      '',
      '\n',
      '\n\n\n',
      '[',
      ']',
      '[]',
      '**',
      '****',
      '[[SOL]]',
      '   ',
      '\t[SOL]\t',
    ];
    for (const contenido of basura) {
      expect(() => parsearContenido(contenido), contenido).not.toThrow();
    }
  });
});

describe('parsearContenido · ejemplo real de la especificacion', () => {
  const CANCION = [
    '**[SOL]VEN A CELEBRAR EL [SIm]AMOR DE DIOS**',
    '**SE [DO]DERRAMARA COMO [SOL]AGUA LIMPIA**',
    '',
    '[Mim]Os aseguro [SIm]que Yo [FA]estare cuando',
    'dos o mas por Mi [DO]os reunais;',
  ].join('\n');

  it('produce una linea por cada linea del texto', () => {
    expect(parsearContenido(CANCION)).toHaveLength(5);
  });

  it('marca en negrita solo las dos primeras', () => {
    const lineas = parsearContenido(CANCION);
    expect(lineas.map((l) => l.negrita)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('trocea correctamente la segunda linea del estribillo', () => {
    const lineas = parsearContenido(CANCION);
    expect(lineas[1]?.segmentos).toEqual([
      seg(null, 'SE '),
      seg('DO', 'DERRAMARA COMO '),
      seg('SOL', 'AGUA LIMPIA'),
    ]);
  });

  it('la ultima linea empieza con texto sin acorde', () => {
    const lineas = parsearContenido(CANCION);
    expect(lineas[4]?.segmentos[0]).toEqual(seg(null, 'dos o mas por Mi '));
  });
});
