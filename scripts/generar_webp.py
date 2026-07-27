# -*- coding: utf-8 -*-
"""generar_webp.py — Copias LIVIANAS (WebP) de las figuras del banco, sin tocar los originales.

Por qué: al presentar una prueba el estudiante descarga en promedio 1,3 MB de figuras, y en el
peor caso (Ciencias 5° P1) 8,4 MB en 30 imágenes. Muchas son ilustraciones fotográficas guardadas
en PNG, que es un formato para dibujos de líneas: recomprimir PNG sin pérdida solo gana ~4%,
mientras que WebP a calidad 92 baja ~85% con diferencia visual imperceptible.

Regla del proyecto: las figuras NO se rehacen ni se reemplazan. Por eso este script solo AÑADE un
archivo `.webp` al lado de cada `.png`. Los PNG originales quedan intactos, siguen versionados y
siguen siendo los que usan los PDF (jsPDF no acepta WebP). La plataforma pide la copia liviana y
cae al PNG original si no existe (ver utils.js -> rutaImagenLiviana).

Es idempotente: si el .webp ya existe y es más nuevo que el .png, lo salta.

Uso:
    python scripts/generar_webp.py              # genera lo que falte
    python scripts/generar_webp.py --forzar     # regenera todo
    python scripts/generar_webp.py --informe    # solo mide, no escribe
"""
import glob
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(HERE, "..")
PATRONES = ["assets/banco-*-p1/*.png", "assets/banco-*-p2/*.png"]
CALIDAD = 92


def objetivos():
    fs = []
    for pat in PATRONES:
        fs.extend(glob.glob(os.path.join(RAIZ, pat)))
    return sorted(fs)


def main():
    forzar = "--forzar" in sys.argv
    solo_informe = "--informe" in sys.argv
    fs = objetivos()
    print(f"figuras PNG encontradas: {len(fs)}")
    n_hechas = n_salt = n_err = n_descartadas = 0
    peso_png = peso_webp = 0
    for i, p in enumerate(fs, 1):
        w = p[:-4] + ".webp"
        a = os.path.getsize(p)
        peso_png += a
        if os.path.exists(w) and not forzar and os.path.getmtime(w) >= os.path.getmtime(p):
            peso_webp += os.path.getsize(w)
            n_salt += 1
            continue
        if solo_informe:
            n_salt += 1
            continue
        try:
            im = Image.open(p)
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA" if "A" in im.mode or im.mode == "P" else "RGB")
            im.save(w, "WEBP", quality=CALIDAD, method=4)
            # En dibujos de líneas (pocos colores, bordes duros) el PNG ya es óptimo y el WebP
            # puede pesar MÁS. En ese caso se descarta la copia: la página cae al PNG original
            # por sí sola (ver onerrorLiviano en js/extractor-imagenes.js). Margen del 10%: por
            # menos que eso no vale la pena mantener un archivo extra.
            if os.path.getsize(w) >= a * 0.9:
                os.remove(w)
                peso_webp += a
                n_descartadas += 1
                continue
            peso_webp += os.path.getsize(w)
            n_hechas += 1
        except Exception as e:
            n_err += 1
            print(f"  [!] {os.path.relpath(p, RAIZ)}: {e}")
        if i % 100 == 0:
            print(f"  ... {i}/{len(fs)}")
    print(f"\ngeneradas {n_hechas} · saltadas {n_salt} · errores {n_err}")
    if peso_png:
        print(f"PNG originales: {peso_png / 1048576:.0f} MB   ->   copias WebP: {peso_webp / 1048576:.0f} MB "
              f"({100 - 100 * peso_webp / peso_png:.0f}% menos)")


if __name__ == "__main__":
    main()
