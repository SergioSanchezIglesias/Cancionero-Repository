#!/usr/bin/env python3
"""
Genera las fuentes que pdfmake incrusta en el PDF del cancionero.

Se ejecuta A MANO y muy de vez en cuando: solo si se cambia la tipografía o se
actualiza `@fontsource-variable`. El resultado (`public/fuentes-pdf/*.ttf`) se
versiona en el repositorio, porque un PDF con las fuentes por defecto pierde
todo el diseño.

    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python packages/web/herramientas/generar-fuentes-pdf.py

Por qué hay que convertir: `@fontsource` sirve `.woff2` variables, y pdfmake
solo sabe incrustar `.ttf` estáticos. Así que se descomprime el woff2, se fija
cada eje en un valor concreto y se recorta el juego de caracteres al que hace
falta para un cantoral en español.
"""

from pathlib import Path

from fontTools.subset import Options, Subsetter, parse_unicodes
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RAIZ = Path(__file__).resolve().parents[3]
ORIGEN = RAIZ / "node_modules" / "@fontsource-variable"
DESTINO = RAIZ / "packages" / "web" / "public" / "fuentes-pdf"

# Latín básico y suplemento (incluye á é í ó ú ñ ü ¿ ¡ « »), comillas
# tipográficas, rayas, puntos suspensivos y los signos de bemol y sostenido.
CARACTERES = (
    "U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,"
    "U+2018-201D,U+2026,U+266D,U+266F"
)

# Cada salida fija los ejes de la fuente variable en un valor concreto.
INSTANCIAS = [
    {
        "fichero": "inter/files/inter-latin-wght-normal.woff2",
        "salida": "Inter-Regular.ttf",
        "familia": "Inter",
        "estilo": "Regular",
        "ejes": {"wght": 400},
    },
    {
        "fichero": "inter/files/inter-latin-wght-normal.woff2",
        "salida": "Inter-Bold.ttf",
        "familia": "Inter",
        "estilo": "Bold",
        "ejes": {"wght": 700},
    },
    {
        # `opsz` es el tamaño óptico: 24 es un término medio entre el título de
        # la portada (30 pt) y el de cada canción (19 pt).
        "fichero": "fraunces/files/fraunces-latin-full-normal.woff2",
        "salida": "Fraunces-SemiBold.ttf",
        "familia": "Fraunces",
        "estilo": "SemiBold",
        "ejes": {"wght": 600, "opsz": 24, "SOFT": 0, "WONK": 0},
    },
]


def renombrar(fuente: TTFont, familia: str, estilo: str) -> None:
    """
    Al fijar los ejes, el nombre interno sigue siendo el de la fuente variable
    («Fraunces 9pt Black» para lo que en realidad es un SemiBold). Se corrige
    para que los metadatos del PDF no mientan.
    """
    completo = f"{familia} {estilo}"
    postscript = f"{familia}-{estilo}"

    for identificador, valor in (
        (1, familia),
        (2, estilo),
        (3, f"{postscript}: generado para el PDF del cancionero"),
        (4, completo),
        (6, postscript),
        (16, familia),
        (17, estilo),
    ):
        fuente["name"].setName(valor, identificador, 3, 1, 0x409)


def generar(instancia: dict) -> None:
    origen = ORIGEN / instancia["fichero"]

    if not origen.exists():
        raise SystemExit(f"No está la fuente de origen: {origen}")

    fuente = TTFont(origen)

    ejes = {
        eje.axisTag: valor
        for eje in fuente["fvar"].axes
        if (valor := instancia["ejes"].get(eje.axisTag)) is not None
    }
    sin_declarar = {
        eje.axisTag for eje in fuente["fvar"].axes
    } - set(instancia["ejes"])

    if sin_declarar:
        raise SystemExit(
            f"{instancia['salida']}: ejes sin fijar {sorted(sin_declarar)}. "
            "Decláralos para que el PDF no dependa de un valor por defecto."
        )

    estatica = instancer.instantiateVariableFont(fuente, ejes, inplace=False)

    opciones = Options()
    opciones.layout_features = ["kern", "liga"]
    opciones.notdef_outline = True
    opciones.recalc_bounds = True

    recortador = Subsetter(options=opciones)
    recortador.populate(unicodes=parse_unicodes(CARACTERES))
    recortador.subset(estatica)

    renombrar(estatica, instancia["familia"], instancia["estilo"])

    DESTINO.mkdir(parents=True, exist_ok=True)
    destino = DESTINO / instancia["salida"]
    estatica.flavor = None
    estatica.save(destino)

    print(f"{instancia['salida']:26} {destino.stat().st_size / 1024:6.1f} kB")


if __name__ == "__main__":
    for instancia in INSTANCIAS:
        generar(instancia)
