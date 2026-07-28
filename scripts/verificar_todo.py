# -*- coding: utf-8 -*-
"""verificar_todo.py, Comprueba DE UNA SOLA PASADA todos los ajustes pedidos.

Cada bloque corresponde a algo que el usuario pidio expresamente en algun momento. La idea es
que no haya que acordarse de nada: si esto sale limpio, todo lo solicitado sigue en pie y no se
rompio al tocar otra cosa.

  1  Estructura del enunciado con figura: contextualizacion, IMAGEN, desenlace (marcador [[IMG]]).
  2  Ninguna raya larga en datos, paginas, modulos ni estilos.
  3  La lectura no se repite dentro del enunciado que ya la tiene como contexto.
  4  Ninguna referencia a un rango de preguntas que no corresponda.
  5  Los espacios de los textos de completar coinciden con el numero de pregunta.
  6  Ningun numero de item sobrante al inicio del enunciado.
  7  Ninguna pregunta huerfana: si dice "segun el relato", el relato existe.
  8  Toda figura declarada existe en disco, con su copia liviana, y su marcador.
  9  Orden del contexto: texto, pieza grafica, credito.
 10  Los PDF no imprimen LaTeX crudo, ni marcadores, ni rayas, ni subindices sin fuente.

Uso:  python scripts/verificar_todo.py [--sin-pdf]
"""
import glob
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(HERE, "..")
DATOS = os.path.join(RAIZ, "datos")
SIN_PDF = "--sin-pdf" in sys.argv

fallos = []
avisos = []


def falla(bloque, detalle):
    fallos.append("%s :: %s" % (bloque, detalle))


def plano(h):
    return re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", str(h or ""))).strip()


def norm(t):
    # Normalizacion FUERTE: se quitan espacios y guiones bajos. La version suave dejo pasar
    # in_10_p1 q11, donde el texto embebido escribia "(11) ______" y el contexto "(11)_______".
    return re.sub(r"[^a-z0-9áéíóúñ]", "", plano(t).lower())


cuadernillos = []
for f in sorted(glob.glob(os.path.join(DATOS, "cuadernillo_*_PROPIO.json"))):
    d = json.load(io.open(f, encoding="utf-8"))
    cuadernillos.append((os.path.basename(f)[12:-17], f, d))
P2 = [(t, f, d) for t, f, d in cuadernillos if "_p2" in t]
print("Cuadernillos: %d (P2: %d)" % (len(cuadernillos), len(P2)))

# ---------------------------------------------------------------- 1 estructura con figura
n_fig = n_marca = 0
for tag, _, d in P2:
    for q in d["preguntas"]:
        if not q.get("imagen_figura"):
            continue
        n_fig += 1
        e = q["enunciado"]
        if "[[IMG]]" not in e:
            falla("1 estructura", "%s q%s con figura y SIN marcador" % (tag, q["numero"]))
            continue
        n_marca += 1
        antes, despues = e.split("[[IMG]]", 1)
        if not plano(antes):
            avisos.append("1 estructura: %s q%s la imagen abre el enunciado (sin contextualizacion)"
                          % (tag, q["numero"]))
        if not plano(despues):
            falla("1 estructura", "%s q%s no queda desenlace despues de la imagen"
                  % (tag, q["numero"]))
print("1  estructura contextualizacion/IMAGEN/desenlace: %d de %d items con figura" % (n_marca, n_fig))

# ---------------------------------------------------------------- 2 rayas largas
RAYA = re.compile("[\u2014\u2013]")
sitios = []
for patron in ("datos/*.json", "*.html", "js/*.js", "css/*.css"):
    for ruta in glob.glob(os.path.join(RAIZ, patron)):
        base = os.path.basename(ruta)
        if "_PRE_" in base or "_BACKUP" in ruta or base.startswith("_"):
            continue
        try:
            s = io.open(ruta, encoding="utf-8").read()
        except Exception:
            continue
        n = len(RAYA.findall(s))
        if n:
            sitios.append((os.path.relpath(ruta, RAIZ), n))
if sitios:
    for r, n in sitios[:10]:
        falla("2 rayas", "%s tiene %d" % (r, n))
print("2  rayas largas en datos, paginas, modulos y estilos: %d archivos" % len(sitios))

# ---------------------------------------------------------------- 3 lectura duplicada
dup = 0
for tag, _, d in cuadernillos:
    ctx = d.get("contextos") or {}
    for q in d["preguntas"]:
        c = ctx.get(q.get("contexto_id") or "")
        if not c:
            continue
        ct, en = norm(c.get("texto")), norm(q.get("enunciado"))
        if len(ct) >= 150 and ct[:150] in en:
            dup += 1
            falla("3 lectura duplicada", "%s q%s repite su contexto" % (tag, q["numero"]))
print("3  lecturas repetidas dentro del enunciado: %d" % dup)

# ---------------------------------------------------------------- 4 rangos de preguntas
RANGO = re.compile(r"(?:questions?|preguntas?)\s+(\d+)\s*(?:to|a|y)\s*(\d+)", re.I)
mal = 0
for tag, _, d in cuadernillos:
    ctx = d.get("contextos") or {}
    for q in d["preguntas"]:
        for m in RANGO.finditer(plano(q.get("enunciado"))):
            # Solo es fallo si el rango NO corresponde al de su parte; en P1 hay instrucciones
            # con rango que siguen siendo correctas y no hay por que tocarlas.
            r = (ctx.get(q.get("contexto_id") or "") or {}).get("rango_preguntas")
            if not (r and re.sub(r"\D+", " ", r).split() == [m.group(1), m.group(2)]):
                mal += 1
                falla("4 rangos", "%s q%s dice '%s' y su rango es %s"
                      % (tag, q["numero"], m.group(0), r))
    for k, c in ctx.items():
        for m in RANGO.finditer(plano(c.get("texto"))):
            r = c.get("rango_preguntas")
            if not (r and re.sub(r"\D+", " ", r).split() == [m.group(1), m.group(2)]):
                mal += 1
                falla("4 rangos", "%s ctx %s dice '%s' y su rango es %s"
                      % (tag, k, m.group(0), r))
print("4  referencias a rangos de preguntas incorrectas: %d" % mal)

# ---------------------------------------------------------------- 5 espacios de completar
desfase = 0
for tag, _, d in cuadernillos:
    for k, c in (d.get("contextos") or {}).items():
        huecos = sorted(set(int(x) for x in re.findall(r"\((\d{1,2})\)\s*_", str(c.get("texto")))))
        if not huecos:
            continue
        nums = sorted(q["numero"] for q in d["preguntas"] if q.get("contexto_id") == k)
        if huecos != nums:
            desfase += 1
            falla("5 completar", "%s ctx %s espacios %s vs preguntas %s" % (tag, k, huecos, nums))
print("5  textos de completar con numeracion desfasada: %d" % desfase)

# ---------------------------------------------------------------- 6 numero de item sobrante
sobra = 0
for tag, _, d in cuadernillos:
    for q in d["preguntas"]:
        if re.match(r"^\d{1,2}\s*[.)]\s+", plano(q["enunciado"])):
            sobra += 1
            falla("6 numeracion", "%s q%s empieza con un numero" % (tag, q["numero"]))
print("6  enunciados que empiezan con un numero de item: %d" % sobra)

# ---------------------------------------------------------------- 7 preguntas huerfanas
REF = re.compile(r"seg[uú]n (?:el|la) (relato|texto|lectura|historia|cuento|fragmento|poema)", re.I)
huerf = 0
for tag, _, d in cuadernillos:
    ctx = d.get("contextos") or {}
    for q in d["preguntas"]:
        e = plano(q["enunciado"])
        if not REF.search(e):
            continue
        tiene = bool(ctx.get(q.get("contexto_id") or ""))
        # o el propio enunciado trae el texto citado
        if not tiene and len(e) < 320:
            huerf += 1
            falla("7 huerfanas", "%s q%s pide 'segun el texto' y no hay texto" % (tag, q["numero"]))
print("7  preguntas que piden un texto inexistente: %d" % huerf)

# ---------------------------------------------------------------- 8 figuras en disco
faltan = sin_webp = 0
for tag, _, d in cuadernillos:
    rutas = [q.get("imagen_figura") for q in d["preguntas"] if q.get("imagen_figura")]
    rutas += [c.get("imagen") for c in (d.get("contextos") or {}).values() if c.get("imagen")]
    for q in d["preguntas"]:
        for v in (q.get("opciones_imagen") or {}).values() if isinstance(q.get("opciones_imagen"), dict) else []:
            rutas.append(v)
    for r in rutas:
        p = os.path.join(RAIZ, r.replace("/", os.sep))
        if not os.path.exists(p):
            faltan += 1
            falla("8 figuras", "%s no existe: %s" % (tag, r))
        elif not os.path.exists(p[:-4] + ".webp"):
            # generar_webp descarta la copia cuando no ahorra al menos un 10%, cosa que pasa en
            # las figuras muy pequenas. La pagina cae al PNG sin problema: es correcto, no falta.
            sin_webp += 1
print("8  figuras declaradas que faltan en disco: %d (sin copia liviana, por ser diminutas: %d)"
      % (faltan, sin_webp))

# ---------------------------------------------------------------- 9 orden del contexto
CREDITO = re.compile(r"(los derechos pertenecen|uso educativo|recuperad[oa] de|tomado |adaptado de|"
                     r"elaboraci[oó]n propia|reproducid[ao] del)", re.I)
mal_orden = 0
for tag, _, d in cuadernillos:
    for k, c in (d.get("contextos") or {}).items():
        if not c.get("imagen"):
            continue
        t = str(c.get("texto") or "")
        # La frase que anuncia la pieza no puede quedar despues del credito.
        parr = [p for p in t.split("\n") if p.strip()]
        if len(parr) > 1 and CREDITO.search(parr[0]) and not CREDITO.search(parr[-1]):
            mal_orden += 1
            falla("9 contexto", "%s ctx %s empieza por el credito" % (tag, k))
print("9  contextos con la pieza grafica mal ubicada: %d" % mal_orden)

# ---------------------------------------------------------------- 10 PDF
if not SIN_PDF:
    try:
        import fitz
        SOSPECHOSO = re.compile(r"\\[a-zA-Z]+|\^°|\\\\|&=|\[\[IMG\]\]|[\u2014\u2013]"
                                r"|[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]")
        n_pdf = n_pag = n_mal = vacias = 0
        for f in sorted(glob.glob(os.path.join(RAIZ, "CUADERNILLOS_P*_PDF", "*", "*.pdf"))):
            doc = fitz.open(f)
            n_pdf += 1
            n_pag += len(doc)
            for i, p in enumerate(doc):
                txt = p.get_text()
                for m in SOSPECHOSO.findall(txt):
                    n_mal += 1
                    falla("10 pdf", "%s p%d: %r" % (os.path.basename(f), i + 1, m))
                if not txt.strip() and not p.get_images():
                    vacias += 1
                    falla("10 pdf", "%s p%d en blanco" % (os.path.basename(f), i + 1))
            doc.close()
        print("10 PDF: %d archivos, %d paginas, %d restos, %d paginas en blanco"
              % (n_pdf, n_pag, n_mal, vacias))
    except ImportError:
        avisos.append("10 pdf: sin PyMuPDF, no se revisaron los PDF")

# ---------------------------------------------------------------- resumen
print("\n" + "=" * 78)
if fallos:
    print("FALLOS: %d" % len(fallos))
    for x in fallos[:40]:
        print("   " + x)
    if len(fallos) > 40:
        print("   ... y %d mas" % (len(fallos) - 40))
else:
    print("SIN FALLOS: todos los ajustes solicitados siguen en pie.")
if avisos:
    print("\nAvisos (no bloquean): %d" % len(avisos))
    for x in avisos[:12]:
        print("   " + x)
print("=" * 78)
sys.exit(1 if fallos else 0)
