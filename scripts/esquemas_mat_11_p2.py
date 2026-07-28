# -*- coding: utf-8 -*-
"""esquemas_mat_11_p2.py, Esquemas de apoyo para Matematicas 11 P2.

Pedido del usuario (28-jul): en Matematicas de 11 hacen falta claridades y, donde sea posible,
esquemas graficos, formulas mejor organizadas y texto matematico mas facil de leer. Senalo en
concreto la pregunta 6, la de los signos de la tangente, porque "hace falta algo" para poder
resolverla.

Estas figuras son NUEVAS: no reemplazan ni modifican ninguna existente. Se dibujan con la misma
paleta y el mismo motor que el resto del banco propio, para que no se noten de otra mano.

  q06  Signo de la tangente segun la medida del angulo, de 0 a 180 grados. El item entregaba solo
       los signos y exigia recordar de memoria en que tramo la tangente es positiva o negativa;
       ese recuerdo es andamiaje, no lo que la pregunta evalua. Con el esquema el estudiante
       todavia debe hacer el razonamiento propio del item: si L es obtuso, J + K = 180 - L < 90.
       El esquema deja ver ademas que en 90 grados la tangente no esta definida, que es
       exactamente lo que descarta el distractor C.

  q18  Las tres primeras semanas de la campana de siembra, en filas lineales. A proposito NO se
       agrupan en cuadrados: eso regalaria que el total es n al cuadrado, que es lo que se pregunta.

Uso:  python scripts/esquemas_mat_11_p2.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon

import figuras as F

OUT = F._dir("banco-mat-11-p2")


def esquema_signo_tangente():
    fig, ax = plt.subplots(figsize=(7.6, 2.5))
    ax.set_xlim(-14, 194)
    ax.set_ylim(-1.35, 1.5)
    ax.axis("off")

    # Dos tramos: agudo (tangente positiva) y obtuso (tangente negativa).
    ax.add_patch(Rectangle((0, 0.08), 90, 0.62, facecolor=F.GOLD100,
                           edgecolor=F.GOLD700, linewidth=1.1, zorder=1))
    ax.add_patch(Rectangle((90, 0.08), 90, 0.62, facecolor=F.BRAND100,
                           edgecolor=F.BRAND700, linewidth=1.1, zorder=1))
    ax.text(45, 0.475, r"$\tan > 0$", ha="center", va="center", fontsize=15,
            color=F.GOLD700, fontweight="bold", zorder=3)
    ax.text(45, 0.215, "ángulo agudo", ha="center", va="center", fontsize=11.5,
            color=F.INK700, zorder=3)
    ax.text(135, 0.475, r"$\tan < 0$", ha="center", va="center", fontsize=15,
            color=F.BRAND700, fontweight="bold", zorder=3)
    ax.text(135, 0.215, "ángulo obtuso", ha="center", va="center", fontsize=11.5,
            color=F.INK700, zorder=3)

    # Recta de medidas.
    ax.plot([0, 180], [0, 0], color=F.LINEA, linewidth=1.6, zorder=4)
    for x, etiqueta in ((0, "0°"), (90, "90°"), (180, "180°")):
        ax.plot([x, x], [-0.09, 0.09], color=F.LINEA, linewidth=1.6, zorder=5)
        ax.text(x, -0.27, etiqueta, ha="center", va="top", fontsize=12.5, color=F.INK900)

    # El caso limite: en 90 grados la tangente no existe.
    ax.plot([90, 90], [0.08, 0.98], color=F.INK500, linewidth=1.3,
            linestyle=(0, (4, 3)), zorder=5)
    ax.plot(90, 0, marker="o", markersize=7, markerfacecolor="white",
            markeredgecolor=F.INK700, markeredgewidth=1.6, zorder=6)
    ax.text(90, 1.12, "en 90° la tangente no está definida", ha="center", va="bottom",
            fontsize=11.5, color=F.INK700, style="italic")

    ax.text(90, -0.72, "medida de un ángulo interior de un triángulo",
            ha="center", va="top", fontsize=11.5, color=F.INK500)
    return F._save(fig, "q06.png")


def esquema_siembra():
    fig, ax = plt.subplots(figsize=(7.4, 2.5))
    semanas = [("Semana 1", 1), ("Semana 2", 3), ("Semana 3", 5)]
    ancho, sep = 5.6, 1.5
    ax.set_xlim(-0.6, len(semanas) * (ancho + sep) + 2.6)
    ax.set_ylim(-1.5, 2.5)
    ax.axis("off")

    def arbol(x, y, s=0.42):
        ax.add_patch(Polygon([(x, y + s * 2.0), (x - s, y + s * 0.45), (x + s, y + s * 0.45)],
                             closed=True, facecolor=F.GOLD100, edgecolor=F.GOLD700,
                             linewidth=1.1, zorder=3))
        ax.add_patch(Rectangle((x - s * 0.17, y), s * 0.34, s * 0.5,
                               facecolor=F.INK300, edgecolor=F.INK700, linewidth=0.9, zorder=3))

    for i, (titulo, n) in enumerate(semanas):
        x0 = i * (ancho + sep)
        ax.add_patch(Rectangle((x0 - 0.35, -0.95), ancho, 2.75, facecolor="white",
                               edgecolor=F.INK200, linewidth=1.2, zorder=1))
        ax.text(x0 + ancho / 2 - 0.35, 1.5, titulo, ha="center", va="center",
                fontsize=12, color=F.BRAND700, fontweight="bold", zorder=4)
        # Fila lineal, nunca en cuadricula: la forma no debe insinuar la respuesta.
        paso = 0.98   # separacion mayor que el ancho del arbol: no se superponen
        inicio = x0 + ancho / 2 - 0.35 - (n - 1) * paso / 2
        for k in range(n):
            arbol(inicio + k * paso, 0.25)
        ax.text(x0 + ancho / 2 - 0.35, -0.62,
                "%d árbol%s" % (n, "" if n == 1 else "es"),
                ha="center", va="center", fontsize=11.5, color=F.INK700, zorder=4)

    x_fin = len(semanas) * (ancho + sep)
    ax.text(x_fin + 0.7, 0.45, "…", ha="center", va="center", fontsize=22, color=F.INK500)
    ax.text(x_fin + 0.7, -0.62, "y así\ncada semana", ha="center", va="center",
            fontsize=10.5, color=F.INK500)
    return F._save(fig, "q18.png")


if __name__ == "__main__":
    for f in (esquema_signo_tangente, esquema_siembra):
        print("  generada:", os.path.basename(f()))
