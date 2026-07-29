# Cancionero

Aplicación web para gestionar canciones con letra y acordes, transponerlas y
generar cancioneros en PDF. Un solo editor, sin login, en red local.

```
packages/
├─ chords/   motor de acordes (TypeScript puro, sin dependencias)
├─ api/      Express + SQLite (better-sqlite3, SQL crudo)
└─ web/      Angular
```

## Puesta en marcha

```bash
npm install            # instala el monorepo entero
npm test               # tests de los tres paquetes
npm run build          # compila los tres paquetes
docker compose up -d   # levanta la app en http://localhost:3000
```

La base de datos vive en el volumen `./data` (variable `DB_PATH`), nunca dentro
de la imagen.

## Fuentes del PDF

El cancionero en PDF se genera en el navegador con **pdfmake**, que necesita las
tipografías **incrustadas**: si faltan, el PDF sale con la fuente por defecto y
pierde todo el diseño. Por eso `packages/web/public/fuentes-pdf/` contiene tres
`.ttf` versionados (93 kB en total) y sus licencias OFL.

Se generan **a mano y muy de vez en cuando** —solo si cambia la tipografía o se
actualiza `@fontsource-variable`— porque hay que convertir: `@fontsource` sirve
`.woff2` variables y pdfmake solo incrusta `.ttf` estáticos.

```bash
python3 -m venv .venv
.venv/bin/pip install fonttools brotli
.venv/bin/python packages/web/herramientas/generar-fuentes-pdf.py
```

El script fija los ejes de cada fuente variable (peso, y en Fraunces también el
tamaño óptico), recorta el juego de caracteres al que hace falta en español y
corrige los nombres internos. Si añade un eje nuevo sin declarar, **falla en
vez de elegir un valor por su cuenta**.

Para comprobar que un PDF salió con sus fuentes:

```bash
pdffonts cancionero.pdf   # las tres deben aparecer con «emb yes»
```

## Copias de seguridad

Las copias se hacen **a mano desde la propia aplicación**, en *Ajustes*. La barra
lateral avisa cuando hay canciones creadas o editadas después de la última copia.

Hay dos formatos, y conviene guardar los dos:

| Fichero | Qué es | Cuándo se usa |
|---|---|---|
| `cancionero-AAAA-MM-DD.db` | Copia exacta del fichero SQLite, hecha en caliente con `VACUUM INTO` | Restauración fiel: mismos ids, mismas fechas, índice de búsqueda incluido |
| `cancionero-AAAA-MM-DD.json` | Canciones y etiquetas en texto legible | Plan B si el `.db` se corrompe, o si algún día cambia el motor de base de datos |

Guarda los ficheros **fuera de la máquina que sirve la aplicación**. Una copia
que vive en la misma tarjeta SD que la base de datos no protege de nada.

### Restaurar desde el `.db`

Devuelve la biblioteca exactamente como estaba. Hay que parar la aplicación
porque se sustituye el fichero por debajo:

```bash
docker compose stop
cp ~/Descargas/cancionero-2026-07-29.db data/app.db
rm -f data/app.db-wal data/app.db-shm   # imprescindible: ver nota
docker compose start
```

> **Borra siempre el `-wal` y el `-shm`.** Son el diario de escritura de la base
> anterior. Si se quedan al lado del fichero restaurado, SQLite intenta aplicarles
> cambios que no le corresponden y la copia queda inservible.

### Restaurar desde el JSON

Desde *Ajustes → Restaurar desde un respaldo JSON*, sin parar nada. Reemplaza
todas las canciones, así que pide confirmación explícita.

Diferencia con el `.db`: las canciones se vuelven a insertar, de modo que
**cambian sus ids**. El contenido, los tonos y las etiquetas son idénticos.

### Ensayo de restauración

Probado el 29/07/2026 sobre el entorno Docker, con la biblioteca real de 8
canciones. Un backup que nunca se ha restaurado no es un backup:

1. Descarga de `.db` y `.json` desde la aplicación.
2. Borrado de `data/app.db` y arranque en limpio → biblioteca vacía.
3. Restauración desde el `.db` → títulos, etiquetas, contadores y búsqueda con
   diacríticos idénticos; canción comparada byte a byte con la original.
4. Borrado otra vez y restauración desde el JSON → mismo contenido, ids nuevos.

Conviene repetirlo cuando cambie el esquema de la base de datos o al migrar a la
Raspberry Pi.
