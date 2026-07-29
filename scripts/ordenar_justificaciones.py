# -*- coding: utf-8 -*-
"""ordenar_justificaciones.py, Pone las justificaciones de las opciones incorrectas en orden.

Peticion del jefe (29-jul), sobre Matematicas 5 P2 pregunta 1: revisar el orden de los items de
respuesta y su justificacion. Al mirarlo, las opciones si estaban en orden (A, B, C, D en los
1418 items del banco, sin una sola excepcion), pero las justificaciones de las incorrectas
estaban guardadas en el orden en que se escribieron, no por letra. En esa pregunta iban A, D, C,
y hay 529 items asi en 37 cuadernillos. Se ven desordenadas en la revision del banco y en
cualquier exportacion que recorra el diccionario tal cual.

Solo se reordenan las claves; no se toca ni una palabra del texto, ni las opciones, ni la clave.

Casos que se respetan: los items de emparejamiento de Ingles tienen de A a G y solo explican
algunos distractores. Ahi tambien se ordena, pero no se exige que esten todos.

Uso:  python scripts/ordenar_justificaciones.py [--informe]
"""
import glob
import io
import json
import os
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(HERE, "..", "datos")
APLICAR = "--informe" not in sys.argv

tocados = Counter()
total = 0
for f in sorted(glob.glob(os.path.join(DATOS, "cuadernillo_*_PROPIO.json"))):
    d = json.load(io.open(f, encoding="utf-8"))
    tag = os.path.basename(f)[12:-17]
    cambios = 0
    for q in d.get("preguntas", []):
        inc = q.get("opciones_incorrectas")
        if not isinstance(inc, dict) or not inc:
            continue
        orden = sorted(inc.keys())
        if list(inc.keys()) != orden:
            q["opciones_incorrectas"] = {k: inc[k] for k in orden}
            cambios += 1
    if cambios:
        tocados[tag] = cambios
        total += cambios
        if APLICAR:
            json.dump(d, io.open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("%s: %d items reordenados en %d cuadernillos"
      % ("APLICADO" if APLICAR else "SOLO INFORME", total, len(tocados)))
for k, v in sorted(tocados.items()):
    print("   %-11s %2d" % (k, v))
