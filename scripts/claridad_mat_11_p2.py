# -*- coding: utf-8 -*-
"""claridad_mat_11_p2.py, Presentacion mas legible de Matematicas 11 P2.

Pedido del usuario (28-jul): "necesito mas claridades y, si es posible, esquemas graficos,
formulas mejor organizadas, texto matematico mas organizado, mas facil de leer y de comprender".

Lo que se hace y lo que NO se hace:
  SI  se reorganiza la presentacion: la formula que gobierna el item deja de ir embutida en la
      prosa y pasa a un bloque propio; los datos sueltos se agrupan en un recuadro de datos;
      la pregunta queda siempre al final, sola.
  SI  se agregan dos esquemas NUEVOS (q06 y q18) generados por esquemas_mat_11_p2.py.
  NO  se cambia ni un dato, ni una cifra, ni una opcion, ni la clave, ni el marco DCE. La
      dificultad no es el asunto de este encargo: el usuario dijo expresamente que eso se
      discute despues. Por eso, por ejemplo, en la 6 NO se enuncia que los angulos de un
      triangulo suman 180 grados: eso es el razonamiento que el item evalua, no un estorbo
      de lectura. Lo que si estorbaba era tener que recordar de memoria el signo de la
      tangente en cada tramo, y para eso esta el esquema.

Uso:  python scripts/claridad_mat_11_p2.py [--informe]
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUTA = os.path.join(HERE, "..", "datos", "cuadernillo_mat_11_p2_2023_PROPIO.json")
APLICAR = "--informe" not in sys.argv

# Mismos estilos que ya usa el cuadernillo, para que nada desentone.
CAJA = ("border:1px solid #C7163C;border-radius:6px;background:#FBF7F0;padding:10px 16px;"
        "margin:10px auto;max-width:580px;font-family:Georgia,'Times New Roman',serif;"
        "font-size:15px;color:#1A1613;line-height:1.55")
DATOS = ("border:1px solid #E5DDD2;border-left:4px solid #C7163C;border-radius:6px;"
         "background:#FBF7F0;padding:8px 16px;margin:10px auto;max-width:560px;"
         "font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#1A1613;"
         "line-height:1.7")
ROTULO = "font-weight:700;color:#A8132F;margin-bottom:2px;font-size:13px;letter-spacing:.04em"
TH = ("border:1px solid #C7163C;background:#F1ECE3;font-weight:700;color:#A8132F;"
      "padding:7px 14px;text-align:center")
TD = "border:1px solid #C7163C;padding:7px 14px;text-align:center"


def caja(contenido):
    return '<div style="%s">%s</div>' % (CAJA, contenido)


def datos(contenido, rotulo="DATOS"):
    return '<div style="%s"><div style="%s">%s</div>%s</div>' % (DATOS, ROTULO, rotulo, contenido)


# Cada entrada: numero -> (enunciado nuevo, figura nueva o None)
NUEVOS = {}

# --- 6 · signos de la tangente -------------------------------------------------------------
# El item era correcto, pero exigia recordar en que tramo la tangente cambia de signo antes de
# poder siquiera empezar. El esquema levanta ese obstaculo sin resolver la pregunta: sigue
# haciendo falta ver que si L es obtuso, J + K queda por debajo de 90 grados.
NUEVOS[6] = (
    "<p>Un programa de diseño reporta, para los tres ángulos interiores del triángulo "
    "\\(JKL\\) que forma una pieza de vitral, los siguientes signos de la tangente:</p>"
    + caja("\\[\\tan(J) > 0, \\qquad \\tan(K) > 0, \\qquad \\tan(L) < 0\\]")
    + "<p>El siguiente esquema resume qué signo toma la tangente según la medida del ángulo.</p>"
    + "[[IMG]]"
    + "<p>¿Qué conclusión se desprende de ese reporte?</p>",
    "assets/banco-mat-11-p2/q06.png")

# --- 9 · densidad lineal -------------------------------------------------------------------
NUEVOS[9] = (
    "<p>La <b>densidad lineal</b> de un cable es el cociente entre su masa y su longitud. "
    "<b>Rosa</b> quiere estimar la masa de un tramo de cable de cobre y dispone de estos datos:</p>"
    + datos("Longitud del tramo: \\(40\\ \\text{cm}\\)<br>"
            "Densidad lineal del cable: \\(2.400\\ \\text{g/m}\\)")
    + "<p>Rosa multiplica la longitud por la densidad lineal y anota como resultado "
      "\\(96.000\\ \\text{g}\\). ¿Es correcto el cálculo de Rosa?</p>",
    None)

# --- 12 · cociente de polinomios -----------------------------------------------------------
# Antes las dos expresiones iban dentro de la prosa y el estudiante tenia que armar mentalmente
# el cociente antes de operarlo. Ahora el cociente aparece escrito.
NUEVOS[12] = (
    "<p>En un banco de pruebas se registran, para valores de \\(y\\) distintos de \\(0\\), "
    "la energía acumulada por un motor durante un ensayo y el tiempo empleado:</p>"
    + datos("Energía acumulada: \\(18y^{7} - 27y^{5} + 9y^{4}\\)<br>"
            "Tiempo empleado: \\(9y^{3}\\)")
    + "<p>La <b>potencia media</b> del ensayo es el cociente entre esas dos cantidades:</p>"
    + caja("\\[\\dfrac{18y^{7} - 27y^{5} + 9y^{4}}{9y^{3}}\\]")
    + "<p>¿Cuál expresión es equivalente a ese cociente?</p>",
    None)

# --- 16 · semitonos ------------------------------------------------------------------------
# Era un solo parrafo con la formula, dos definiciones, una condicion conocida y la pregunta,
# todo en linea. Se separa en cuatro tiempos.
NUEVOS[16] = (
    "<p>En acústica musical, la distancia en <b>semitonos</b> entre dos notas se relaciona con "
    "sus frecuencias mediante la siguiente fórmula:</p>"
    + caja("\\[s - s_{0} = 12\\,\\log_{2}\\!\\left(\\dfrac{f}{f_{0}}\\right)\\]")
    + "<p>En ella, \\(f_{0}\\) es la frecuencia de la nota de referencia y \\(s_{0}\\), el "
      "semitono que ocupa esa nota. Se sabe que, cuando \\(\\dfrac{f}{f_{0}} = 2\\) (una "
      "octava), la diferencia \\(s - s_{0}\\) es \\(12\\).</p>"
    + datos("Nota de referencia: \\(s_{0} = 28\\)<br>"
            "Nota buscada: \\(\\dfrac{f}{f_{0}} = 2^{3}\\)")
    + "<p>¿En qué semitono queda la nota buscada?</p>",
    None)

# --- 18 · campana de siembra ---------------------------------------------------------------
# El esquema muestra las tres primeras semanas en filas lineales. No se agrupan en cuadrados
# porque eso insinuaria la respuesta.
NUEVOS[18] = (
    "<p>Un vivero organiza una campaña de siembra: la primera semana planta \\(1\\) árbol; "
    "la segunda, \\(3\\); la tercera, \\(5\\), y, en general, cada semana planta \\(2\\) "
    "árboles más que la anterior.</p>"
    + "[[IMG]]"
    + "<p>El total plantado resulta de sumar lo de todas las semanas. ¿Cuál fórmula permite "
      "calcular el <b>total de árboles</b> plantados al cabo de \\(n\\) semanas?</p>",
    "assets/banco-mat-11-p2/q18.png")

# --- 20 · bicicletas -----------------------------------------------------------------------
NUEVOS[20] = (
    "<p>Un taller arma bicicletas a pedido: cada cliente escoge <b>1</b> cuadro, <b>1</b> juego "
    "de ruedas, <b>1</b> manubrio y <b>1</b> color de pintura. Estas son las opciones "
    "disponibles:</p>"
    + '<table style="border-collapse:collapse;margin:10px auto;font-family:Georgia,'
      "'Times New Roman',serif;font-size:15px;color:#1A1613\">"
    + '<tr><th style="%s">Pieza</th><th style="%s">Opciones disponibles</th></tr>' % (TH, TH)
    + "".join('<tr><td style="%s">%s</td><td style="%s">%s</td></tr>' % (TD, p, TD, n)
              for p, n in (("Cuadro", 6), ("Juego de ruedas", 3),
                           ("Manubrio", 2), ("Color de pintura", 4)))
    + "</table>"
    + "<p>¿Cuántas bicicletas distintas se pueden armar?</p>",
    None)


def main():
    d = json.load(io.open(RUTA, encoding="utf-8"))
    n = 0
    for q in d["preguntas"]:
        par = NUEVOS.get(q["numero"])
        if not par:
            continue
        nuevo, figura = par
        if q["enunciado"] != nuevo:
            q["enunciado"] = nuevo
            n += 1
            print("  q%-3d enunciado reorganizado%s" % (q["numero"], " + esquema" if figura else ""))
        if figura:
            q["imagen_figura"] = figura
            q.setdefault("imagen_alt", None)
    if APLICAR and n:
        json.dump(d, io.open(RUTA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("%s: %d enunciados" % ("APLICADO" if APLICAR else "SOLO INFORME", n))


if __name__ == "__main__":
    main()
