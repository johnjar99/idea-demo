# -*- coding: utf-8 -*-
"""verificar_latex_pdf.py, Ningun cuadernillo debe imprimir LaTeX crudo en su PDF.

Se prueba contra los enunciados REALES de los 70 cuadernillos, no contra cadenas inventadas:
esa es la unica forma de descubrir ordenes que el banco usa de verdad y el conversor no conoce.
Asi aparecieron `\\sen` (macro en espanol que la web si resolvia y el PDF no), `\\dbinom`,
`\\cup`, `\\cap`, `\\rho`, `\\tau`, `\\overline` y el `90^\\circ` que salia impreso "90^°".

Correr despues de tocar latex_texto.py o de agregar items con formulas nuevas.

Uso:  python scripts/verificar_latex_pdf.py
"""
import glob
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from latex_texto import _latex_a_texto

HERE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(HERE, "..", "datos")

# Restos que no deberian sobrevivir a la conversion. Se incluyen los sub/superindices Unicode:
# las fuentes base del PDF no los tienen y salian como un cuadro negro ("masa m■").
SOSPECHOSO = re.compile(r"\\[a-zA-Z]+|\^°|\\\\|\{|\}|&=|(?<![a-zA-Z])&(?![a-zA-Z#])"
                        r"|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾]")

muestras = []
malos = 0
total = 0
for f in sorted(glob.glob(os.path.join(DATOS, "cuadernillo_*_PROPIO.json"))):
    d = json.load(io.open(f, encoding="utf-8"))
    tag = os.path.basename(f)[12:-17]
    piezas = []
    for c in (d.get("contextos") or {}).values():
        piezas.append(("ctx", "", str(c.get("texto") or "")))
    for q in d.get("preguntas", []):
        piezas.append(("enun", q["numero"], str(q.get("enunciado") or "")))
        for k, v in (q.get("opciones") or {}).items():
            piezas.append(("op" + k, q["numero"], str(v)))
        piezas.append(("just", q["numero"], str(q.get("justificacion_correcta") or "")))
    for kind, num, txt in piezas:
        # No basta con mirar los fragmentos que traen LaTeX: "un bloque de masa m₁" no lleva
        # ni una barra invertida y era justamente el que salia con el cuadro negro.
        if "\\" not in txt and not SOSPECHOSO.search(txt):
            continue
        total += 1
        salida = _latex_a_texto(txt)
        # Se ignora lo que viene del HTML, no del LaTeX.
        sin_html = re.sub(r"<[^>]*>", "", salida)
        sin_html = re.sub(r"&(lt|gt|amp|nbsp);", "", sin_html)
        m = SOSPECHOSO.search(sin_html)
        if m:
            malos += 1
            if len(muestras) < 12:
                i = m.start()
                muestras.append("%s %s %s: ...%s..." % (tag, kind, num, sin_html[max(0, i - 50):i + 60]))

print("fragmentos con LaTeX revisados: %d  |  con restos sin convertir: %d" % (total, malos))
for s in muestras:
    print("  " + s)
