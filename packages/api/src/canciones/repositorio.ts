import type { Notacion } from "@cancionero/chords";
import { sanearConsultaFts } from "../db/busqueda.js";
import type { BaseDeDatos } from "../db/conexion.js";
import { compararTitulos } from "../orden.js";

export interface Cancion {
  id: number;
  titulo: string;
  contenido: string;
  tonoOriginal: string;
  notacionPorDefecto: Notacion;
  cantoralOrigen: string | null;
  creadoEn: string;
  editadoEn: string;
  etiquetas: number[];
}

export interface NuevaCancion {
  titulo: string;
  contenido: string;
  tonoOriginal: string;
  notacionPorDefecto?: Notacion;
  cantoralOrigen?: string | null;
  etiquetas?: number[];
}

type FilaCancion = Omit<Cancion, "etiquetas">;

const INSERTAR_CANCION = `
  INSERT INTO cancion (titulo, contenido, tono_original, notacion_por_defecto, cantoral_origen)
  VALUES (?, ?, ?, ?, ?)
`;

const ASIGNAR_ETIQUETA = `
  INSERT INTO cancion_etiqueta (cancion_id, etiqueta_id) VALUES (?, ?)
`;

const QUITAR_ETIQUETAS = `
  DELETE FROM cancion_etiqueta WHERE cancion_id = ?
`;

const ACTUALIZAR_CANCION = `
  UPDATE cancion
     SET titulo               = ?,
         contenido            = ?,
         tono_original        = ?,
         notacion_por_defecto = ?,
         cantoral_origen      = ?,
         editado_en           = datetime('now')
   WHERE id = ?
`;

const BORRAR_CANCION = `
  DELETE FROM cancion WHERE id = ?
`;

const OBTENER_CANCION = `
  SELECT id,
         titulo,
         contenido,
         tono_original        AS tonoOriginal,
         notacion_por_defecto AS notacionPorDefecto,
         cantoral_origen      AS cantoralOrigen,
         creado_en            AS creadoEn,
         editado_en           AS editadoEn
    FROM cancion
   WHERE id = ?
`;

const ETIQUETAS_DE_CANCION = `
  SELECT ce.etiqueta_id
    FROM cancion_etiqueta ce
    JOIN etiqueta e ON e.id = ce.etiqueta_id
   WHERE ce.cancion_id = ?
   ORDER BY e.orden
`;

export function obtenerCancion(bd: BaseDeDatos, id: number): Cancion | null {
  const fila = bd.prepare<[number], FilaCancion>(OBTENER_CANCION).get(id);

  if (fila === undefined) return null;

  const etiquetas = bd
    .prepare<[number], number>(ETIQUETAS_DE_CANCION)
    .pluck()
    .all(id);

  return { ...fila, etiquetas };
}

export function crearCancion(bd: BaseDeDatos, datos: NuevaCancion): Cancion {
  const insertar =
    bd.prepare<[string, string, string, Notacion, string | null]>(
      INSERTAR_CANCION,
    );

  const asignar = bd.prepare<[number, number]>(ASIGNAR_ETIQUETA);

  const crear = bd.transaction((): number => {
    const resultado = insertar.run(
      datos.titulo,
      datos.contenido,
      datos.tonoOriginal,
      datos.notacionPorDefecto ?? "latina",
      datos.cantoralOrigen ?? null,
    );

    const id = Number(resultado.lastInsertRowid);

    for (const etiquetaId of new Set(datos.etiquetas ?? [])) {
      asignar.run(id, etiquetaId);
    }

    return id;
  });

  const id = crear();
  const cancion = obtenerCancion(bd, id);

  if (cancion === null) {
    throw new Error(`No se ha podido leer la canción ${id} recién creada.`);
  }

  return cancion;
}

export function actualizarCancion(
  bd: BaseDeDatos,
  id: number,
  datos: NuevaCancion,
): Cancion | null {
  const actualizar =
    bd.prepare<[string, string, string, Notacion, string | null, number]>(
      ACTUALIZAR_CANCION,
    );

  const quitarEtiquetas = bd.prepare<[number]>(QUITAR_ETIQUETAS);
  const asignar = bd.prepare<[number, number]>(ASIGNAR_ETIQUETA);

  const editar = bd.transaction((): boolean => {
    const resultado = actualizar.run(
      datos.titulo,
      datos.contenido,
      datos.tonoOriginal,
      datos.notacionPorDefecto ?? "latina",
      datos.cantoralOrigen ?? null,
      id,
    );

    if (resultado.changes === 0) return false;

    quitarEtiquetas.run(id);

    for (const etiquetaId of new Set(datos.etiquetas ?? [])) {
      asignar.run(id, etiquetaId);
    }

    return true;
  });

  return editar() ? obtenerCancion(bd, id) : null;
}

export function borrarCancion(bd: BaseDeDatos, id: number): boolean {
  return bd.prepare<[number]>(BORRAR_CANCION).run(id).changes > 0;
}

export interface CancionResumen {
  id: number;
  titulo: string;
  tonoOriginal: string;
  etiquetas: number[];
}

export interface FiltroCanciones {
  buscar?: string;
  etiquetas?: number[];
}

type FilaResumen = Omit<CancionResumen, "etiquetas">;
type Parametro = string | number;

interface FilaEtiquetaDeCancion {
  cancionId: number;
  etiquetaId: number;
}

function etiquetasPorCancion(
  bd: BaseDeDatos,
  ids: number[],
): Map<number, number[]> {
  const agrupadas = new Map<number, number[]>();

  if (ids.length === 0) return agrupadas;

  const huecos = ids.map(() => "?").join(", ");

  const filas = bd
    .prepare<number[], FilaEtiquetaDeCancion>(
      `SELECT ce.cancion_id AS cancionId, ce.etiqueta_id AS etiquetaId
         FROM cancion_etiqueta ce
         JOIN etiqueta e ON e.id = ce.etiqueta_id
        WHERE ce.cancion_id IN (${huecos})
        ORDER BY e.orden`,
    )
    .all(...ids);

  for (const fila of filas) {
    const etiquetas = agrupadas.get(fila.cancionId) ?? [];
    etiquetas.push(fila.etiquetaId);
    agrupadas.set(fila.cancionId, etiquetas);
  }

  return agrupadas;
}

export function listarCanciones(
  bd: BaseDeDatos,
  filtro: FiltroCanciones = {},
): CancionResumen[] {
  const expresion = sanearConsultaFts(filtro.buscar ?? "");
  const etiquetas = filtro.etiquetas ?? [];

  const uniones: string[] = [];
  const condiciones: string[] = [];
  const parametros: Parametro[] = [];

  if (expresion !== null) {
    uniones.push("JOIN cancion_fts f ON f.rowid = c.id");
    condiciones.push("f.cancion_fts MATCH ?");
    parametros.push(expresion);
  }

  if (etiquetas.length > 0) {
    const huecos = etiquetas.map(() => "?").join(", ");
    uniones.push("JOIN cancion_etiqueta ce ON ce.cancion_id = c.id");
    condiciones.push(`ce.etiqueta_id IN (${huecos})`);
    parametros.push(...etiquetas);
  }

  const sql = [
    "SELECT DISTINCT c.id, c.titulo, c.tono_original AS tonoOriginal",
    "FROM cancion c",
    ...uniones,
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "",
  ].join("\n");

  const filas = bd.prepare<Parametro[], FilaResumen>(sql).all(...parametros);

  const agrupadas = etiquetasPorCancion(
    bd,
    filas.map((fila) => fila.id),
  );

  return filas
    .map((fila) => ({ ...fila, etiquetas: agrupadas.get(fila.id) ?? [] }))
    .sort((a, b) => compararTitulos(a.titulo, b.titulo));
}
