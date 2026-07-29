-- Almacén clave/valor para preferencias del editor.
-- Primer uso: la fecha de la última copia de seguridad descargada, que alimenta
-- el aviso «tienes cambios sin respaldar» de la interfaz.
CREATE TABLE ajuste (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
