# -*- coding: utf-8 -*-
"""
generar_pdf_p2.py - Generador de PDF para los cuadernillos del BANCO PROPIO de P2.

Estilo editorial IDEA (replica la identidad de js/cuadernillo-pdf-original.js):
  - A4, banda negra superior + franja DORADA (#FBBF24)
  - fondo marfil (#FEF9F3), rojo de marca (#E11D48), tinta (#0F0F12), gris (#787882)
  - portada con logo + "Instrumento IDEA · Cuadernillo de prueba" + area/grado/periodo
    + card con nº de preguntas y duración + indicaciones generales
  - contraportada "FIN DEL CUADERNILLO" + créditos a la AUTORÍA IDEA (banco propio)

Produce, por cada cuadernillo *_p2_2023_PROPIO.json:
  - _cuadernillos_pdf_web/<id>.pdf      (SIN marcar claves)
  - _cuadernillos_pdf_claves/<id>.pdf   (marca la opción correcta + etiqueta "Clave: X")
  - copia del PDF "web" a assets/cuadernillos-pdf/<id>.pdf (servido por la plataforma)

Uso:
    python scripts/generar_pdf_p2.py          # genera todos
    python scripts/generar_pdf_p2.py mat 5    # genera solo un area/grado (filtro opcional)

Requiere reportlab (ya instalado). Se ejecuta desde la raíz idea-plataforma-firebase.
"""

import os
import re
import sys
import glob
import json
import html as _html
import shutil
import traceback

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
    Table, TableStyle, KeepTogether, FrameBreak, NextPageTemplate, PageBreak,)
from reportlab.platypus.flowables import HRFlowable, KeepInFrame
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth

# --------------------------------------------------------------------------- #
#  Rutas (todas relativas a la RAÍZ del proyecto = carpeta padre de scripts/)  #
# --------------------------------------------------------------------------- #
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, os.pardir))

DATOS_DIR = os.path.join(ROOT, "datos")
# Carpeta entregable única (reorganizada): contiene las dos subcarpetas de PDF.
_PDF_PARENT = os.path.join(ROOT, "CUADERNILLOS_P2_PDF")
DIR_WEB = os.path.join(_PDF_PARENT, "como-se-descargan-en-la-plataforma")
DIR_CLAVES = os.path.join(_PDF_PARENT, "con-todas-las-claves-correctas")
DIR_ASSETS_SERVED = os.path.join(ROOT, "assets", "cuadernillos-pdf")
LOGO_PATH = os.path.join(ROOT, "assets", "logo-idea.png")

PATRON_JSON = os.path.join(DATOS_DIR, "cuadernillo_*_p2_2023_PROPIO.json")

# --------------------------------------------------------------------------- #
#  Paleta IDEA                                                                 #
# --------------------------------------------------------------------------- #
C_ROJO = HexColor("#E11D48")
C_ROJO2 = HexColor("#C7163C")
C_DORADO = HexColor("#FBBF24")
C_NEGRO = HexColor("#0F0F12")
C_TINTA = HexColor("#1A1613")
C_GRIS = HexColor("#787882")
C_BLANCO = HexColor("#FFFFFF")
C_MARFIL = HexColor("#FEF9F3")
C_LECTURA_BG = HexColor("#FBF7F3")
C_TABLA_HEAD = HexColor("#F1ECE3")
C_VERDE = HexColor("#10B981")
C_VERDE_BG = HexColor("#E7F8F1")

PAGE_W, PAGE_H = A4
MARGEN_X = 18 * mm
MARGEN_TOP = 30 * mm      # deja espacio para el encabezado
MARGEN_BOTTOM = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGEN_X

# --------------------------------------------------------------------------- #
#  Estilos de párrafo                                                          #
# --------------------------------------------------------------------------- #
def _styles():
    base = ParagraphStyle("cuerpo", fontName="Helvetica", fontSize=10.5, leading=14.5,
        textColor=C_TINTA, alignment=TA_LEFT, spaceBefore=0, spaceAfter=4,)
    return {
        "cuerpo": base,
        "enun": ParagraphStyle("enun", parent=base, fontSize=11, leading=15.5,
                               spaceAfter=6),
        "lectura": ParagraphStyle("lectura", parent=base, fontSize=10.5, leading=15,
                                  leftIndent=2, spaceAfter=3),
        "opcion": ParagraphStyle("opcion", parent=base, fontSize=10.5, leading=14.5,
                                 leftIndent=16, firstLineIndent=-16, spaceAfter=2.5),
        "opcion_ok": ParagraphStyle("opcion_ok", parent=base, fontSize=10.5,
                                    leading=14.5, leftIndent=16, firstLineIndent=-16,
                                    spaceAfter=2.5, textColor=HexColor("#0B7A52"),
                                    fontName="Helvetica-Bold"),
        "num": ParagraphStyle("num", parent=base, fontName="Helvetica-Bold",
                              fontSize=15, leading=17, textColor=C_ROJO),
        "clave": ParagraphStyle("clave", parent=base, fontName="Helvetica-Bold",
                               fontSize=9.5, leading=12, textColor=C_VERDE,
                               spaceBefore=2, spaceAfter=2),
        "ctx_tit": ParagraphStyle("ctx_tit", parent=base, fontName="Helvetica-Bold",
                                 fontSize=13, leading=16, textColor=C_NEGRO,
                                 spaceAfter=4),
        "ctx_txt": ParagraphStyle("ctx_txt", parent=base, fontSize=10.5, leading=15,
                                  spaceAfter=4),
        "tabla": ParagraphStyle("tabla", parent=base, fontName="Helvetica",
                               fontSize=9.5, leading=12, alignment=TA_CENTER,
                               textColor=C_TINTA),
        "tabla_h": ParagraphStyle("tabla_h", parent=base, fontName="Helvetica-Bold",
                                 fontSize=9.5, leading=12, alignment=TA_CENTER,
                                 textColor=C_ROJO2),
        # Portada
        "eyebrow": ParagraphStyle("eyebrow", parent=base, fontName="Helvetica-Bold",
                                 fontSize=9.5, leading=12, alignment=TA_CENTER,
                                 textColor=C_DORADO),
        "titulo": ParagraphStyle("titulo", parent=base, fontName="Helvetica-Bold",
                                fontSize=30, leading=34, alignment=TA_CENTER,
                                textColor=C_NEGRO),
        "subtitulo": ParagraphStyle("subtitulo", parent=base, fontSize=15,
                                   leading=19, alignment=TA_CENTER, textColor=C_ROJO),
        "card_b": ParagraphStyle("card_b", parent=base, fontName="Helvetica-Bold",
                                fontSize=12.5, leading=16, alignment=TA_CENTER,
                                textColor=C_NEGRO),
        "card_r": ParagraphStyle("card_r", parent=base, fontSize=10.5, leading=14,
                                alignment=TA_CENTER, textColor=C_NEGRO),
        "ind_tit": ParagraphStyle("ind_tit", parent=base, fontName="Helvetica-Bold",
                                 fontSize=14, leading=18, textColor=C_NEGRO),
        "ind": ParagraphStyle("ind", parent=base, fontSize=11, leading=16,
                             leftIndent=18, firstLineIndent=-18, spaceAfter=8),
        "fin_grande": ParagraphStyle("fin_grande", parent=base,
                                    fontName="Helvetica-Bold", fontSize=24,
                                    leading=28, alignment=TA_CENTER, textColor=C_NEGRO),
        "fin_msg": ParagraphStyle("fin_msg", parent=base, fontSize=12, leading=18,
                                  alignment=TA_CENTER, textColor=C_NEGRO),
        "cred_tit": ParagraphStyle("cred_tit", parent=base, fontName="Helvetica-Bold",
                                  fontSize=11, leading=14, textColor=C_NEGRO),
        "cred": ParagraphStyle("cred", parent=base, fontSize=9, leading=13,
                              textColor=HexColor("#4D4D55")),
        "pie": ParagraphStyle("pie", parent=base, fontSize=8.5, leading=11,
                             alignment=TA_CENTER, textColor=C_GRIS),
    }


# --------------------------------------------------------------------------- #
#  Conversion LaTeX  \(... \)  ->  texto legible                              #
#  Vive en latex_texto.py: estaba duplicado palabra por palabra en los dos      #
#  generadores y los arreglos solo llegaban a uno.                              #
# --------------------------------------------------------------------------- #
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from latex_texto import _latex_a_texto  # noqa: E402


# --------------------------------------------------------------------------- #
#  Conversión HTML inline → markup de reportlab (Paragraph)                    #
#  Soporta: <b> <strong> <i> <em> <sub> <sup> <br>. Resto se descarta.         #
# --------------------------------------------------------------------------- #
def _inline_html_a_markup(frag):
    """Convierte un fragmento HTML inline a markup seguro de reportlab."""
    frag = _latex_a_texto(frag)
    # Normaliza saltos
    frag = re.sub(r"<\s*br\s*/?\s*>", "<br/>", frag, flags=re.I)
    # Mapea negritas/cursivas a tags soportados
    frag = re.sub(r"<\s*(strong|b)\s*>", "<b>", frag, flags=re.I)
    frag = re.sub(r"<\s*/\s*(strong|b)\s*>", "</b>", frag, flags=re.I)
    frag = re.sub(r"<\s*(em|i)\s*>", "<i>", frag, flags=re.I)
    frag = re.sub(r"<\s*/\s*(em|i)\s*>", "</i>", frag, flags=re.I)
    frag = re.sub(r"<\s*sup\s*>", "<super>", frag, flags=re.I)
    frag = re.sub(r"<\s*/\s*sup\s*>", "</super>", frag, flags=re.I)
    frag = re.sub(r"<\s*sub\s*>", "<sub>", frag, flags=re.I)
    frag = re.sub(r"<\s*/\s*sub\s*>", "</sub>", frag, flags=re.I)
    # Elimina cualquier otra etiqueta (span, div, etc.) conservando el texto
    frag = re.sub(r"<(?!/?(b|i|super|sub|br)\b)[^>]*>", "", frag, flags=re.I)
    # Colapsa espacios
    frag = re.sub(r"[ \t]+", " ", frag)
    return frag.strip()


def _decode_entities(s):
    return _html.unescape(s)


def _img_src(tag):
    m = re.search(r'src\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
    return m.group(1) if m else None


# --------------------------------------------------------------------------- #
#  Parser de enunciado HTML → lista de flowables                              #
#  Trocea el HTML en bloques: párrafos, tablas, imágenes, lecturas.           #
# --------------------------------------------------------------------------- #
def _img_flowable(src, max_w, st, max_h=None):
    """Crea un Image flowable escalado a max_w (y opcional max_h). None si falla."""
    if not src:
        return None
    path = os.path.join(ROOT, src.replace("/", os.sep))
    if not os.path.exists(path):
        return None
    try:
        from reportlab.lib.utils import ImageReader
        iw, ih = ImageReader(path).getSize()
        if iw <= 0 or ih <= 0:
            return None
        w = max_w
        h = w * ih / iw
        if max_h and h > max_h:
            h = max_h
            w = h * iw / ih
        img = Image(path, width=w, height=h)
        img.hAlign = "CENTER"
        return img
    except Exception:
        return None


def _tabla_a_flowable(tabla_html, st, max_w):
    """Convierte un <table>...</table> en un Table flowable IDEA."""
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tabla_html, flags=re.I | re.S)
    if not rows:
        return None
    data = []
    head_flags = []
    for r in rows:
        cells = re.findall(r"<t([hd])[^>]*>(.*?)</t[hd]>", r, flags=re.I | re.S)
        if not cells:
            continue
        row_cells = []
        is_head = False
        for kind, cell in cells:
            if kind.lower() == "h":
                is_head = True
            txt = _inline_html_a_markup(_decode_entities(cell))
            stl = st["tabla_h"] if kind.lower() == "h" else st["tabla"]
            row_cells.append(Paragraph(txt or "&nbsp;", stl))
        data.append(row_cells)
        head_flags.append(is_head)
    if not data:
        return None
    ncols = max(len(r) for r in data)
    for r in data:
        while len(r) < ncols:
            r.append(Paragraph("", st["tabla"]))
    # Ancho máximo de la tabla: limitado al contenido
    col_w = min(max_w, max(60 * mm, ncols * 26 * mm)) / ncols
    t = Table(data, colWidths=[col_w] * ncols, hAlign="CENTER")
    style = [
        ("GRID", (0, 0), (-1, -1), 0.8, C_ROJO2),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ]
    for i, hf in enumerate(head_flags):
        if hf:
            style.append(("BACKGROUND", (0, i), (-1, i), C_TABLA_HEAD))
    t.setStyle(TableStyle(style))
    return t


def _es_lectura(div_html):
    return "texto-lectura" in div_html or "background" in div_html.lower()


def enunciado_a_flowables(enun_html, st, max_w):
    """
    Convierte el enunciado HTML en una lista ordenada de flowables.
    Maneja <p>, <div class=texto-lectura>, <table>, <img>, <ul>/<ol>.
    """
    flows = []
    if not enun_html:
        return flows
    html_s = _decode_entities(enun_html)

    # Tokeniza por bloques de alto nivel preservando el orden:
    # capturamos <div ...>...</div>, <table>...</table>, <img ...>, <p>...</p>,
    # <ul>/<ol>...; lo demás se trata como párrafo suelto.
    token_re = re.compile(r"(<div\b[^>]*>.*?</div>)"
        r"|(<table\b[^>]*>.*?</table>)"
        r"|(<img\b[^>]*?/?>)"
        r"|(<ul\b[^>]*>.*?</ul>)"
        r"|(<ol\b[^>]*>.*?</ol>)"
        r"|(<p\b[^>]*>.*?</p>)",
        flags=re.I | re.S,)

    pos = 0
    pieces = []  # (tipo, contenido)
    for m in token_re.finditer(html_s):
        if m.start() > pos:
            resto = html_s[pos:m.start()].strip()
            if resto:
                pieces.append(("html", resto))
        if m.group(1):      # div (posible lectura)
            pieces.append(("div", m.group(1)))
        elif m.group(2):    # table
            pieces.append(("table", m.group(2)))
        elif m.group(3):    # img
            pieces.append(("img", m.group(3)))
        elif m.group(4) or m.group(5):  # listas
            pieces.append(("list", m.group(4) or m.group(5)))
        elif m.group(6):    # p
            pieces.append(("p", m.group(6)))
        pos = m.end()
    if pos < len(html_s):
        resto = html_s[pos:].strip()
        if resto:
            pieces.append(("html", resto))
    if not pieces:
        pieces = [("html", html_s)]

    def add_div(content):
        """Renderiza un <div>: extrae tablas/imgs internas en orden y el texto."""
        es_lect = _es_lectura(content)
        inner = re.sub(r"^<div\b[^>]*>|</div>$", "", content, flags=re.I | re.S)
        sub = enunciado_a_flowables(inner, st, max_w - (10 if es_lect else 0))
        if es_lect and sub:
            # Empaqueta el contenido de la lectura en una tabla con fondo marfil
            box = Table([[s] for s in sub], colWidths=[max_w - 4])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), C_LECTURA_BG),
                ("LINEBEFORE", (0, 0), (0, -1), 2.5, C_ROJO2),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            flows.append(box)
            flows.append(Spacer(1, 4))
        else:
            flows.extend(sub)

    for tipo, content in pieces:
        if tipo == "div":
            add_div(content)
        elif tipo == "table":
            t = _tabla_a_flowable(content, st, max_w)
            if t:
                flows.append(Spacer(1, 2))
                flows.append(t)
                flows.append(Spacer(1, 4))
        elif tipo == "img":
            src = _img_src(content)
            im = _img_flowable(src, min(max_w, 150 * mm), st, max_h=95 * mm)
            if im:
                flows.append(Spacer(1, 2))
                flows.append(im)
                flows.append(Spacer(1, 4))
        elif tipo == "list":
            items = re.findall(r"<li[^>]*>(.*?)</li>", content, flags=re.I | re.S)
            for it in items:
                txt = _inline_html_a_markup(it)
                if txt:
                    flows.append(Paragraph("•&nbsp; " + txt, st["lectura"]))
        elif tipo == "p":
            inner = re.sub(r"^<p\b[^>]*>|</p>$", "", content, flags=re.I | re.S)
            txt = _inline_html_a_markup(inner)
            if txt:
                flows.append(Paragraph(txt, st["enun"]))
        else:  # html suelto
            # ¿contiene img embebida?
            if "<img" in content.lower():
                add_div("<div>" + content + "</div>")
            else:
                txt = _inline_html_a_markup(content)
                if txt:
                    flows.append(Paragraph(txt, st["enun"]))
    return flows


# --------------------------------------------------------------------------- #
#  Dibujo del encabezado / pie (callback de página de contenido)              #
# --------------------------------------------------------------------------- #
class _Doc(BaseDocTemplate):
    def __init__(self, filename, meta, **kw):
        self.meta = meta
        super().__init__(filename, pagesize=A4,
                         leftMargin=MARGEN_X, rightMargin=MARGEN_X,
                         topMargin=MARGEN_TOP, bottomMargin=MARGEN_BOTTOM, **kw)
        self.page_count_offset = 0
        frame = Frame(MARGEN_X, MARGEN_BOTTOM, CONTENT_W,
                      PAGE_H - MARGEN_TOP - MARGEN_BOTTOM, id="cuerpo")
        # plantilla "portada/fin" sin encabezado; plantilla "contenido" con encabezado
        full = Frame(0, 0, PAGE_W, PAGE_H, id="full",
                     leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="plana", frames=[full]),
            PageTemplate(id="contenido", frames=[frame],
                         onPage=self._header_footer),
        ])

    def _header_footer(self, canv, doc):
        m = self.meta
        canv.saveState()
        # Banda negra superior con franja dorada
        canv.setFillColor(C_NEGRO)
        canv.rect(0, PAGE_H - 18 * mm, PAGE_W, 18 * mm, fill=1, stroke=0)
        canv.setFillColor(C_DORADO)
        canv.rect(0, PAGE_H - 18 * mm - 1.6, PAGE_W, 1.6, fill=1, stroke=0)
        # Texto del encabezado
        canv.setFillColor(C_DORADO)
        canv.setFont("Helvetica-Bold", 8)
        canv.drawString(MARGEN_X, PAGE_H - 9 * mm, "INSTRUMENTO IDEA")
        canv.setFillColor(C_BLANCO)
        canv.setFont("Helvetica", 8.5)
        titulo = "%s · Grado %s° · Período %s" % (m["area"], m["grado"], m["periodo"])
        canv.drawRightString(PAGE_W - MARGEN_X, PAGE_H - 9 * mm, titulo)
        if m.get("modo_claves"):
            canv.setFillColor(C_VERDE)
            canv.setFont("Helvetica-Bold", 7.5)
            canv.drawCentredString(PAGE_W / 2, PAGE_H - 14 * mm,
                                   "VERSIÓN CON RESPUESTAS")
        # Pie de página
        canv.setStrokeColor(C_GRIS)
        canv.setLineWidth(0.5)
        canv.line(MARGEN_X, MARGEN_BOTTOM - 4, PAGE_W - MARGEN_X, MARGEN_BOTTOM - 4)
        canv.setFillColor(C_GRIS)
        canv.setFont("Helvetica", 8)
        canv.drawString(MARGEN_X, MARGEN_BOTTOM - 13,
                        "Plataforma IDEA · Banco propio")
        canv.drawRightString(PAGE_W - MARGEN_X, MARGEN_BOTTOM - 13,
                             "Página %d" % doc.page)
        canv.restoreState()


# --------------------------------------------------------------------------- #
#  Portada                                                                     #
# --------------------------------------------------------------------------- #
def _logo_flowable(max_w=58 * mm, max_h=18 * mm):
    if not os.path.exists(LOGO_PATH):
        return None
    try:
        from reportlab.lib.utils import ImageReader
        iw, ih = ImageReader(LOGO_PATH).getSize()
        h = max_h
        w = h * iw / ih
        if w > max_w:
            w = max_w
            h = w * ih / iw
        img = Image(LOGO_PATH, width=w, height=h)
        img.hAlign = "CENTER"
        return img
    except Exception:
        return None


def _banda_negra_flowable(con_logo=True):
    """Banda negra superior (full-width) con logo o 'IDEA', como tabla de ancho total."""
    logo = _logo_flowable(max_w=60 * mm, max_h=13 * mm) if con_logo else None
    cell = logo if logo else Paragraph('<font color="#FFFFFF"><b>IDEA</b></font>',
        ParagraphStyle("l", fontName="Helvetica-Bold", fontSize=18,
                       alignment=TA_CENTER))
    t = Table([[cell]], colWidths=[PAGE_W], rowHeights=[20 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_NEGRO),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 2, C_DORADO),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def portada_flowables(d, st, modo_claves):
    f = []
    f.append(_banda_negra_flowable(con_logo=True))
    f.append(Spacer(1, 18 * mm))
    eyebrow = "INSTRUMENTO IDEA · CUADERNILLO DE PRUEBA"
    if modo_claves:
        eyebrow += " · CLAVE DEL DOCENTE"
    f.append(Paragraph(eyebrow, st["eyebrow"]))
    f.append(Spacer(1, 7 * mm))
    f.append(Paragraph(d["area"], st["titulo"]))
    f.append(Spacer(1, 3 * mm))
    f.append(Paragraph("Grado %s° · Período %s" % (d["grado"], d["periodo"]),
                       st["subtitulo"]))
    f.append(Spacer(1, 4 * mm))
    f.append(HRFlowable(width=42 * mm, thickness=1.5, color=C_DORADO,
                        spaceBefore=2, spaceAfter=2, hAlign="CENTER"))
    f.append(Spacer(1, 9 * mm))

    # Card dorada con datos
    npreg = d.get("num_preguntas") or len(d.get("preguntas", []))
    dur = d.get("tiempo_minutos") or d.get("duracion_minutos") or 60
    card_rows = [
        [Paragraph("%d preguntas · %d minutos recomendados" % (npreg, dur),
                   st["card_b"])],
        [Paragraph("Selecciona una única respuesta por pregunta", st["card_r"])],
    ]
    card = Table(card_rows, colWidths=[CONTENT_W - 20 * mm], hAlign="CENTER")
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_DORADO),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (0, 0), 12),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    f.append(card)
    f.append(Spacer(1, 16 * mm))

    # Indicaciones, en una TARJETA suave (fondo marfil + filete dorado) para darle peso
    # visual y equilibrar la portada (antes el texto suelto dejaba un gran hueco abajo).
    instr = d.get("instrucciones")
    if isinstance(instr, list) and instr:
        indicaciones = [str(x) for x in instr]
    else:
        indicaciones = [
            "Lee detenidamente cada pregunta antes de responder.",
            "Selecciona una única opción por pregunta (A, B, C o D).",
            "Si hay figura, tabla o lectura, obsérvala con atención.",
            "Administra tu tiempo con calma: todas las preguntas valen lo mismo.",
            "No es necesario que respondas en orden; puedes regresar a una pregunta.",
            "No se penalizan respuestas incorrectas: si dudas, intenta tu mejor opción.",
        ]
        if isinstance(instr, str) and instr.strip():
            indicaciones = [instr.strip()] + indicaciones[1:]
    ind_inner = [
        Paragraph("Indicaciones generales", st["ind_tit"]),
        HRFlowable(width=44, thickness=2.5, color=C_DORADO, spaceBefore=2, spaceAfter=9, hAlign="LEFT"),
    ]
    for i, t in enumerate(indicaciones, 1):
        ind_inner.append(Paragraph('<font color="#E11D48"><b>%d.</b></font>&nbsp; %s'
                                   % (i, _inline_html_a_markup(t)), st["ind"]))
    ind_card = Table([[ind_inner]], colWidths=[CONTENT_W], hAlign="CENTER")
    ind_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_MARFIL),
        ("LINEBEFORE", (0, 0), (0, -1), 3.5, C_DORADO),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
    ]))
    f.append(ind_card)

    f.append(Spacer(1, 16 * mm))
    f.append(HRFlowable(width=CONTENT_W, thickness=0.6, color=C_GRIS,
                        spaceBefore=2, spaceAfter=4, hAlign="CENTER"))
    f.append(Paragraph("Documento generado por la Plataforma IDEA · banco propio de ítems "
        "(autoría original).", st["pie"]))
    f.append(Paragraph("Instrumento de Interpretación de Datos para la Evaluación del Aprendizaje.",
        st["pie"]))
    f.append(Spacer(1, 1 * mm))
    f.append(NextPageTemplate("contenido"))
    f.append(PageBreak())
    return f


# --------------------------------------------------------------------------- #
#  Contraportada / créditos                                                    #
# --------------------------------------------------------------------------- #
def _texto_fuente(d):
    f = d.get("fuente") or d.get("nota")
    if f and isinstance(f, str) and f.strip():
        return f.strip()
    return ("Ítems de autoría propia · Plataforma IDEA, Instrumento de "
            "Interpretación de Datos para la Evaluación del Aprendizaje. "
            "Autor: Álvaro Raúl Córdoba Belalcázar.")


def contraportada_flowables(d, st):
    f = []
    f.append(NextPageTemplate("plana"))
    f.append(PageBreak())
    f.append(_banda_negra_flowable(con_logo=True))
    f.append(Spacer(1, 20 * mm))
    f.append(Paragraph("FIN DEL CUADERNILLO", st["eyebrow"]))
    f.append(Spacer(1, 8 * mm))
    f.append(Paragraph("Gracias por presentar la prueba", st["fin_grande"]))
    f.append(Spacer(1, 3 * mm))
    f.append(Paragraph("%s · Grado %s°" % (d["area"], d["grado"]),
                       ParagraphStyle("x", parent=st["subtitulo"], fontName="Helvetica-Oblique",
                                      fontSize=13)))
    f.append(Spacer(1, 4 * mm))
    f.append(HRFlowable(width=32 * mm, thickness=1.5, color=C_DORADO,
                        spaceBefore=2, spaceAfter=2, hAlign="CENTER"))
    f.append(Spacer(1, 8 * mm))
    for linea in [
        "Verifica que hayas respondido todas las preguntas",
        "antes de cerrar el cuadernillo o entregarlo.",
        " ",
        "Si presentaste la prueba en la plataforma IDEA,",
        "tu resultado estará disponible en tu panel del estudiante.",
    ]:
        f.append(Paragraph(linea, st["fin_msg"]))

    f.append(Spacer(1, 10 * mm))

    # Caja de créditos (autoría IDEA / banco propio)
    cred_inner = [
        [Paragraph("Créditos y fuente del material", st["cred_tit"])],
        [HRFlowable(width=36, thickness=1.5, color=C_DORADO,
                    spaceBefore=3, spaceAfter=5, hAlign="LEFT")],
        [Paragraph(_texto_fuente(d), st["cred"])],
        [Spacer(1, 5)],
        [Paragraph("El diseño editorial, la portada, la contraportada y las herramientas "
            "de análisis son propiedad de la Plataforma IDEA. Uso pedagógico. "
            "no comercializar.", st["cred"])],
    ]
    box = Table(cred_inner, colWidths=[CONTENT_W - 10 * mm], hAlign="CENTER")
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F2F2F4")),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (0, 0), 12),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
    ]))
    f.append(box)
    f.append(Spacer(1, 8 * mm))
    f.append(HRFlowable(width=CONTENT_W, thickness=0.6, color=C_GRIS,
                        spaceBefore=2, spaceAfter=4, hAlign="CENTER"))
    f.append(Paragraph("Plataforma IDEA · Cuadernillo de banco propio · Período II", st["pie"]))
    return f


# --------------------------------------------------------------------------- #
#  Bloque de contexto / lectura previa (Inglés y Lectura Crítica)             #
# --------------------------------------------------------------------------- #
def contexto_flowables(ctx, st):
    f = [Spacer(1, 3 * mm)]
    # Encabezado del contexto en banda dorada suave
    tit = ctx.get("titulo", "Lectura")
    rango = ctx.get("rango_preguntas")
    head = tit + (("  ·  Preguntas %s" % rango) if rango else "")
    bar = Table([[Paragraph(head, ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=12, textColor=C_NEGRO,
        leading=15))]], colWidths=[CONTENT_W])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_DORADO),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    # Cuerpo de la lectura (texto y/o imagen), en orden.
    cuerpo = []
    _credito = None
    texto = ctx.get("texto")
    if texto and texto.strip():
        # Prosa plana con párrafos separados por \n\n. El PRIMER párrafo es el TÍTULO (negrita +
        # centrado); un párrafo corto siguiente es subtítulo (centrado); los que tienen saltos de
        # línea internos son versos/poema (centrado); el resto, prosa. Igual que en la plataforma.
        _st_tit = ParagraphStyle("ctx_tit_c", parent=st["ctx_txt"], fontName="Helvetica-Bold",
                                 fontSize=12, leading=15, alignment=TA_CENTER, spaceAfter=5, textColor=C_NEGRO)
        _st_sub = ParagraphStyle("ctx_sub_c", parent=st["ctx_txt"], fontName="Helvetica-Oblique",
                                 alignment=TA_CENTER, textColor=C_GRIS, spaceAfter=5)
        _st_ver = ParagraphStyle("ctx_ver_c", parent=st["ctx_txt"], alignment=TA_CENTER, leading=15)
        _paras = [p.strip() for p in re.split(r"\n\s*\n", texto.strip()) if p.strip()]
        # El ULTIMO parrafo de una lectura con pieza grafica suele ser la linea de credito.
        # Se aparta para que viaje PEGADA a la imagen y no quede en medio de la prosa.
        if ctx.get("imagen") and len(_paras) > 1 and re.search(r"(los derechos pertenecen|uso educativo|recuperad[oa] de|tomado |adaptado de"
                r"|elaboración propia|elaboracion propia|reproducid[ao] del)", _paras[-1], re.I):
            _credito = _paras.pop()
        for _i, _para in enumerate(_paras):
            _safe = _html.escape(_para).replace("\n", "<br/>")
            _lns = [l.strip() for l in _para.split("\n") if l.strip()]
            _es_lista = len(_lns) >= 2 and sum(1 for l in _lns if re.match(r"^(\d+[.\)]|[•·*\--])\s", l)) >= (len(_lns) + 1) // 2
            if _i == 0:
                _estilo = _st_tit
            elif _es_lista:
                _estilo = st["ctx_txt"]  # lista numerada/vinetas -> izquierda, NO centrada
            elif "\n" in _para:
                _estilo = _st_ver
            elif _i == 1 and len(_para) <= 30 and _para[-1:] not in ".!?…»":
                _estilo = _st_sub
            else:
                _estilo = st["ctx_txt"]
            cuerpo.append(Paragraph(_safe, _estilo))
            cuerpo.append(Spacer(1, 4))
    img = ctx.get("imagen")
    if img:
        im = _img_flowable(img, min(CONTENT_W, 150 * mm), st, max_h=100 * mm)
        if im:
            cuerpo.append(Spacer(1, 3))
            cuerpo.append(im)
    if _credito:
        cuerpo.append(Spacer(1, 3))
        cuerpo.append(Paragraph(_html.escape(_credito), ParagraphStyle("ctx_cred", parent=st["ctx_txt"], fontName="Helvetica-Oblique", fontSize=8,
            leading=10.5, alignment=TA_CENTER, textColor=C_GRIS)))
    # La banda dorada de la lectura NO debe quedar huérfana al pie de una página: se mantiene
    # unida a su primer bloque de contenido (primer párrafo o la imagen). El resto fluye.
    if cuerpo:
        f.append(KeepTogether([bar, Spacer(1, 4), cuerpo[0]]))
        f.extend(cuerpo[1:])
    else:
        f.append(bar)
    f.append(Spacer(1, 4))
    f.append(HRFlowable(width=CONTENT_W, thickness=0.8, color=C_DORADO,
                        spaceBefore=2, spaceAfter=4, hAlign="CENTER"))
    return f


# --------------------------------------------------------------------------- #
#  Bloque de pregunta                                                          #
# --------------------------------------------------------------------------- #
LETRAS = ["A", "B", "C", "D", "E", "F", "G"]


def pregunta_flowables(q, st, modo_claves, max_w):
    inner = []
    clave = (q.get("clave") or "").strip().upper()
    pesada = False  # True si el enunciado trae tablas/imgs full-width (puede partir)

    # Número de pregunta como celda roja
    num = q.get("numero", "?")
    numbox = Table([[Paragraph(str(num), ParagraphStyle("n", fontName="Helvetica-Bold", fontSize=14, textColor=C_BLANCO,
        alignment=TA_CENTER, leading=16))]],
        colWidths=[9 * mm], rowHeights=[9 * mm])
    numbox.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_ROJO),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    # Enunciado: SOLO el primer bloque (normalmente el primer párrafo) va al lado
    # del número, en una tabla de 2 columnas. El resto del enunciado (tablas de
    # opciones, imágenes, párrafos extra) FLUYE a ancho completo debajo, donde sí
    # puede partirse entre páginas. Esto evita que un enunciado muy alto quede
    # atrapado en una celda de tabla no divisible (LayoutError de reportlab).
    # ESTRUCTURA CON FIGURA (indicación del dueño, 28-jul): un enunciado con imagen es un texto
    # DISCONTINUO y se lee en tres tiempos, contextualización → imagen → desenlace. El marcador
    # [[IMG]] señala dónde va la figura. Sin marcador, se conserva el orden de siempre.
    _partes_enun = str(q.get("enunciado", "")).split("[[IMG]]")
    _enun_pre = _partes_enun[0]
    _enun_post = "".join(_partes_enun[1:])
    enun_flows = enunciado_a_flowables(_enun_pre, st, max_w - 13 * mm)
    if not enun_flows:
        enun_flows = [Paragraph("(sin enunciado)", st["enun"])]
    primer = enun_flows[0]
    resto = enun_flows[1:]
    head = Table([[numbox, [primer]]],
                 colWidths=[11 * mm, max_w - 11 * mm])
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    # El encabezado (número + primer párrafo). NO se anida en KeepTogether: el KeepTogether
    # exterior de la pregunta ligera ya lo agrupa, y anidar KeepTogether hace que reportlab
    # mida mal la altura y deje una sola pregunta por página (huecos enormes).
    inner.append(head)
    inner.append(Spacer(1, 3))
    # Recalcula el resto del enunciado a ANCHO COMPLETO (sin la sangría del número)
    if resto:
        pesada = True
        resto_full = enunciado_a_flowables(_enun_pre, st, max_w)
        # descarta el primer bloque (ya mostrado al lado del número)
        inner.extend(resto_full[1:])
        inner.append(Spacer(1, 2))

    # Figura de la pregunta (más compacta que antes: 72 mm en vez de 95, para que dos
    # preguntas quepan en una página y no se generen huecos enormes).
    fig = q.get("imagen_figura")
    if fig:
        im = _img_flowable(fig, min(max_w, 125 * mm), st, max_h=72 * mm)
        if im:
            inner.append(im)
            inner.append(Spacer(1, 4))

    # Desenlace de la pregunta: va DESPUÉS de la figura (solo si el enunciado trae [[IMG]]).
    # NO se marca la pregunta como "pesada": el desenlace es corto y debe viajar JUNTO con su
    # figura. Marcarla pesada permitía que el enunciado se partiera de su imagen entre páginas,
    # que es peor que un hueco al pie (y el hueco lo rellenan las opciones, que fluyen aparte).
    if _enun_post.strip():
        inner.extend(enunciado_a_flowables(_enun_post, st, max_w))
        inner.append(Spacer(1, 2))

    # Opciones (se acumulan aparte de `inner`: el enunciado+figura se mantienen juntos,
    # pero las opciones FLUYEN para rellenar el pie de página en preguntas altas).
    opts = []
    opciones = q.get("opciones") or {}
    opc_imgs = q.get("opciones_imagenes") or {}
    letras = [l for l in LETRAS if l in opciones or l in opc_imgs]
    if not letras:
        letras = sorted(set(list(opciones.keys()) + list(opc_imgs.keys())))

    # REJILLA 2x2 para opciones ilustradas (mismo criterio que la prueba en pantalla): cuatro
    # imágenes apiladas una por fila ocupaban casi dos páginas y dejaban media hoja en blanco,
    # además de partir la etiqueta de su imagen. En 2x2 se ven las cuatro a la vez, que es como
    # se comparan de verdad, y el pliego queda sin huecos.
    _solo_img = (len(opc_imgs) == 4 and len(letras) == 4
                 and not any(str((opciones or {}).get(L, "")).strip() for L in letras))
    if _solo_img:
        _celdas = []
        for letra in letras:
            _ok = modo_claves and letra == clave
            _lbl = Paragraph('<font color="#E11D48"><b>%s.</b></font>%s' % (letra, ' <font color="#0B7A52"><b>(correcta)</b></font>' if _ok else ''),
                st["opcion_ok"] if _ok else st["opcion"])
            _im = _img_flowable(opc_imgs[letra], (max_w - 26 * mm) / 2, st, max_h=46 * mm)
            _celdas.append([_lbl] + ([_im] if _im else []))
        _grid = Table([[_celdas[0], _celdas[1]], [_celdas[2], _celdas[3]]],
                      colWidths=[(max_w - 10) / 2] * 2)
        _est = [("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]
        if modo_claves and clave in letras:
            _i = letras.index(clave)
            _est.append(("BACKGROUND", (_i % 2, _i // 2), (_i % 2, _i // 2), C_VERDE_BG))
        _grid.setStyle(TableStyle(_est))
        opts.append(_grid)
        letras = []

    for letra in letras:
        es_correcta = modo_claves and letra == clave
        st_op = st["opcion_ok"] if es_correcta else st["opcion"]
        marca = " ✔" if es_correcta else ""
        if letra in opc_imgs:
            # Opción ilustrada: etiqueta + imagen
            label = Paragraph(('<font color="#E11D48"><b>%s.</b></font>%s' %
                 (letra, (' <font color="#0B7A52"><b>(correcta)</b></font>'
                          if es_correcta else ''))),
                st_op)
            opim = _img_flowable(opc_imgs[letra], min(max_w - 16 * mm, 70 * mm),
                                 st, max_h=42 * mm)
            cells = [label]
            if opim:
                cells.append(opim)
            # Si además hay texto en opciones, añádelo
            if opciones.get(letra):
                cells.append(Paragraph(_inline_html_a_markup(opciones[letra]), st_op))
            row = Table([[c] for c in cells], colWidths=[max_w - 16])
            row.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ] + ([("BACKGROUND", (0, 0), (-1, -1), C_VERDE_BG)] if es_correcta else [])))
            # La etiqueta nunca debe quedar sola al pie con su imagen en la página siguiente.
            opts.append(KeepTogether(row))
        elif "<table" in str(opciones.get(letra, "")).lower():
            # La OPCIÓN es una tabla (p.ej. math-7 q6/q7): se renderiza como tabla, no como texto.
            _lbl = Paragraph('<font color="#E11D48"><b>%s.</b></font>%s' % (letra, ' <font color="#0B7A52"><b>(correcta)</b></font>' if es_correcta else ''), st_op)
            _tbl = _tabla_a_flowable(str(opciones[letra]), st, max_w - 16)
            _cells = [_lbl] + ([_tbl] if _tbl else [])
            _row = Table([[c] for c in _cells], colWidths=[max_w - 16])
            _row.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ] + ([("BACKGROUND", (0, 0), (-1, -1), C_VERDE_BG)] if es_correcta else [])))
            opts.append(_row)
        else:
            txt = _inline_html_a_markup(str(opciones.get(letra, "")))
            p = Paragraph('<font color="#E11D48"><b>%s.</b></font>&nbsp; %s%s'
                % (letra, txt, ('<font color="#0B7A52"><b>  ✔</b></font>'
                                if es_correcta else '')),
                st_op)
            if es_correcta:
                wrap = Table([[p]], colWidths=[max_w])
                wrap.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), C_VERDE_BG),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]))
                opts.append(wrap)
            else:
                opts.append(p)

    # Etiqueta de clave (solo versión con respuestas), va con las opciones
    if modo_claves and clave:
        opts.append(Spacer(1, 2))
        opts.append(Paragraph("Clave: %s" % clave, st["clave"]))

    opts.append(Spacer(1, 4.5 * mm))

    # Estrategia de salto de página (objetivo: MÍNIMO espacio en blanco):
    #  - Pregunta PESADA (tablas/imágenes full-width en el enunciado): TODO fluye, sin
    #    KeepTogether, para poder partir entre páginas sin LayoutError (celda no divisible).
    #  - Pregunta con FIGURA (imagen_figura): el enunciado+figura se mantienen juntos en
    #    un KeepTogether, pero las OPCIONES fluyen aparte. Así una pregunta alta arranca al
    #    pie de una página y sigue en la siguiente, rellenando el hueco en vez de saltar entera.
    #  - Pregunta LIGERA (solo texto): todo junto en KeepTogether (es corta, no genera hueco).
    # Opciones "ricas" (tablas o imágenes como opción): son altas y deben FLUIR, no quedar
    # atrapadas en un KeepTogether que haría saltar la pregunta entera y dejar un hueco.
    opts_ricas = bool(opc_imgs) or any("<table" in str(v).lower() or "<img" in str(v).lower()
                                       for v in (q.get("opciones") or {}).values())
    if pesada:
        return inner + opts
    if fig or opts_ricas:
        return [KeepTogether(inner)] + opts
    return [KeepTogether(inner + opts)]


# --------------------------------------------------------------------------- #
#  Construcción de un cuadernillo (web o claves)                              #
# --------------------------------------------------------------------------- #
def construir_pdf(d, out_path, modo_claves):
    st = _styles()
    meta = {
        "area": d.get("area", ""),
        "grado": d.get("grado", ""),
        "periodo": d.get("periodo", "II"),
        "modo_claves": modo_claves,
    }
    doc = _Doc(out_path, meta)
    doc.title = "IDEA · Cuadernillo %s %s° P%s" % (d.get("area"), d.get("grado"), d.get("periodo"))
    doc.author = "Plataforma IDEA"

    story = []
    story.extend(portada_flowables(d, st, modo_claves))

    contextos = d.get("contextos") or {}
    preguntas = d.get("preguntas") or []
    contexto_emitido = set()

    for q in preguntas:
        cid = q.get("contexto_id")
        if cid and cid in contextos and cid not in contexto_emitido:
            story.extend(contexto_flowables(contextos[cid], st))
            contexto_emitido.add(cid)
        try:
            story.extend(pregunta_flowables(q, st, modo_claves,
                                            CONTENT_W))
        except Exception as e:
            story.append(Paragraph("Pregunta %s: error al renderizar (%s)" % (q.get("numero"), e),
                st["cuerpo"]))

    story.extend(contraportada_flowables(d, st))
    doc.build(story)
    return doc.page


# --------------------------------------------------------------------------- #
#  Main                                                                        #
# --------------------------------------------------------------------------- #
def main(argv):
    filtro_area = argv[0].lower() if len(argv) >= 1 else None
    filtro_grado = argv[1] if len(argv) >= 2 else None

    for d in (DIR_WEB, DIR_CLAVES, DIR_ASSETS_SERVED):
        os.makedirs(d, exist_ok=True)

    archivos = sorted(glob.glob(PATRON_JSON))
    if not archivos:
        print("No se encontraron JSON en %s" % PATRON_JSON)
        return 1

    total_pdfs = 0
    total_paginas = 0
    errores = []
    ok_ids = []

    for ruta in archivos:
        base = os.path.basename(ruta)
        # cuadernillo_<area>_<g>_p2_2023_PROPIO.json
        m = re.match(r"cuadernillo_([a-z]+)_(\w+)_p2_2023_PROPIO\.json", base)
        if not m:
            continue
        area_slug, grado = m.group(1), m.group(2)
        if filtro_area and area_slug != filtro_area:
            continue
        if filtro_grado and grado != filtro_grado:
            continue

        try:
            with open(ruta, "r", encoding="utf-8") as fh:
                d = json.load(fh)
        except Exception as e:
            errores.append("%s: no se pudo leer JSON (%s)" % (base, e))
            continue

        cid = d.get("id") or base.replace(".json", "")
        web_path = os.path.join(DIR_WEB, cid + ".pdf")
        claves_path = os.path.join(DIR_CLAVES, cid + ".pdf")

        try:
            p1 = construir_pdf(d, web_path, modo_claves=False)
            p2 = construir_pdf(d, claves_path, modo_claves=True)
            # copia a assets servidos (versión web)
            shutil.copyfile(web_path, os.path.join(DIR_ASSETS_SERVED, cid + ".pdf"))
            total_pdfs += 2
            total_paginas += (p1 + p2)
            ok_ids.append((cid, p1, p2))
            print("  OK  %-26s  web=%dp  claves=%dp" % (cid, p1, p2))
        except Exception as e:
            errores.append("%s: %s" % (cid, e))
            traceback.print_exc()

    print("\n" + "=" * 64)
    print("RESUMEN")
    print("  Cuadernillos procesados : %d" % len(ok_ids))
    print("  PDFs generados          : %d  (%d web + %d claves)"
          % (total_pdfs, total_pdfs // 2, total_pdfs // 2))
    print("  Copias servidas         : %d  (assets/cuadernillos-pdf/)" % len(ok_ids))
    print("  Páginas totales         : %d" % total_paginas)
    print("  Errores                 : %d" % len(errores))
    for e in errores:
        print("    - " + e)
    print("=" * 64)
    return 0 if not errores else 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
