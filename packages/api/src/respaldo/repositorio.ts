import type { Notacion } from "@cancionero/chords";
import type { BaseDeDatos } from "../db/conexion.js";
import { compararTitulos } from "../orden.js";

export const VERSION_RESPALDO = 1;

export interface CancionRespaldo {
  titulo: string;
  contenido: string;
  tonoOriginal: string;
  notacionPorDefecto?: Notacion;
  cantoralOrigen?: string | null;
  etiquetas?: string[];
  creadoEn?: string;
  editadoEn?: string;
}

export interface Respaldo {
  version: number;
  generadoEn: string;
  canciones: CancionRespaldo[];
}

interface FilaExportada {
  id: number;
  titulo: string;
  contenido: string;
  tonoOriginal: string;
  notacionPorDefecto: Notacion;
  cantoralOrigen: string | null;
  creadoEn: string;
  editadoEn: string;
}

const EXPORTAR_CANCIONES = `
  SELECT id,
         titulo,
         contenido,
         tono_original        AS tonoOriginal,
         notacion_por_defecto AS notacionPorDefecto,
         cantoral_origen      AS cantoralOrigen,
         creado_en            AS creadoEn,
         editado_en           AS editadoEn
    FROM cancion
`;

const EXPORTAR_ETIQUETAS = `
  SELECT ce.cancion_id AS cancionId, e.nombre
    FROM cancion_etiqueta ce
    JOIN etiqueta e ON e.id = ce.etiqueta_id
   ORDER BY e.orden
`;

const IMPORTAR_CANCION = `
  INSERT INTO cancion (titulo, contenido, tono_original, notacion_por_defecto,
                       cantoral_origen, creado_en, editado_en)
  VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
`;

const ASIGNAR_ETIQUETA = `
  INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)
`;

const BORRAR_CANCIONES = `DELETE FROM cancion`;

const CATALOGO = `SELECT id, nombre FROM etiqueta`;

export function exportarBiblioteca(bd: BaseDeDatos): Respaldo {
  const filas = bd.prepare<[], FilaExportada>(EXPORTAR_CANCIONES).all();

  const nombresPorCancion = new Map<number, string[]>();

  for (const fila of bd
    .prepare<[], { cancionId: number; nombre: string }>(EXPORTAR_ETIQUETAS)
    .all()) {
    const nombres = nombresPorCancion.get(fila.cancionId) ?? [];
    nombres.push(fila.nombre);
    nombresPorCancion.set(fila.cancionId, nombres);
  }

  const canciones = filas
    .map(({ id, ...cancion }): CancionRespaldo => ({
      ...cancion,
      etiquetas: nombresPorCancion.get(id) ?? [],
    }))
    .sort((a, b) => compararTitulos(a.titulo, b.titulo));

  return {
    version: VERSION_RESPALDO,
    generadoEn: new Date().toISOString(),
    canciones,
  };
}

export function importarRespaldo(bd: BaseDeDatos, respaldo: Respaldo): number {
  const idPorNombre = new Map(
    bd
      .prepare<[], { id: number; nombre: string }>(CATALOGO)
      .all()
      .map((etiqueta) => [etiqueta.nombre, etiqueta.id]),
  );

  const borrar = bd.prepare(BORRAR_CANCIONES);
  const insertar = bd.prepare<
    [
      string,
      string,
      string,
      Notacion,
      string | null,
      string | null,
      string | null,
    ]
  >(IMPORTAR_CANCION);
  const asignar = bd.prepare<[number, number]>(ASIGNAR_ETIQUETA);

  const importar = bd.transaction((): number => {
    borrar.run();

    for (const cancion of respaldo.canciones) {
      const resultado = insertar.run(
        cancion.titulo,
        cancion.contenido,
        cancion.tonoOriginal,
        cancion.notacionPorDefecto ?? "latina",
        cancion.cantoralOrigen ?? null,
        cancion.creadoEn ?? null,
        cancion.editadoEn ?? null,
      );

      const cancionId = Number(resultado.lastInsertRowid);

      for (const nombre of new Set(cancion.etiquetas ?? [])) {
        const etiquetaId = idPorNombre.get(nombre);

        if (etiquetaId === undefined) {
          throw new Error(
            `La etiqueta «${nombre}» no está en el catálogo fijo.`,
          );
        }

        asignar.run(cancionId, etiquetaId);
      }
    }

    return respaldo.canciones.length;
  });

  return importar();
}
