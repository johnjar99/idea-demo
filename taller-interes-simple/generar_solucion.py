# -*- coding: utf-8 -*-
"""Genera el PDF con la solución detallada del Taller de Interés Simple (Grado 7°).

Todos los resultados se calculan con fracciones exactas y se validan con
asserts, de modo que el PDF no puede contener un cálculo inconsistente.
"""
import json
import os
from decimal import Decimal
from fractions import Fraction as F

from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, PageBreak,
                                CondPageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Solucion_Taller_Interes_Simple_Grado_7.pdf")
ENUN = json.load(open(os.path.join(HERE, "enunciados.json"), encoding="utf-8"))

# ----------------------------------------------------------------- fuentes
FD = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("DV", FD + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DV-B", FD + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV", boldItalic="DV-B")

# ------------------------------------------------------------ formato es-CO


def num(x, maxdec=2):
    """Número con punto de miles y coma decimal (formato colombiano)."""
    x = F(x)
    d = x.denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    if d == 1:
        s = format(Decimal(x.numerator) / Decimal(x.denominator), "f")
        if "." in s:
            s = s.rstrip("0").rstrip(".")
    else:
        s = f"{float(x):.{maxdec}f}"
    ip, _, fp = s.partition(".")
    neg = ip.startswith("-")
    ip = f"{abs(int(ip)):,}".replace(",", ".")
    return ("-" if neg else "") + ip + ("," + fp if fp else "")


def money(x):
    return "$" + num(x)


def pct(x):
    return num(x) + "%"


def termina(x):
    d = F(x).denominator
    while d % 2 == 0:
        d //= 2
    while d % 5 == 0:
        d //= 5
    return d == 1


def es_entero(x):
    return F(x).denominator == 1


def escala(b):
    """Menor potencia de 10 que vuelve entero a b."""
    k = 1
    while not es_entero(F(b) * k):
        k *= 10
    return k


def unidad(u, n=None):
    if u == "m":
        return "mes" if n == 1 else "meses"
    return "año" if n == 1 else "años"


def tasa_word(u):
    return "mensual" if u == "m" else "anual"


def per(u):  # "por mes" / "por año"
    return "cada mes" if u == "m" else "cada año"


# ------------------------------------------------------------------ estilos
INK = colors.HexColor("#1f2937")
BLUE = colors.HexColor("#1d4ed8")
BLOCK_COL = {
    0: colors.HexColor("#475569"),
    1: colors.HexColor("#2563eb"),
    2: colors.HexColor("#7c3aed"),
    3: colors.HexColor("#db2777"),
    4: colors.HexColor("#ea580c"),
    5: colors.HexColor("#059669"),
    6: colors.HexColor("#0f766e"),
}
S = {
    "title": ParagraphStyle("title", fontName="DV-B", fontSize=26, leading=32, alignment=TA_CENTER, textColor=BLUE),
    "sub": ParagraphStyle("sub", fontName="DV", fontSize=13, leading=18, alignment=TA_CENTER, textColor=INK),
    "h1": ParagraphStyle("h1", fontName="DV-B", fontSize=17, leading=22, textColor=BLUE, spaceBefore=6, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="DV-B", fontSize=12.5, leading=16, textColor=INK, spaceBefore=4, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="DV", fontSize=10, leading=15, textColor=INK, spaceAfter=4),
    "step": ParagraphStyle("step", fontName="DV-B", fontSize=10, leading=14, textColor=BLUE, spaceBefore=5, spaceAfter=2),
    "calc": ParagraphStyle("calc", fontName="DV", fontSize=10, leading=15, textColor=INK, leftIndent=14, spaceAfter=3),
    "quote": ParagraphStyle("quote", fontName="DV", fontSize=10, leading=15, textColor=INK, leftIndent=6, rightIndent=6),
    "small": ParagraphStyle("small", fontName="DV", fontSize=8.5, leading=12, textColor=colors.HexColor("#475569")),
    "cell": ParagraphStyle("cell", fontName="DV", fontSize=9, leading=12.5, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName="DV-B", fontSize=9, leading=12.5, textColor=INK),
    "cellw": ParagraphStyle("cellw", fontName="DV-B", fontSize=9, leading=12.5, textColor=colors.white),
    "ans": ParagraphStyle("ans", fontName="DV-B", fontSize=10.5, leading=15, textColor=colors.HexColor("#065f46")),
    "banner": ParagraphStyle("banner", fontName="DV-B", fontSize=15, leading=20, textColor=colors.white),
    "bannersub": ParagraphStyle("bannersub", fontName="DV", fontSize=9.5, leading=13, textColor=colors.white),
}

story = []


def P(t, st="body"):
    story.append(Paragraph(t, S[st]))


def sp(h=6):
    story.append(Spacer(1, h))


def box(paras, bg, border, width=17.4 * cm, style="cell"):
    cells = [[Paragraph(p, S[style])] for p in paras]
    t = Table(cells, colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 1, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def banner(title, subtitle, k):
    t = Table([[Paragraph(title, S["banner"])], [Paragraph(subtitle, S["bannersub"])]], colWidths=[17.4 * cm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLOCK_COL[k]),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 5),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story.append(t)
    sp(8)


def tabla(rows, widths, head=True, hcolor=BLUE, zebra=True):
    data = []
    for i, r in enumerate(rows):
        st = "cellw" if (head and i == 0) else "cell"
        data.append([Paragraph(str(c), S[st]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    style = [("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    if head:
        style.append(("BACKGROUND", (0, 0), (-1, 0), hcolor))
    if zebra:
        for i in range(1 if head else 0, len(rows)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f1f5f9")))
    t.setStyle(TableStyle(style))
    return t


# -------------------------------------------------- explicaciones aritméticas


def mult(a, b):
    """Texto que explica a × b. Devuelve (texto, resultado)."""
    a, b = F(a), F(b)
    r = a * b
    if es_entero(b):
        return f"{num(a)} × {num(b)} = {num(r)}", r
    k = escala(b)
    return (f"{num(a)} × {num(b)} = {num(r)}  (truco: {num(b)} = {num(b * k)} ÷ {num(k)}; "
            f"primero {num(a)} × {num(b * k)} = {num(a * b * k)} y luego {num(a * b * k)} ÷ {num(k)} = {num(r)})"), r


def div(a, b):
    """Texto que explica a ÷ b. Devuelve (texto, resultado)."""
    a, b = F(a), F(b)
    q = a / b
    if es_entero(b):
        return f"{num(a)} ÷ {num(b)} = {num(q)}", q
    k = escala(b)
    return (f"{num(a)} ÷ {num(b)} = {num(q)}  (como {num(b)} tiene decimales, multiplicamos dividendo y divisor por {num(k)}: "
            f"{num(a * k)} ÷ {num(b * k)} = {num(q)})"), q


def paso(n, titulo):
    P(f"Paso {n}. {titulo}", "step")


def linea(t):
    P(t, "calc")


def datos(rows):
    story.append(tabla([["Dato", "Valor", "¿De dónde sale?"]] + rows, [4.2 * cm, 4.2 * cm, 9 * cm]))
    sp(4)


def convertir_tiempo(t, tu, ru):
    """Convierte el tiempo a la unidad de la tasa. Devuelve (texto, t_conv)."""
    if tu == ru:
        return (f"La tasa es {tasa_word(ru)} y el tiempo está en {unidad(tu, 2)}. Las dos unidades ya coinciden, "
                f"así que <b>no hay que convertir nada</b>: t = {num(t)} {unidad(tu, t)}."), F(t)
    if tu == "m" and ru == "a":
        tc = F(t) / 12
        extra = ""
        if tc.denominator == 2:
            extra = f" ({num(t)} meses = {num(int(tc))} año y medio, porque 6 meses es medio año)"
        return (f"La tasa es <b>anual</b> pero el tiempo está en <b>meses</b>: no se pueden mezclar. Un año tiene 12 meses, "
                f"así que convertimos meses a años dividiendo entre 12: {num(t)} ÷ 12 = {num(tc)} años{extra}."), tc
    tc = F(t) * 12
    return (f"La tasa es <b>mensual</b> pero el tiempo está en <b>años</b>: no se pueden mezclar. Un año tiene 12 meses, "
            f"así que convertimos años a meses multiplicando por 12: {num(t)} × 12 = {num(tc)} meses."), tc


def tasa_decimal(r, ru):
    return (f"El {pct(r)} significa <b>{num(r)} de cada 100 pesos</b> por {per(ru)}. Para usarlo en la fórmula se pasa a "
            f"decimal dividiendo entre 100: {pct(r)} = {num(r)} ÷ 100 = <b>{num(F(r) / 100)}</b> "
            f"(es correr la coma dos lugares a la izquierda).")


def interes_periodo(C, r, ru):
    """Pasos para el interés de UN periodo. Devuelve P."""
    x = F(C) / 100
    linea(f"• El 1% del capital: {money(C)} ÷ 100 = <b>{money(x)}</b> (dividir entre 100 es quitar dos ceros / correr la coma dos lugares).")
    txt, p = mult(x, r)
    linea(f"• Como la tasa es {pct(r)}, multiplicamos ese 1% por {num(r)}: {txt}.")
    linea(f"• Es decir, <b>cada {unidad(ru, 1)}</b> se generan <b>{money(p)}</b> de interés.")
    return p


def resp(texto):
    story.append(Spacer(1, 4))
    story.append(box([f"✔ Respuesta: {texto}"], colors.HexColor("#d1fae5"), colors.HexColor("#059669"), style="ans"))
    sp(6)


def comprueba(texto):
    P(f"<b>Comprobación:</b> {texto}", "body")


# ---------------------------------------------------------------- resolutores
RES = {}  # n -> texto corto de respuesta para el resumen final


def cabecera(n, enun):
    story.append(CondPageBreak(9 * cm))
    story.append(Spacer(1, 6))
    etiqueta = f"Problema {n}" if isinstance(n, int) else (n if n.startswith("Ejemplo") else f"Pregunta {n}")
    head = Table([[Paragraph(etiqueta, S["cellw"])]], colWidths=[17.4 * cm])
    head.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), INK), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    q = box([f"<b>Enunciado:</b> {enun}"], colors.HexColor("#f8fafc"), colors.HexColor("#94a3b8"), style="quote")
    story.append(KeepTogether([head, q]))
    sp(3)


def sol_interes(n, enun, C, r, ru, t, tu, ans, tip=None, monto=False, ask="I"):
    cabecera(n, enun)
    rows = [["Capital (C)", money(C), "Es el dinero que se invierte o se presta al comienzo."],
            ["Tasa (i)", f"{pct(r)} {tasa_word(ru)}", f"Porcentaje que se aplica {per(ru)}."],
            ["Tiempo (t)", f"{num(t)} {unidad(tu, t)}", "Cuánto dura la inversión o el préstamo."]]
    rows.append(["Incógnita", "Interés (I)" + (" y monto (M)" if monto else ""), "Lo que nos piden calcular."])
    paso(1, "Escribir los datos")
    datos(rows)
    paso(2, "Elegir la fórmula")
    linea("Buscamos el interés, así que usamos <b>I = C × i × t</b>."
          + (" Después el monto: <b>M = C + I</b>." if monto else ""))
    paso(3, "Revisar que la tasa y el tiempo estén en la misma unidad")
    txt, tc = convertir_tiempo(t, tu, ru)
    linea(txt)
    paso(4, "Pasar la tasa a decimal")
    linea(tasa_decimal(r, ru))
    paso(5, "Calcular el interés")
    p = interes_periodo(C, r, ru)
    txt2, I = mult(p, tc)
    if es_entero(tc):
        linea(f"• Ese interés se gana durante {num(tc)} {unidad(ru, tc)}: {txt2}.")
    else:
        linea(f"• Ese interés se gana durante {num(tc)} {unidad(ru, tc)}: {txt2}.")
    linea(f"• Todo junto: I = C × i × t = {num(C)} × {num(F(r) / 100)} × {num(tc)} = <b>{money(I)}</b>.")
    assert I == F(C) * F(r) / 100 * tc
    vals = dict(I=money(I))
    if monto:
        paso(6, "Calcular el monto (capital + interés)")
        M = F(C) + I
        linea(f"M = C + I = {money(C)} + {money(I)} = <b>{money(M)}</b>.")
        linea("El monto es <b>todo</b> el dinero que hay al final: lo que se puso al inicio más lo que se ganó.")
        vals["M"] = money(M)
    resp(ans.format(**vals))
    _, ii = div(I, F(C) * tc)
    comprueba(f"despejamos la tasa: i = I ÷ (C × t) = {num(I)} ÷ ({num(C)} × {num(tc)}) = {num(I)} ÷ {num(F(C) * tc)} = "
              f"{num(ii)} = {pct(ii * 100)}. Coincide con la tasa del problema ✔.")
    if tip:
        story.append(box([f"★ <b>Ojo:</b> {tip}"], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
        sp(4)
    RES[n] = vals.get("M") and f"I = {vals['I']}; M = {vals['M']}" or f"I = {vals['I']}"
    return I


def sol_tiempo(n, enun, C, r, ru, I, ask_unit, ans, tip=None, monto=False, pre=None, extra_out=None):
    cabecera(n, enun)
    rows = [["Capital (C)", money(C), "Dinero inicial."],
            ["Tasa (i)", f"{pct(r)} {tasa_word(ru)}", f"Porcentaje que se aplica {per(ru)}."],
            ["Interés (I)", money(I), "Lo que se ganó o se pagó de intereses."],
            ["Incógnita", "Tiempo (t)" + (" y monto (M)" if monto else ""), f"Debemos hallarlo en {unidad(ask_unit, 2)}."]]
    paso(1, "Escribir los datos")
    datos(rows)
    paso(2, "Elegir la fórmula")
    linea("Buscamos el tiempo, así que despejamos: <b>t = I ÷ (C × i)</b>. "
          "Interpretación: si sabemos cuánto interés se genera <i>en un solo periodo</i>, basta ver cuántas veces cabe en el interés total.")
    paso(3, "Pasar la tasa a decimal y revisar unidades")
    linea(tasa_decimal(r, ru))
    linea(f"La tasa es {tasa_word(ru)}, por eso el tiempo que obtengamos saldrá en <b>{unidad(ru, 2)}</b>.")
    paso(4, "Calcular el interés de un solo periodo (C × i)")
    p = interes_periodo(C, r, ru)
    paso(5, "Calcular cuántos periodos se necesitan (t = I ÷ interés de un periodo)")
    txt, t = div(I, p)
    linea(f"t = {num(I)} ÷ {num(p)}:  {txt}.")
    linea(f"Resultado: <b>t = {num(t)} {unidad(ru, t)}</b>.")
    tf = t
    if ask_unit != ru:
        tf = t * 12 if ask_unit == "m" else t / 12
        linea(f"Como el problema pide la respuesta en {unidad(ask_unit, 2)} y un año tiene 12 meses, convertimos: "
              f"{num(t)} × 12 = <b>{num(tf)} {unidad(ask_unit, tf)}</b>.")
    vals = dict(t=num(tf), tu=unidad(ask_unit, tf), I=money(I))
    if monto:
        paso(6, "Calcular el monto")
        M = F(C) + I
        linea(f"M = C + I = {money(C)} + {money(I)} = <b>{money(M)}</b>.")
        vals["M"] = money(M)
    resp(ans.format(**vals))
    _, chk = mult(p, t)
    comprueba(f"si en cada {unidad(ru, 1)} se ganan {money(p)}, en {num(t)} {unidad(ru, t)} se ganan {num(p)} × {num(t)} = {num(chk)} pesos. "
              f"Es exactamente el interés del problema ({money(I)}) ✔.")
    assert p * t == I
    if tip:
        story.append(box([f"★ <b>Ojo:</b> {tip}"], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
        sp(4)
    RES[n] = f"t = {num(tf)} {unidad(ask_unit, tf)}" + (f"; M = {vals['M']}" if monto else "")
    return tf


def sol_tasa(n, enun, C, I, t, tu, ru, ans, tip=None, monto=False, M_dado=None, pre=False):
    cabecera(n, enun)
    rows = [["Capital (C)", money(C), "Dinero inicial."]]
    if pre:
        rows.append(["Monto (M)", money(M_dado), "Dinero que se quiere tener al final."])
    else:
        rows.append(["Interés (I)", money(I), "Lo que se ganó o se pagó de intereses."])
    rows.append(["Tiempo (t)", f"{num(t)} {unidad(tu, t)}", "Cuánto dura la inversión o el préstamo."])
    rows.append(["Incógnita", f"Tasa (i) {tasa_word(ru)}" + (" y monto (M)" if monto else ""), "Debe quedar en la unidad pedida."])
    paso(1, "Escribir los datos")
    datos(rows)
    k = 2
    if pre:
        paso(k, "Hallar primero el interés")
        linea(f"El monto es capital + interés (M = C + I), entonces el interés es lo que sobra al restar: I = M − C = {money(M_dado)} − {money(C)} = <b>{money(I)}</b>.")
        k += 1
    paso(k, "Elegir la fórmula")
    linea("Buscamos la tasa, así que despejamos: <b>i = I ÷ (C × t)</b>. "
          "Interpretación: el 1% del capital produce cierto dinero en el tiempo dado; vemos cuántas veces ese 1% cabe en el interés ganado.")
    k += 1
    paso(k, "Revisar unidades")
    txt, tc = convertir_tiempo(t, tu, ru)
    linea(txt)
    linea(f"Así, la tasa saldrá {tasa_word(ru)}.")
    k += 1
    paso(k, "Calcular")
    x = F(C) / 100
    linea(f"• El 1% del capital: {money(C)} ÷ 100 = <b>{money(x)}</b>.")
    txt2, z = mult(x, tc)
    linea(f"• Ese 1% durante {num(tc)} {unidad(ru, tc)} produce: {txt2}.")
    txt3, tasa_pct = div(I, z)
    linea(f"• ¿Cuántas veces cabe ese 1% en el interés ganado? {txt3}. Entonces la tasa es <b>{num(tasa_pct)+'%'} {tasa_word(ru)}</b>.")
    txt4 = ""
    if not termina(tasa_pct):
        whole = tasa_pct.numerator // tasa_pct.denominator
        rem = tasa_pct - whole
        linea(f"  (La división no es exacta: da {num(tasa_pct, 4)}... que es {whole} + {rem.numerator}/{rem.denominator}; lo redondeamos a {num(tasa_pct)}%.)")
    dec_ = F(I) / (F(C) * tc)
    linea(f"• Con la fórmula: i = I ÷ (C × t) = {num(I)} ÷ ({num(C)} × {num(tc)}) = {num(I)} ÷ {num(F(C) * tc)} = {num(dec_, 4)}; "
          f"en porcentaje: {num(dec_, 4)} × 100 = <b>{num(dec_ * 100)}%</b>. Las dos formas dan lo mismo.")
    vals = dict(r=num(tasa_pct), I=money(I))
    if monto:
        k += 1
        paso(k, "Calcular el monto")
        M = F(C) + I
        linea(f"M = C + I = {money(C)} + {money(I)} = <b>{money(M)}</b>.")
        vals["M"] = money(M)
    resp(ans.format(**vals))
    if termina(tasa_pct):
        comprueba(f"C × i × t = {num(C)} × {num(tasa_pct / 100)} × {num(tc)} = {num(F(C) * tasa_pct / 100 * tc)}. "
                  f"Es el interés del problema ✔.")
        assert F(C) * tasa_pct / 100 * tc == I
    else:
        comprueba(f"C × i × t = {num(C)} × {num(tasa_pct / 100, 5)} × {num(tc)} ≈ {num(F(C) * tasa_pct / 100 * tc)}. "
                  f"Al redondear la tasa la diferencia es de pocos pesos; con la fracción exacta da {num(I)} ✔.")
    if tip:
        story.append(box([f"★ <b>Ojo:</b> {tip}"], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
        sp(4)
    RES[n] = f"i = {num(tasa_pct)}% {tasa_word(ru)}" + (f"; M = {vals['M']}" if monto else "")
    return tasa_pct


def sol_capital(n, enun, r, ru, t, tu, I, ans, tip=None, monto=False):
    cabecera(n, enun)
    rows = [["Tasa (i)", f"{pct(r)} {tasa_word(ru)}", f"Porcentaje que se aplica {per(ru)}."],
            ["Tiempo (t)", f"{num(t)} {unidad(tu, t)}", "Cuánto dura la inversión o el préstamo."],
            ["Interés (I)", money(I), "Lo que se ganó o se pagó de intereses."],
            ["Incógnita", "Capital (C)" + (" y monto (M)" if monto else ""), "El dinero que había al comienzo."]]
    paso(1, "Escribir los datos")
    datos(rows)
    paso(2, "Elegir la fórmula")
    linea("Buscamos el capital, así que despejamos: <b>C = I ÷ (i × t)</b>. "
          "Interpretación: el interés total es un porcentaje del capital; si sabemos cuánto dinero es ese porcentaje, podemos hallar el 100%.")
    paso(3, "Revisar unidades")
    txt, tc = convertir_tiempo(t, tu, ru)
    linea(txt)
    paso(4, "Pasar la tasa a decimal y hallar el porcentaje total ganado")
    linea(tasa_decimal(r, ru))
    tot = F(r) * tc
    txt2, _ = mult(r, tc)
    linea(f"En {num(tc)} {unidad(ru, tc)} el capital gana {pct(r)} cada vez, o sea un total de {txt2.split('  (')[0].replace(' = ', ' = ')}"
          f"<b>%</b> del capital. En decimal: {num(F(r)/100)} × {num(tc)} = <b>{num(tot / 100)}</b>.")
    paso(5, "Calcular el capital")
    linea(f"Los {num(I)} pesos de interés representan el <b>{num(tot)}%</b> del capital.")
    txt3, uno = div(I, tot)
    linea(f"• Si el {num(tot)}% del capital son {money(I)}, entonces el <b>1%</b> del capital es: {txt3} → <b>{money(uno)}</b>.")
    txt4, C = mult(uno, 100)
    linea(f"• El capital es el 100%, o sea 100 veces el 1%: {txt4}. Entonces <b>C = {money(C)}</b>.")
    d2 = F(r) / 100 * tc
    txt5, C2 = div(I, d2)
    linea(f"• Con la fórmula: C = I ÷ (i × t) = {num(I)} ÷ ({num(F(r)/100)} × {num(tc)}) = {num(I)} ÷ {num(d2)} = {num(C2)}. Es el mismo resultado.")
    assert C == C2
    vals = dict(C=money(C), I=money(I))
    if monto:
        paso(6, "Calcular el monto")
        M = C + I
        linea(f"M = C + I = {money(C)} + {money(I)} = <b>{money(M)}</b>.")
        vals["M"] = money(M)
    resp(ans.format(**vals))
    comprueba(f"C × i × t = {num(C)} × {num(F(r)/100)} × {num(tc)} = {num(C * F(r) / 100 * tc)}. Es el interés del problema ✔.")
    assert C * F(r) / 100 * tc == I
    if tip:
        story.append(box([f"★ <b>Ojo:</b> {tip}"], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
        sp(4)
    RES[n] = f"C = {money(C)}" + (f"; M = {vals['M']}" if monto else "")
    return C


# ------------------------------------------------------------ dibujos
def cuadricula(rate=2):
    d = Drawing(230, 120)
    s = 10
    for i in range(100):
        row, col = divmod(i, 10)
        fill = colors.HexColor("#2563eb") if i < rate else colors.white
        d.add(Rect(4 + col * s, 108 - row * s - s + 2, s, s, fillColor=fill, strokeColor=colors.HexColor("#64748b"), strokeWidth=0.4))
    d.add(String(120, 90, f"{rate} cuadritos azules de 100", fontName="DV", fontSize=8.5))
    d.add(String(120, 76, f"= {rate}/100 = {rate}% = {num(F(rate, 100))}", fontName="DV-B", fontSize=9))
    d.add(String(120, 58, "El 1% de una cantidad es", fontName="DV", fontSize=8.5))
    d.add(String(120, 46, "esa cantidad dividida entre 100.", fontName="DV", fontSize=8.5))
    return d


def barra_monto():
    d = Drawing(480, 70)
    d.add(Rect(10, 25, 200, 26, fillColor=colors.HexColor("#93c5fd"), strokeColor=colors.HexColor("#1d4ed8")))
    d.add(String(45, 34, "Capital (C)", fontName="DV-B", fontSize=9))
    d.add(Rect(210, 25, 90, 26, fillColor=colors.HexColor("#fcd34d"), strokeColor=colors.HexColor("#b45309")))
    d.add(String(222, 34, "Interés (I)", fontName="DV-B", fontSize=9))
    d.add(String(10, 8, "Lo que pones al inicio", fontName="DV", fontSize=8))
    d.add(String(212, 8, "Lo que gana", fontName="DV", fontSize=8))
    d.add(String(320, 34, "= Monto (M)  →  M = C + I", fontName="DV-B", fontSize=10))
    d.add(String(320, 20, "Todo el dinero al final", fontName="DV", fontSize=8))
    return d


# ---------------------------------------------------------------- pie de página
def deco(canvas, doc):
    canvas.saveState()
    canvas.setFont("DV", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(2 * cm, 1.2 * cm, "Matemáticas financieras · Grado 7° · Interés simple · Solución detallada")
    canvas.drawRightString(letter[0] - 2 * cm, 1.2 * cm, f"Página {doc.page}")
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(2 * cm, 1.6 * cm, letter[0] - 2 * cm, 1.6 * cm)
    canvas.restoreState()


def cover(canvas, doc):
    pass


# ====================================================================== CONTENIDO
# ------------------------------------------------------------------- portada
sp(60)
P("Solución detallada", "sub")
sp(6)
P("TALLER DE INTERÉS SIMPLE", "title")
P("Grado 7°", "title")
sp(14)
P("Liceo de la Universidad de Nariño · Docente José Pantoja", "sub")
P("Matemáticas financieras", "sub")
sp(22)
story.append(box([
    "<b>¿Qué encontrarás en este documento?</b>",
    "• Una explicación desde cero de qué es el interés simple, con dibujos y ejemplos.",
    "• Las <b>dos situaciones guía</b> resueltas paso a paso.",
    "• Los <b>50 ejercicios</b> del taller resueltos con el mismo método: datos, fórmula, unidades, cálculo, respuesta y comprobación.",
    "• Las <b>4 preguntas de reflexión</b> (R1 a R4) con respuestas modelo.",
    "• Una <b>tabla resumen</b> con todas las respuestas al final."], colors.HexColor("#eff6ff"), BLUE))
sp(18)
story.append(box([
    "<b>Consejo para estudiar:</b> no copies las respuestas. Tapa la solución, intenta resolver el problema tú mismo con el método "
    "de los 6 pasos y después compara. Si tu resultado es distinto, busca en qué paso cambió."], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
story.append(PageBreak())

# ------------------------------------------------------------ fundamentos
P("1. Antes de calcular: ¿qué es el interés simple?", "h1")
P("Cuando guardas dinero en una cooperativa o un banco, ellos lo usan y, como agradecimiento, te pagan un dinero extra. "
  "Ese dinero extra se llama <b>interés</b>. Cuando tú pides un préstamo pasa al revés: tú pagas un extra por usar dinero ajeno. "
  "En el <b>interés simple</b> ese extra siempre se calcula sobre el dinero <b>inicial</b>, nunca sobre los intereses que ya se ganaron. "
  "Por eso cada mes (o cada año) se gana <b>la misma cantidad</b>.")
sp(4)
P("Los cinco personajes del interés simple", "h2")
story.append(tabla([
    ["Nombre", "Letra", "¿Qué es?", "Ejemplo"],
    ["Capital", "C", "El dinero que se invierte o se presta al comienzo.", "$1.000.000 que depositas hoy."],
    ["Tasa de interés", "i", "El porcentaje que se paga por cada mes o cada año.", "2% mensual: 2 pesos por cada 100, cada mes."],
    ["Tiempo", "t", "Cuánto dura la inversión o el préstamo.", "5 meses."],
    ["Interés", "I", "El dinero extra que se gana (o se paga).", "$100.000 de ganancia."],
    ["Monto", "M", "Capital + interés: todo el dinero al final.", "$1.100.000 al terminar."],
], [3 * cm, 1.6 * cm, 7 * cm, 5.8 * cm]))
sp(8)
story.append(barra_monto())
sp(4)
P("Las fórmulas", "h2")
story.append(tabla([
    ["¿Qué busco?", "Fórmula", "En palabras"],
    ["Interés (I)", "I = C × i × t", "capital por tasa (decimal) por tiempo"],
    ["Monto (M)", "M = C + I", "capital más interés"],
    ["Capital (C)", "C = I ÷ (i × t)", "el interés dividido entre tasa por tiempo"],
    ["Tasa (i)", "i = I ÷ (C × t)", "el interés dividido entre capital por tiempo"],
    ["Tiempo (t)", "t = I ÷ (C × i)", "el interés dividido entre capital por tasa"],
], [4 * cm, 5 * cm, 8.4 * cm]))
sp(6)
P("<b>¿De dónde salen los despejes?</b> Son la misma fórmula I = C × i × t, pero usando la idea de que "
  "<i>la división deshace la multiplicación</i>. Si 12 = 3 × 4, entonces 3 = 12 ÷ 4 y 4 = 12 ÷ 3. "
  "Aquí es igual: si el interés es el resultado de multiplicar C, i y t, para encontrar uno de ellos dividimos el interés entre los otros dos.")

P("2. Porcentajes: la clave de todo el taller", "h1")
P("Un porcentaje es una fracción con denominador 100: <b>2% = 2/100 = 0,02</b>. Mira el dibujo: si un cuadrado se divide en 100 cuadritos, "
  "el 2% son 2 cuadritos.")
story.append(cuadricula(2))
sp(4)
P("<b>Cómo pasar de % a decimal:</b> se divide entre 100, es decir, se corre la coma <b>dos lugares a la izquierda</b>.")
story.append(tabla([
    ["Porcentaje", "Fracción", "Decimal"],
    ["2%", "2/100", "0,02"], ["1,5%", "1,5/100", "0,015"], ["0,75%", "0,75/100", "0,0075"], ["10%", "10/100", "0,10 = 0,1"],
    ["0,9%", "0,9/100", "0,009"],
], [4 * cm, 4 * cm, 4 * cm]))
sp(6)
P("<b>El truco del 1%.</b> En este documento usamos mucho un truco que hace las cuentas más fáciles: primero se calcula el <b>1% del capital</b> "
  "(dividiendo entre 100) y luego se multiplica por la tasa. Por ejemplo, el 3% de $8.500.000: el 1% es $85.000 y el 3% es 3 × $85.000 = $255.000.")

P("3. Tasa y tiempo deben hablar el mismo idioma", "h1")
P("Si la tasa es <b>mensual</b>, el tiempo se cuenta en <b>meses</b>. Si la tasa es <b>anual</b>, el tiempo se cuenta en <b>años</b>. "
  "Si vienen mezclados hay que convertir antes de calcular:")
story.append(tabla([
    ["Situación", "Qué hacer", "Ejemplo"],
    ["Tasa anual y tiempo en meses", "Dividir los meses entre 12", "18 meses = 18 ÷ 12 = 1,5 años"],
    ["Tasa mensual y tiempo en años", "Multiplicar los años por 12", "2 años = 2 × 12 = 24 meses"],
    ["Resultado en años y piden meses", "Multiplicar por 12", "1,5 años = 1,5 × 12 = 18 meses"],
], [5.4 * cm, 5 * cm, 7 * cm]))
sp(6)
P("Recuerda: 6 meses es <b>medio año</b> (0,5), 3 meses es un cuarto de año (0,25) y 18 meses es <b>año y medio</b> (1,5).")

story.append(CondPageBreak(9 * cm))
P("4. El método de los 6 pasos", "h1")
story.append(tabla([
    ["Paso", "Qué hago", "Pregunta que me ayuda"],
    ["1", "Escribo los datos", "¿Qué me dan? ¿Qué me piden?"],
    ["2", "Elijo la fórmula", "¿Busco I, t, i o C?"],
    ["3", "Reviso las unidades", "¿La tasa y el tiempo están en meses/meses o años/años?"],
    ["4", "Paso la tasa a decimal", "¿Dividí el porcentaje entre 100?"],
    ["5", "Calculo", "¿Hice las operaciones en orden?"],
    ["6", "Respondo y compruebo", "¿Mi respuesta tiene sentido? ¿Al reemplazar vuelve a dar el dato?"],
], [1.8 * cm, 6 * cm, 9.6 * cm]))
story.append(PageBreak())

# ---------------------------------------------------------------- ejemplos
banner("EJEMPLOS GUÍA", "Dos situaciones resueltas con todo el detalle antes de empezar los 50 ejercicios.", 0)
sol_tiempo("Ejemplo 1", ENUN["E1"], 8500000, 3, "a", 1275000, "a",
           "El agricultor debe dejar su dinero <b>{t} {tu}</b> para recibir {I} de interés.",
           tip="La tasa es anual, por eso el tiempo sale directamente en años.")
sol_tasa("Ejemplo 2", ENUN["E2"], 4500000, 900000, 1, "a", "m",
         "La tasa mensual es de aproximadamente <b>{r}%</b> (exactamente 1 2/3 % = 1,666…%).",
         tip="Aquí la tasa que piden es <b>mensual</b> y el tiempo es 1 <b>año</b>, así que primero convertimos: 1 año = 12 meses. "
             "Otra forma de verlo: 900.000 ÷ 4.500.000 = 0,2 = 20% anual, y 20% ÷ 12 meses = 1,67% cada mes.")
story.append(PageBreak())

# -------------------------------------------------------------- BLOQUE 1
banner("BLOQUE 1 · CALCULA EL INTERÉS", "Datos conocidos: capital, tasa y tiempo. Incógnita: interés (I = C × i × t).", 1)
B1 = [
    (1, 2400000, 2, "m", 5, "m", "La familia recibirá {I} de interés al finalizar los 5 meses.", None),
    (2, 650000, F(3, 2), "m", 8, "m", "La estudiante gana {I} por intereses.", "La tasa 1,5% tiene coma: se convierte a 0,015 (1,5 ÷ 100)."),
    (3, 3200000, 10, "a", 2, "a", "El caficultor pagará {I} únicamente de intereses.", None),
    (4, 5000000, 6, "a", 3, "a", "La tienda obtiene {I} de interés simple.", None),
    (5, 900000, F(5, 2), "m", 6, "m", "Valentina recibirá {I} de intereses.", None),
    (6, 1800000, F(9, 5), "m", 10, "m", "El costo financiero es de {I} en intereses.", "Costo financiero es lo que cuesta usar dinero prestado: es el interés que se paga."),
    (7, 7500000, 4, "a", 18, "m", "El ahorro produce {I} de interés.",
     "La tasa es anual y el tiempo está en meses. Si olvidas convertir y usas t = 18, obtendrías $5.400.000, que es un error enorme."),
    (8, 12000000, 9, "a", 2, "a", "El conductor pagará {I} de interés simple.", None),
    (9, 4800000, F(9, 10), "m", 7, "m", "La familia obtiene {I} de interés.", "0,9% = 0,009; el cero antes de 9 es fácil de olvidar."),
    (10, 1250000, F(6, 5), "m", 4, "m", "El grupo escolar gana {I} por interés.", None),
]
for n, C, r, ru, t, tu, ans, tip in B1:
    sol_interes(n, ENUN[str(n)], C, r, ru, t, tu, ans, tip)
story.append(PageBreak())

# -------------------------------------------------------------- BLOQUE 2
banner("BLOQUE 2 · ENCUENTRA EL TIEMPO", "Datos conocidos: capital, tasa e interés. Incógnita: tiempo (t = I ÷ (C × i)).", 2)
B2 = [
    (11, 3000000, 2, "m", 360000, "m", "El dinero estuvo invertido <b>{t} {tu}</b>.", None),
    (12, 6000000, 5, "a", 900000, "a", "El agricultor mantuvo el préstamo <b>{t} {tu}</b>.", None),
    (13, 1500000, 1, "m", 120000, "m", "Camila dejó su dinero <b>{t} {tu}</b>.", None),
    (14, 8000000, 12, "a", 1920000, "a", "El crédito duró <b>{t} {tu}</b>.", None),
    (15, 2500000, F(8, 5), "m", 240000, "m", "El vendedor mantuvo la inversión <b>{t} {tu}</b>.", None),
    (16, 10000000, 7, "a", 2100000, "a", "El préstamo duró <b>{t} {tu}</b>.", None),
    (17, 4000000, F(3, 4), "m", 180000, "m", "Transcurrieron <b>{t} {tu}</b>.", "0,75% = 0,0075; son tres cuartos de 1%."),
    (18, 5500000, 8, "a", 660000, "m", "El préstamo duró <b>{t} {tu}</b> (1,5 años).",
     "La pregunta pide <b>meses</b> pero la tasa es anual: la división da años (1,5) y hay que multiplicar por 12."),
    (19, 2000000, 3, "m", 300000, "m", "El dinero estuvo prestado <b>{t} {tu}</b>.", None),
    (20, 15000000, 6, "a", 1350000, "m", "La inversión permaneció <b>{t} {tu}</b> (1,5 años).",
     "Igual que en el problema 18: la tasa es anual, el resultado sale en años y se pasa a meses multiplicando por 12."),
]
for n, C, r, ru, I, au, ans, tip in B2:
    sol_tiempo(n, ENUN[str(n)], C, r, ru, I, au, ans, tip)
story.append(PageBreak())

# -------------------------------------------------------------- BLOQUE 3
banner("BLOQUE 3 · DESCUBRE LA TASA", "Datos conocidos: capital, tiempo e interés. Incógnita: tasa (i = I ÷ (C × t)).", 3)
B3 = [
    (21, 500000, 50000, 5, "m", "m", "La tasa fue de <b>{r}% mensual</b>.", None),
    (22, 4000000, 640000, 2, "a", "a", "La tasa fue de <b>{r}% anual</b>.", None),
    (23, 6000000, 900000, 10, "m", "m", "Le cobraron una tasa de <b>{r}% mensual</b>.", None),
    (24, 3500000, 735000, 3, "a", "a", "La tasa anual fue de <b>{r}%</b>.", None),
    (25, 1200000, 115200, 8, "m", "m", "El joven aplicó una tasa de <b>{r}% mensual</b>.", None),
    (26, 9000000, 1800000, 2, "a", "a", "La tasa anual fue de <b>{r}%</b>.", None),
    (27, 2800000, 294000, 15, "m", "m", "La tasa simple mensual fue de <b>{r}%</b>.", "La tasa no siempre es un número entero: aquí es menos del 1%."),
    (28, 20000000, 1800000, 18, "m", "a", "La inversión produjo una tasa anual de <b>{r}%</b>.",
     "La tasa pedida es <b>anual</b> y el tiempo está en meses: 18 meses = 1,5 años. Si usaras 18 como si fueran años, saldría 0,5% (¡incorrecto!)."),
    (29, 2400000, 216000, 6, "m", "m", "La tasa mensual fue de <b>{r}%</b>.", None),
    (30, 7500000, 2100000, 4, "a", "a", "El comerciante cobró una tasa anual de <b>{r}%</b>.", None),
]
for n, C, I, t, tu, ru, ans, tip in B3:
    sol_tasa(n, ENUN[str(n)], C, I, t, tu, ru, ans, tip)
story.append(PageBreak())

# -------------------------------------------------------------- BLOQUE 4
banner("BLOQUE 4 · HALLA EL CAPITAL", "Datos conocidos: tasa, tiempo e interés. Incógnita: capital (C = I ÷ (i × t)).", 4)
B4 = [
    (31, 2, "m", 6, "m", 360000, "El capital inicial fue de <b>{C}</b>."),
    (32, 8, "a", 3, "a", 1920000, "Se prestaron <b>{C}</b>."),
    (33, F(3, 2), "m", 10, "m", 450000, "Se depositaron <b>{C}</b>."),
    (34, 7, "a", 2, "a", 840000, "El valor inicial del crédito fue de <b>{C}</b>."),
    (35, 1, "m", 9, "m", 270000, "El capital de la emprendedora era de <b>{C}</b>."),
    (36, 5, "a", 4, "a", 1500000, "La cooperativa había prestado <b>{C}</b>."),
    (37, F(4, 5), "m", 5, "m", 160000, "El ahorro inicial era de <b>{C}</b>."),
    (38, 10, "a", 2, "a", 2400000, "El capital solicitado fue de <b>{C}</b>."),
    (39, F(7, 5), "m", 6, "m", 126000, "El grupo había depositado <b>{C}</b>."),
    (40, 6, "a", 3, "a", 1080000, "El productor había prestado <b>{C}</b>."),
]
for n, r, ru, t, tu, I, ans in B4:
    sol_capital(n, ENUN[str(n)], r, ru, t, tu, I, ans)
story.append(PageBreak())

# -------------------------------------------------------------- BLOQUE 5
banner("BLOQUE 5 · MONTO Y RETOS INTEGRADORES", "Combinamos los conceptos: interés, monto y análisis de decisiones.", 5)
sol_interes(41, ENUN["41"], 1600000, F(5, 4), "m", 8, "m",
            "El interés es <b>{I}</b> y el monto total que recibirá Sara es <b>{M}</b>.", monto=True,
            tip="1,25% = 0,0125. Recuerda que el <b>monto</b> incluye el capital: no es solo la ganancia.")
sol_interes(42, ENUN["42"], 10000000, 9, "a", 18, "m",
            "Los intereses son <b>{I}</b> y el monto que deberá devolver la ferretería es <b>{M}</b>.", monto=True,
            tip="Tasa anual y tiempo en meses: 18 meses = 1,5 años antes de calcular.")
# 43: solo monto
cabecera(43, ENUN["43"])
paso(1, "Escribir los datos")
datos([["Capital (C)", money(800000), "Dinero de la actividad escolar."],
       ["Tasa (i)", "2% mensual", "Porcentaje que se aplica cada mes."],
       ["Tiempo (t)", "5 meses", "Duración de la inversión."],
       ["Incógnita", "Monto (M)", "«Cuánto tendrán en total» = capital + interés."]])
paso(2, "Elegir las fórmulas")
linea("«En total» significa el monto: <b>M = C + I</b>. Primero necesitamos I con <b>I = C × i × t</b>.")
paso(3, "Unidades y tasa en decimal")
linea("Tasa mensual y tiempo en meses: coinciden, no hay que convertir. 2% = 2 ÷ 100 = <b>0,02</b>.")
paso(4, "Calcular el interés")
p = interes_periodo(800000, 2, "m")
I43 = p * 5
linea(f"• En 5 meses: {num(p)} × 5 = <b>{money(I43)}</b>. (Con la fórmula: 800.000 × 0,02 × 5 = {num(I43)}.)")
paso(5, "Calcular el monto")
M43 = 800000 + I43
linea(f"M = C + I = {money(800000)} + {money(I43)} = <b>{money(M43)}</b>.")
resp(f"Al terminar, el grupo tendrá <b>{money(M43)}</b> en total.")
comprueba(f"M − C = {num(M43)} − 800.000 = {num(I43)}, que es el interés calculado ✔. Además, 880.000 es el 110% de 800.000 "
          f"(el 100% inicial + el 10% ganado: 2% × 5 meses = 10%).")
RES[43] = f"M = {money(M43)}"
assert M43 == 880000
sol_tasa(44, ENUN["44"], 5000000, 750000, 2, "a", "a",
         "La tasa anual simple necesaria es del <b>{r}%</b> y el monto final será <b>{M}</b>.", monto=True,
         tip="Como el interés es 750.000 y el tiempo son 2 años, en un año se ganarían 375.000, que es el 7,5% de 5.000.000.")
sol_tiempo(45, ENUN["45"], 4500000, F(3, 2), "m", 540000, "m",
           "Debe mantener el préstamo <b>{t} {tu}</b> y recibirá en total <b>{M}</b>.", monto=True)
sol_capital(46, ENUN["46"], 6, "a", 2, "a", 1440000, "El capital es <b>{C}</b> y el monto final es <b>{M}</b>.", monto=True)
story.append(PageBreak())

# ----- 47: comparación
cabecera(47, ENUN["47"])
paso(1, "Escribir los datos de las dos opciones")
story.append(tabla([["", "Opción A", "Opción B"],
                    ["Capital", "$3.000.000", "$3.000.000"],
                    ["Tasa", "1% mensual", "5% anual"],
                    ["Tiempo", "10 meses", "2 años"]], [4 * cm, 6.4 * cm, 6.4 * cm]))
sp(4)
paso(2, "Calcular el interés de la opción A (tasa mensual, tiempo en meses)")
linea("Tasa: 1% = 0,01. Unidades coinciden (meses con meses).")
linea("• El 1% de 3.000.000 es 3.000.000 ÷ 100 = <b>$30.000</b>: se ganan $30.000 cada mes.")
linea("• En 10 meses: 30.000 × 10 = <b>$300.000</b>.  (Fórmula: 3.000.000 × 0,01 × 10 = 300.000.)")
paso(3, "Calcular el interés de la opción B (tasa anual, tiempo en años)")
linea("Tasa: 5% = 0,05. Unidades coinciden (años con años).")
linea("• El 1% de 3.000.000 es <b>$30.000</b>; el 5% es 30.000 × 5 = <b>$150.000</b> cada año.")
linea("• En 2 años: 150.000 × 2 = <b>$300.000</b>.  (Fórmula: 3.000.000 × 0,05 × 2 = 300.000.)")
paso(4, "Comparar")
story.append(tabla([["", "Interés", "Monto final"],
                    ["Opción A", "$300.000", "$3.300.000"], ["Opción B", "$300.000", "$3.300.000"]], [4 * cm, 6.4 * cm, 6.4 * cm]))
sp(4)
resp("Las dos opciones producen <b>exactamente lo mismo: $300.000 de interés</b>. Es un <b>empate</b>: ninguna produce más dinero.")
comprueba("¿Por qué empatan? 1% mensual × 10 meses = 10% en total; 5% anual × 2 años = 10% en total. Las dos aplican el mismo 10% "
          "sobre el mismo capital ✔. Otra forma: 1% mensual equivale a 12% anual, mucho más que 5% anual, pero la opción A dura solo 10 meses.")
story.append(box(["★ <b>Ojo:</b> una tasa más pequeña no significa peor negocio. Hay que mirar <b>tasa × tiempo</b>. "
                  "Si Daniel dejara la opción A durante 2 años (24 meses), ganaría 24% = $720.000."],
                 colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
RES[47] = "Empate: $300.000 en cada opción"
sp(6)

# ----- 48
cabecera(48, ENUN["48"])
paso(1, "Escribir los datos de las dos opciones")
story.append(tabla([["", "Opción A", "Opción B"],
                    ["Capital a financiar", "$6.000.000", "$6.000.000"],
                    ["Tasa", "1,2% mensual", "7% anual"],
                    ["Tiempo", "8 meses", "1 año"]], [4 * cm, 6.4 * cm, 6.4 * cm]))
sp(4)
paso(2, "Interés de la opción A (mensual, en meses)")
linea("Tasa: 1,2% = 0,012. Unidades coinciden.")
linea("• El 1% de 6.000.000 es 6.000.000 ÷ 100 = <b>$60.000</b>.")
linea("• Como es 1,2%: 60.000 × 1,2 = 72.000  (60.000 × 12 = 720.000 y 720.000 ÷ 10 = 72.000). Se pagan <b>$72.000 cada mes</b>.")
linea("• En 8 meses: 72.000 × 8 = <b>$576.000</b>.  (Fórmula: 6.000.000 × 0,012 × 8 = 576.000.)")
paso(3, "Interés de la opción B (anual, en años)")
linea("Tasa: 7% = 0,07. Unidades coinciden (1 año).")
linea("• El 1% es $60.000; el 7% es 60.000 × 7 = <b>$420.000</b> cada año.")
linea("• En 1 año: 420.000 × 1 = <b>$420.000</b>.  (Fórmula: 6.000.000 × 0,07 × 1 = 420.000.)")
paso(4, "Comparar")
story.append(tabla([["", "Interés que se paga", "Total a devolver"],
                    ["Opción A", "$576.000", "$6.576.000"], ["Opción B", "$420.000", "$6.420.000"]], [4 * cm, 6.4 * cm, 6.4 * cm]))
sp(4)
paso(5, "Decidir")
linea("La opción con menos interés es la más económica. 420.000 es menor que 576.000. La diferencia es 576.000 − 420.000 = <b>$156.000</b>.")
resp("La <b>opción B (7% anual durante 1 año)</b> es la más económica: paga $420.000 de interés, es decir $156.000 menos que la opción A.")
comprueba("A paga 1,2% × 8 = 9,6% del capital en total. B paga 7% × 1 = 7% del capital. Como 7% es menor que 9,6%, B es más barata ✔.")
story.append(box(["★ <b>Ojo:</b> la opción B dura más tiempo (12 meses frente a 8). Si se compara el mismo periodo de 8 meses, B costaría "
                  "7% × 8/12 ≈ 4,67% (unos $280.000), aún más barata. En la opción A, la tasa mensual parece pequeña (1,2%) pero equivale a 14,4% anual (1,2% × 12), "
                  "el doble que el 7% anual de la opción B."], colors.HexColor("#fef9c3"), colors.HexColor("#eab308")))
RES[48] = "Más económica: B ($420.000 vs $576.000)"
sp(6)
story.append(PageBreak())

sol_tasa(49, ENUN["49"], 6000000, 360000, 1, "a", "a",
         "La inversión debe ofrecer una tasa anual del <b>{r}%</b>.", pre=True, M_dado=6360000,
         tip="Cuando dan el dinero que quieren tener al final (monto), primero se resta el capital para saber el interés.")

# ----- 50
cabecera(50, ENUN["50"])
paso(1, "Escribir los datos")
datos([["Capital (C)", "$8.000.000", "Dinero que se pidió prestado."],
       ["Tasa (i)", "1% mensual", "Porcentaje que se aplica cada mes."],
       ["Monto (M)", "$8.640.000", "Deuda total después de cierto tiempo (capital + interés)."],
       ["Incógnitas", "Interés (I) y tiempo (t)", "Debemos hallar los dos."]])
paso(2, "Hallar el interés")
linea("Sabemos que M = C + I, así que I = M − C = 8.640.000 − 8.000.000 = <b>$640.000</b>.")
paso(3, "Hallar el tiempo con t = I ÷ (C × i)")
linea("• Tasa: 1% = 1 ÷ 100 = 0,01. Tasa mensual, así que el tiempo saldrá en meses.")
linea("• El 1% de 8.000.000 es 8.000.000 ÷ 100 = <b>$80.000</b>. Como la tasa es 1%, se pagan $80.000 de interés cada mes.")
linea("• ¿Cuántos meses hacen falta para llegar a 640.000? 640.000 ÷ 80.000 = <b>8 meses</b>.")
resp("Se pagaron <b>$640.000</b> de interés y el préstamo estuvo vigente <b>8 meses</b>.")
comprueba("80.000 × 8 = 640.000 ✔ y 8.000.000 + 640.000 = 8.640.000 ✔ (es el monto del problema).")
RES[50] = "I = $640.000; t = 8 meses"
story.append(PageBreak())

# ------------------------------------------------------------------- CIERRE
banner("BLOQUE CIERRE · PIENSA COMO UN CONSUMIDOR FINANCIERO",
       "No siempre la tasa más pequeña significa automáticamente la mejor decisión: también importa el tiempo.", 6)


def reflexion(k, enun, paras):
    cabecera(k, enun)
    for t_ in paras:
        P(t_, "body")
    sp(4)


reflexion("R1", ENUN["R1"], [
    "Esta pregunta es personal: no hay una única respuesta correcta. Aquí tienes un ejemplo de cómo podrías responderla:",
    "<b>Respuesta modelo:</b> «El dato que me resulta más fácil identificar es el <b>capital</b>, porque es la cantidad de dinero que aparece "
    "primero en el problema y casi siempre tiene el signo $. El dato que más me cuesta es el <b>tiempo</b>, sobre todo cuando está en meses y la tasa "
    "es anual, porque tengo que acordarme de convertir (dividir los meses entre 12). Para no equivocarme, siempre subrayo la tasa y el tiempo "
    "con colores y reviso si terminan en «mensual» o «anual».»",
    "<b>Sugerencia:</b> mira qué pasos del método te salieron peor en este taller. Si fallaste en las unidades, ese es tu dato difícil."])
reflexion("R2", ENUN["R2"], [
    "<b>Capital (C):</b> es el dinero con el que se empieza. Si ahorras $1.000.000, ese es el capital. Es la cantidad que <i>pones</i> o que te <i>prestan</i>.",
    "<b>Interés (I):</b> es el dinero extra que se gana (si ahorras) o se paga (si te prestan). Es el «premio» o el «costo» por usar el dinero durante un tiempo. "
    "Si al final de 5 meses ganaste $100.000, ese es el interés.",
    "<b>Monto (M):</b> es el dinero total al final: capital más interés. Con los mismos números, el monto sería $1.000.000 + $100.000 = $1.100.000.",
    "<b>Ejemplo con una alcancía:</b> metes $50.000 (capital); al cabo de un tiempo el banco te regala $5.000 (interés); al abrirla tienes $55.000 (monto). "
    "Fórmula que las une: <b>M = C + I</b>."])
reflexion("R3", ENUN["R3"], [
    "Porque la tasa dice <b>cada cuánto tiempo</b> se aplica el porcentaje. Un 2% mensual se cobra 12 veces al año (y equivale a 24% anual); "
    "un 2% anual se cobra una sola vez al año. Confundirlos cambia el resultado enormemente.",
    "<b>Ejemplo:</b> $1.000.000 durante 1 año. Al 2% mensual: 1.000.000 × 0,02 × 12 = <b>$240.000</b>. Al 2% anual: 1.000.000 × 0,02 × 1 = <b>$20.000</b>. "
    "¡Es doce veces más!",
    "Además, en la fórmula I = C × i × t la tasa y el tiempo deben estar en la misma unidad; si la tasa es mensual, t va en meses; "
    "si es anual, t va en años. Por eso, antes de calcular, se revisa (y, si hace falta, se convierte)."])
reflexion("R4", ENUN["R4"], [
    "Hay muchas respuestas posibles. Algunos ejemplos de la vida cotidiana:",
    "• <b>Un préstamo entre familiares:</b> tu tío te presta $200.000 para comprar una bicicleta y acuerdan que le devuelves un 2% más cada mes. Ese 2% sobre $200.000 es interés simple.",
    "• <b>Una alcancía-cooperativa escolar:</b> el curso deposita $500.000 en una cooperativa que paga 1% mensual durante 6 meses; gana $30.000.",
    "• <b>Comprar a cuotas:</b> una tienda vende un celular a crédito y cobra un recargo fijo cada mes sobre el valor inicial.",
    "• <b>Un negocio pequeño:</b> una tienda de barrio pide $1.000.000 para comprar mercancía y paga un interés mensual fijo.",
    "<b>Ejemplo completo:</b> «Mi mamá deposita $600.000 en la cooperativa al 1% mensual durante 5 meses. Interés = 600.000 × 0,01 × 5 = $30.000. "
    "Monto = $630.000.»"])
story.append(box(["<i>“Las matemáticas financieras nos ayudan a comprender el valor del dinero y a tomar decisiones más responsables.”</i>"],
                 colors.HexColor("#ecfeff"), colors.HexColor("#0891b2")))
story.append(PageBreak())

# ------------------------------------------------------------------- RESUMEN
P("Tabla resumen de respuestas", "h1")
P("Usa esta tabla para revisar rápidamente tus resultados. Si alguno no coincide, vuelve al problema y revisa las unidades (tasa mensual o anual).", "body")
rows = [["N.º", "Respuesta", "N.º", "Respuesta"]]
half = 25
for i in range(1, half + 1):
    a, b = i, i + half
    rows.append([str(a), RES[a], str(b), RES[b]])
story.append(tabla(rows, [1.1 * cm, 7.6 * cm, 1.1 * cm, 7.6 * cm]))

# ------------------------------------------------------------------- build
doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=2.2 * cm,
                      title="Solución detallada — Taller de Interés Simple, Grado 7°", author="Solución del taller")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=deco)])
doc.build(story)
print("OK ->", OUT)
for k in sorted(RES, key=lambda z: (isinstance(z, str), z if isinstance(z, int) else 0)):
    print(k, RES[k])
