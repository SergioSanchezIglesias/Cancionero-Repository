CREATE TABLE cancion (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo               TEXT NOT NULL,
  contenido            TEXT NOT NULL,
  tono_original        TEXT NOT NULL,
  notacion_por_defecto TEXT NOT NULL DEFAULT 'latina'
                       CHECK (notacion_por_defecto IN ('latina','americana')),
  cantoral_origen      TEXT,
  creado_en            TEXT NOT NULL DEFAULT (datetime('now')),
  editado_en           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE etiqueta (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  grupo  TEXT NOT NULL CHECK (grupo IN ('misa','adoracion_alabanza')),
  orden  INTEGER NOT NULL UNIQUE
);

CREATE TABLE cancion_etiqueta (
  cancion_id  INTEGER NOT NULL REFERENCES cancion(id)  ON DELETE CASCADE,
  etiqueta_id INTEGER NOT NULL REFERENCES etiqueta(id) ON DELETE RESTRICT,
  PRIMARY KEY (cancion_id, etiqueta_id)
);

CREATE INDEX idx_ce_etiqueta ON cancion_etiqueta(etiqueta_id);
CREATE INDEX idx_cancion_titulo ON cancion(titulo);
