# -*- coding: utf-8 -*-
"""limpiar_duplicados_lectura.py, Quita la lectura repetida y las referencias numericas obsoletas.

Defecto reportado (28-jul): en Ingles 11 P2 el estudiante lee la lectura en la pagina previa y
al pasar a la pregunta 1 se la encuentra otra vez completa dentro del enunciado. Al revisarlo
aparecieron cuatro defectos de la misma familia, todos nacidos del barajado de bloques del
des-EPA, que reordeno las partes pero no actualizo lo que el texto decia de si mismo:

  F1  6 enunciados llevan embebida la lectura que YA es su contexto (in_9 q1, in_10 q11/q17,
      in_11 q1/q14/q20). Se deja solo la pregunta; la instruccion de la parte sube al contexto.
  F2  la instruccion decia "answer questions 15 to 19" cuando eran la 1 a la 5.
  F3  en los textos de completar los espacios seguian numerados como en su posicion anterior:
      la pregunta 1 de Ingles 9 pedia "blank (16)". Se renumeran contra el numero real.
  F4  39 enunciados de lc_6 y lc_7 empezaban con un numero de item sobrante ("9." en la
      pregunta 4). Se quita: la plataforma ya rotula "Pregunta N de 20".

Las lecturas, figuras, opciones, claves y el marco DCE no se tocan.

Uso:  python scripts/limpiar_duplicados_lectura.py [--informe]
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(HERE, "..", "datos")

APLICAR = "--informe" not in sys.argv
cambios = []


def ruta(tag):
    return os.path.join(DATOS, "cuadernillo_%s_2023_PROPIO.json" % tag)


def leer(tag):
    return json.load(io.open(ruta(tag), encoding="utf-8"))


def guardar(tag, d):
    if APLICAR:
        json.dump(d, io.open(ruta(tag), "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def preg(d, n):
    return [q for q in d["preguntas"] if q["numero"] == n][0]


def plano(h):
    return re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", str(h or ""))).strip()


# --- F1 + F2 -----------------------------------------------------------------------------
# El enunciado tiene la forma:  <p>instruccion</p><div class="texto-lectura" ...>lectura</div>stem
_LECTURA = re.compile(
    r'^\s*(?:<p[^>]*>(?P<instr>.*?)</p>\s*)?<div class="texto-lectura".*?</div>\s*',
    re.S)
# "answer questions 15 to 19" / "y responde las preguntas 11 a 15": el encabezado de la pagina de
# lectura ya muestra el rango real, asi que la coletilla sobra y solo puede volver a desfasarse.
# Solo el sintagma con los numeros: el verbo se conserva y se arregla despues, para no
# decapitar frases como "Responde las preguntas 11 a 15 de acuerdo con la siguiente informacion".
_RANGO = re.compile(
    r"\s*(?:the\s+|las\s+|los\s+)?(?:questions?|preguntas?)\s+\d+\s*(?:to|a|y)\s*\d+", re.I)
# Verbo que se queda huerfano al final de la frase cuando el sintagma era su complemento.
_VERBO_FINAL = re.compile(
    r"(?P<conj>\s*,?\s*(?:and|y|luego|y\s+despu[eé]s)\s+)?"
    r"(?:read\s+it\s+and\s+)?(?P<v>answer|responde[rn]?|contesta)\s*$", re.I)
_SOLO_VERBO = re.compile(r"^\s*(?:answer|responde[rn]?|contesta)\s*$", re.I)
# Preposicion que se queda sola cuando el sintagma que regia era el rango: "En las preguntas 6 a
# 8, marca A, B o C" -> "En, marca A, B o C".
_PREP_HUERFANA = re.compile(r"(?:^|(?<=\s))(?:En|In|Entre|Para|For)\s*,\s*", re.I)


def quitar_rango(txt):
    """Quita el rango de preguntas y deja la instruccion gramaticalmente entera.

    El encabezado de la pagina de lectura ya muestra el rango real, asi que repetirlo dentro del
    texto solo agrega ruido y vuelve a desfasarse cada vez que se reordenan las partes.
    """
    frases = re.split(r"(?<=[.!?])\s+", txt)
    salida = []
    for fr in frases:
        if not _RANGO.search(fr):
            salida.append(fr)
            continue
        f = _PREP_HUERFANA.sub("", _RANGO.sub("", fr))
        fin = "." if f.rstrip().endswith((".", "!", "?")) else ""
        cuerpo = f.rstrip().rstrip(".!?").strip()
        if _SOLO_VERBO.match(cuerpo):
            continue                      # "RESPONDE LAS ..." era la frase entera: sobra
        m = _VERBO_FINAL.search(cuerpo)
        previo = cuerpo[:m.start()].strip(" ,;") if m else ""
        if m and m.group("conj") and previo:
            # "Read the text and answer" -> "Read the text": lo anterior ya es una oracion.
            cuerpo = previo
        elif m and (previo or m.group("conj")):
            # "Con esa pieza responde" no se sostiene solo: el verbo necesita su complemento.
            ingles = m.group("v").lower() == "answer"
            cuerpo += " the questions that follow" if ingles else " lo que sigue"
        elif m:
            continue
        cuerpo = cuerpo[:1].upper() + cuerpo[1:] if cuerpo else cuerpo
        f = cuerpo + (fin or ".")
        f = re.sub(r"\s+([.,;:])", r"\1", re.sub(r"\s{2,}", " ", f)).strip()
        if f not in (".", ""):
            salida.append(f)
    t = " ".join(x for x in salida if x.strip())
    t = re.sub(r"^\s*[.,;:]\s*", "", re.sub(r"\s{2,}", " ", t)).strip()
    return t


DUPLICADOS = [
    ("in_9_p2", 1, "ctx-parte4"),
    ("in_10_p2", 11, "ctx-parte3"),
    ("in_10_p2", 17, "ctx-parte4"),
    ("in_11_p2", 1, "ctx-parte4"),
    ("in_11_p2", 14, "ctx-parte5"),
    ("in_11_p2", 20, "ctx-parte3"),
]

for tag in sorted(set(t for t, _, _ in DUPLICADOS)):
    d = leer(tag)
    for t2, n, cid in [x for x in DUPLICADOS if x[0] == tag]:
        q = preg(d, n)
        m = _LECTURA.match(q["enunciado"])
        if not m:
            cambios.append("[!] %s q%d: no se reconocio el bloque de lectura" % (tag, n))
            continue
        instr = quitar_rango(plano(m.group("instr") or ""))
        q["enunciado"] = q["enunciado"][m.end():].strip()
        cambios.append("F1 %s q%d: lectura repetida retirada; queda «%s»"
                       % (tag, n, plano(q["enunciado"])[:70]))
        # La instruccion de la parte pertenece a la pagina de lectura, no al primer item.
        c = d["contextos"][cid]
        if instr and instr.lower() not in plano(c["texto"]).lower():
            c["texto"] = instr + "\n\n" + c["texto"]
            cambios.append("F2 %s [%s]: instruccion al contexto sin rango: «%s»" % (tag, cid, instr))
        # La figura que acompanaba a la lectura pasa al contexto, que es donde se lee.
        if q.get("imagen_figura"):
            if not c.get("imagen"):
                c["imagen"] = q["imagen_figura"]
                cambios.append("F1 %s [%s]: figura %s movida al contexto" % (tag, cid, q["imagen_figura"]))
            q.pop("imagen_figura", None)
            q.pop("imagen_alt", None)
        q["enunciado"] = q["enunciado"].replace("[[IMG]]", "")
    guardar(tag, d)

# --- F2 en textos de contexto ------------------------------------------------------------
for tag in ("in_9_p2", "in_10_p2", "in_11_p2", "lc_6_p2", "lc_7_p2", "lc_10_p2", "lc_11_p2"):
    d = leer(tag)
    tocado = False
    for cid, c in d["contextos"].items():
        antes = c["texto"]
        # Se limpia parrafo por parrafo para no alterar el resto de la lectura.
        parts = antes.split("\n")
        for i, p in enumerate(parts):
            if re.search(r"(?:questions?|preguntas?)\s+\d+\s*(?:to|a|y)\s*\d+", p, re.I):
                parts[i] = quitar_rango(p)
        nuevo = "\n".join(parts)
        if nuevo != antes:
            c["texto"] = nuevo
            tocado = True
            cambios.append("F2 %s [%s] rango=%s: «%s» -> «%s»"
                           % (tag, cid, c["rango_preguntas"], plano(antes)[:60], plano(nuevo)[:60]))
    if tocado:
        guardar(tag, d)

# --- F3 espacios numerados de los textos de completar -------------------------------------
# El texto y los enunciados eran coherentes entre si, pero desfasados del numero de pregunta:
# la pregunta 1 pedia el espacio (16). Se renumeran los espacios al numero real de la pregunta.
CLOZE = [("in_9_p2", "ctx-parte4", 16, 1, 7), ("in_11_p2", "ctx-parte5", 20, 14, 6)]
for tag, cid, viejo0, nuevo0, cuantos in CLOZE:
    d = leer(tag)
    mapa = dict((viejo0 + i, nuevo0 + i) for i in range(cuantos))

    def remap(txt, _m=mapa):
        return re.sub(r"\((\d{1,2})\)",
                      lambda x: "(%d)" % _m[int(x.group(1))] if int(x.group(1)) in _m else x.group(0),
                      txt)

    c = d["contextos"][cid]
    c["texto"] = remap(c["texto"])
    n = 0
    for q in d["preguntas"]:
        if q.get("contexto_id") != cid:
            continue
        for k, v in list(q.items()):
            if isinstance(v, str):
                q[k] = remap(v)
            elif isinstance(v, list):
                q[k] = [remap(x) if isinstance(x, str) else x for x in v]
            elif isinstance(v, dict):
                q[k] = dict((kk, remap(vv) if isinstance(vv, str) else vv) for kk, vv in v.items())
        n += 1
    guardar(tag, d)
    cambios.append("F3 %s [%s]: espacios (%d..%d) renumerados a (%d..%d) en el texto y en %d enunciados"
                   % (tag, cid, viejo0, viejo0 + cuantos - 1, nuevo0, nuevo0 + cuantos - 1, n))

# --- F4 numero de item sobrante al inicio del enunciado -----------------------------------
_NUM = re.compile(r"^(\s*<p[^>]*>)?\s*(?:<b>\s*)?\d{1,2}\s*[.)]\s*(?:</b>)?\s*")
for tag in ("lc_6_p2", "lc_7_p2"):
    d = leer(tag)
    n = 0
    for q in d["preguntas"]:
        e = q["enunciado"]
        m = _NUM.match(e)
        if m:
            q["enunciado"] = (m.group(1) or "") + e[m.end():]
            n += 1
    guardar(tag, d)
    cambios.append("F4 %s: %d enunciados sin el numero de item sobrante" % (tag, n))

print("\n".join(cambios))
print("\n%s: %d operaciones" % ("APLICADO" if APLICAR else "SOLO INFORME", len(cambios)))
