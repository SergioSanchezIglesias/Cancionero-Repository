CREATE VIRTUAL TABLE cancion_fts USING fts5(
  titulo,
  contenido,
  content='cancion',
  content_rowid='id',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER cancion_ai AFTER INSERT ON cancion BEGIN
  INSERT INTO cancion_fts(rowid, titulo, contenido)
  VALUES (new.id, new.titulo, new.contenido);
END;

CREATE TRIGGER cancion_ad AFTER DELETE ON cancion BEGIN
  INSERT INTO cancion_fts(cancion_fts, rowid, titulo, contenido)
  VALUES ('delete', old.id, old.titulo, old.contenido);
END;

CREATE TRIGGER cancion_au AFTER UPDATE ON cancion BEGIN
  INSERT INTO cancion_fts(cancion_fts, rowid, titulo, contenido)
  VALUES ('delete', old.id, old.titulo, old.contenido);
  INSERT INTO cancion_fts(rowid, titulo, contenido)
  VALUES (new.id, new.titulo, new.contenido);
END;

INSERT INTO cancion_fts(cancion_fts) VALUES('rebuild');
