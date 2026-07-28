# -*- coding: utf-8 -*-
"""latex_texto.py, Conversor de LaTeX a texto legible para los PDF descargables.

Antes vivia duplicado, palabra por palabra, dentro de generar_pdf_p1.py y generar_pdf_p2.py.
Ahora es uno solo: cualquier arreglo llega a los 70 cuadernillos a la vez.

Por que se reescribio (28-jul): el usuario pidio "formulas mejor organizadas, texto matematico
mas organizado, mas facil de leer". Al revisarlo, el PDF imprimia LaTeX crudo en varios sitios:

  - `90^\\circ` salia como "90^°" (53 veces en los 70 cuadernillos), porque los simbolos se
    sustituian ANTES de tratar el exponente y `°` ya no era un caracter de palabra.
  - `\\dfrac{f}{f_{0}}` salia como "\\dfracff0": la expresion regular exigia que numerador y
    denominador NO tuvieran llaves, asi que cualquier fraccion con subindice se le escapaba.
  - `\\begin{aligned}` imprimia literalmente "\\beginaligned", con sus `&=` y sus `\\\\[2pt]`
    a la vista. El item de Matematicas 11 con los tres procedimientos era ilegible en papel.
  - `\\tan`, `\\log`, `\\quad` y `\\qquad` no estaban contemplados y salian tal cual.

Ahora el analisis respeta las llaves anidadas y trata las ecuaciones alineadas linea por linea.
"""
import re

_SQRT_RE = re.compile(r"\\sqrt\s*\{([^{}]*)\}")
# Ordenes que en texto plano solo aportan su contenido (tipografia, barras de segmento, vectores).
_TEXT_RE = re.compile(
    r"\\(?:text|textrm|textbf|textit|mathrm|mathbf|mathit|mathsf|boldsymbol|operatorname|"
    r"overline|underline|vec|hat|bar)\s*\{([^{}]*)\}")

# Ordenes NO alfabeticas: se sustituyen tal cual.
_SIMBOLOS_RAROS = {
    r"\,": " ", r"\;": " ", r"\:": " ", r"\ ": " ", r"\!": "", r"\%": "%", r"\$": "$",
}
# Ordenes alfabeticas. Se resuelven con UNA sola pasada de expresion regular sobre
# `\[a-zA-Z]+`, que es greedy: asi `\infty` nunca se parte en `\in` + "fty", que es el
# tipo de choque que produce una tabla de reemplazos literales.
_COMANDOS = {
    "times": "×", "cdot": "·", "div": "÷", "pm": "±",
    "leq": "≤", "geq": "≥", "le": "≤", "ge": "≥", "neq": "≠", "approx": "≈",
    "rightarrow": "→", "to": "→", "Rightarrow": "⇒", "leftarrow": "←",
    "circ": "°", "degree": "°", "angle": "∠",
    # Conjuntos: los usa Matematicas 10 P1 y salian crudos.
    "cup": "∪", "cap": "∩", "subset": "⊂", "subseteq": "⊆", "supset": "⊃",
    "in": "∈", "notin": "∉", "emptyset": "∅", "varnothing": "∅", "setminus": "\\",
    # Griegas: faltaban rho y tau, y salian crudas en Ciencias 10 (densidad y torque).
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ",
    "epsilon": "ε", "varepsilon": "ε", "eta": "η", "theta": "θ", "lambda": "λ",
    "mu": "μ", "nu": "ν", "rho": "ρ", "sigma": "σ", "Sigma": "Σ", "tau": "τ",
    "phi": "φ", "varphi": "φ", "omega": "ω", "Omega": "Ω", "pi": "π",
    "infty": "∞", "sum": "Σ", "prod": "Π",
    # Espaciados. \quad y \qquad faltaban y se imprimian crudos.
    "qquad": "    ", "quad": "  ",
    # Delimitadores de tamano: no aportan nada en texto plano.
    "left": "", "right": "", "bigl": "", "bigr": "", "Bigl": "", "Bigr": "",
    "big": "", "Big": "", "biggl": "", "biggr": "", "displaystyle": "", "limits": "",
    "dots": "…", "ldots": "…", "cdots": "…",
}
# Nombres de funcion: en LaTeX van con barra para que no se lean como producto de variables.
# Se incluyen las abreviaturas en espanol que la plataforma ya define como macros de KaTeX
# (js/utils.js, MACROS_KATEX_ES): en la web se veian bien y solo el PDF las imprimia crudas.
_FUNCIONES = ("arcsin", "arccos", "arctan", "arcsen", "arctg", "senh", "tgh",
              "sin", "cos", "tan", "sec", "csc", "cot", "sen", "tg", "cotg", "cosec",
              "log", "ln", "exp", "max", "min", "det", "gcd", "lim", "deg", "mcd", "mcm")
for _f in _FUNCIONES:
    _COMANDOS.setdefault(_f, _f)
_CMD_RE = re.compile(r"\\([a-zA-Z]+)")


def _argumento(s, i):
    """Devuelve (contenido, indice_siguiente) del argumento que empieza en i.

    Acepta tanto `{...}` con llaves anidadas como un unico caracter suelto (`\\frac12`).
    """
    while i < len(s) and s[i] == " ":
        i += 1
    if i >= len(s):
        return "", i
    if s[i] != "{":
        return s[i], i + 1
    prof = 0
    for j in range(i, len(s)):
        if s[j] == "{":
            prof += 1
        elif s[j] == "}":
            prof -= 1
            if prof == 0:
                return s[i + 1:j], j + 1
    return s[i + 1:], len(s)


_FRAC_INI = re.compile(r"\\[dt]?frac\s*")
# Un solo simbolo, con subindice opcional: `m`, `V`, `5`, `f_{0}`. Solo en ese caso se pueden
# quitar los parentesis sin ambiguedad. Con `9y^{3}` NO se quitan: `A/9y^3` se leeria mal.
_ATOMO = re.compile(r"^(?:\d[\d.,]*|[A-Za-z])(?:_\{?[A-Za-z0-9]+\}?)?$")


def _envolver(p):
    return p if _ATOMO.match(p) else "(%s)" % p


def _fracciones(body):
    """Convierte \\frac/\\dfrac/\\tfrac a num/den, respetando llaves anidadas."""
    out, i = [], 0
    while i < len(body):
        m = _FRAC_INI.match(body, i)
        if m:
            num, j = _argumento(body, m.end())
            den, k = _argumento(body, j)
            out.append("%s/%s" % (_envolver(_fracciones(num)), _envolver(_fracciones(den))))
            i = k
        else:
            out.append(body[i])
            i += 1
    return "".join(out)


_BINOM_INI = re.compile(r"\\[dt]?binom\s*")


def _binomios(body):
    """Convierte \\binom/\\dbinom a la notacion C(n, k), que es la que usa el aula."""
    out, i = [], 0
    while i < len(body):
        m = _BINOM_INI.match(body, i)
        if m:
            n, j = _argumento(body, m.end())
            k, l = _argumento(body, j)
            out.append("C(%s, %s)" % (_binomios(n), _binomios(k)))
            i = l
        else:
            out.append(body[i])
            i += 1
    return "".join(out)


def _una_linea(body):
    """Convierte una linea de matematicas (sin saltos) a texto legible."""
    # El grado va PRIMERO, antes incluso de \mathrm: en `^\circ\mathrm{C}` la orden \circ
    # termina donde empieza \mathrm, y si se resuelve \mathrm antes queda `^\circC`, donde
    # ya no hay frontera de palabra y el grado se escapa. Asi salia impreso "80 ^°C".
    body = re.sub(r"\^\s*\{\s*\\circ\s*\}|\^\s*\\circ(?![a-zA-Z])", "°", body)
    # Las ordenes se resuelven PRIMERO, antes de deshacer fracciones y \text{...}. Al reves,
    # `200\times\dfrac{p}{100}` se volvia `200\timesp/100`: al desaparecer el \dfrac, el
    # \times quedaba pegado a la p y ya no se reconocia como orden. Aqui no hay riesgo, porque
    # las ordenes que no estan en la tabla (\dfrac, \sqrt, \text, \binom) se dejan intactas.
    body = _CMD_RE.sub(lambda m: _COMANDOS.get(m.group(1), m.group(0)), body)
    for k, v in _SIMBOLOS_RAROS.items():
        body = body.replace(k, v)
    body = _fracciones(body)
    body = _binomios(body)
    body = _SQRT_RE.sub(r"√(\1)", body)
    body = _TEXT_RE.sub(r"\1", body)
    # Los < > literales se escapan ANTES de crear <super>/<sub>, para que reportlab no lea el
    # '<' de "Δ<0,4" como apertura de etiqueta.
    body = body.replace("<", "&lt;").replace(">", "&gt;")
    body = re.sub(r"\^\{([^{}]*)\}", r"<super>\1</super>", body)
    body = re.sub(r"\^(\w)", r"<super>\1</super>", body)
    body = re.sub(r"_\{([^{}]*)\}", r"<sub>\1</sub>", body)
    body = re.sub(r"_(\w)", r"<sub>\1</sub>", body)
    body = body.replace("{", "").replace("}", "")
    return re.sub(r"\s{2,}", " ", body).strip()


_ENTORNO = re.compile(r"\\(?:begin|end)\s*\{[a-zA-Z*]+\}")
_SALTO = re.compile(r"\\\\\s*(?:\[[^\]]*\])?")


def _conv(m):
    body = m.group(1)
    # Entornos alineados: se quitan las marcas del entorno, se parte por los saltos de linea
    # y se descarta el `&` de alineacion, que en papel no significa nada.
    tiene_entorno = bool(_ENTORNO.search(body))
    body = _ENTORNO.sub("", body)
    lineas = [l for l in _SALTO.split(body) if l.strip()]
    lineas = [_una_linea(l.replace("&", "")) for l in lineas]
    lineas = [l for l in lineas if l]
    if len(lineas) > 1 or tiene_entorno:
        return "<br/>".join(lineas)
    return lineas[0] if lineas else ""


# Sub y superindices escritos como caracteres Unicode sueltos, fuera de toda formula: el banco
# los usa en cosas como "m₁", "CO₂" o "cm³". Las fuentes base del PDF (Helvetica) no tienen los
# subindices, asi que el cuadernillo impreso mostraba un cuadro negro: "un bloque de masa m■".
# Se convierten al marcado propio de reportlab, que si los dibuja.
_SUB = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎"
_SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾"
_LLANO = "0123456789+-=()"
_TRAD_SUB = {ord(a): b for a, b in zip(_SUB, _LLANO)}
_TRAD_SUP = {ord(a): b for a, b in zip(_SUP, _LLANO)}
_RUN_SUB = re.compile("[" + _SUB + "]+")
_RUN_SUP = re.compile("[" + _SUP + "]+")


def _indices_unicode(s):
    """Pasa runs de sub/superindices Unicode a <sub>/<super> de reportlab."""
    s = _RUN_SUB.sub(lambda m: "<sub>%s</sub>" % m.group(0).translate(_TRAD_SUB), s)
    return _RUN_SUP.sub(lambda m: "<super>%s</super>" % m.group(0).translate(_TRAD_SUP), s)


def _latex_a_texto(s):
    """Convierte los fragmentos LaTeX de un enunciado a texto unicode legible."""
    s = re.sub(r"\\\((.*?)\\\)", _conv, s, flags=re.S)
    s = re.sub(r"\\\[(.*?)\\\]", _conv, s, flags=re.S)
    # OJO: en espanol el $ es signo de MONEDA, no delimitador de formula. Tratar todo lo que
    # hay entre dos $ como LaTeX rompia cualquier enunciado con dos importes: en Mat 3 P2 q11
    # "<b>$300.000</b> en billetes y <b>$21.000</b>" se convertia en formula, se escapaban sus
    # etiquetas y el estudiante veia "</b>" y "<b>" impresos en el PDF. El banco usa \(\)
    # como delimitador, asi que aqui solo se acepta $...$ cuando el contenido trae una orden
    # LaTeX (barra invertida): esa es la firma de una formula de verdad.
    s = re.sub(r"\$([^$]*\\[^$]*)\$", _conv, s, flags=re.S)
    return _indices_unicode(s)
