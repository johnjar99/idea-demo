// export-pdf.js — Reportes PDF profesionales con jsPDF + html2canvas.
//
// Tres exportaciones:
//   - exportarReporteGrupoPDF: 10 páginas para el docente (Fase II)
//   - exportarConsolidadoPDF:  consolidado institucional para directivo/funcionario
//   - exportarPlanMejoraPDF:   Plan de Mejora (Fase II)
//
// Paleta IDEA, jsPDF.roundedRect, header/footer en cada página, capturas con html2canvas scale 3.

import {
  promedioGrupo, correctasPorPreguntaGrupo, calcularNivel, COLOR_NIVEL,
  logroGrupoPor, logroPorCompetencia, logroPorAfirmacion, logroPorEvidencia, logroPorCMC, logroPorDimensionSecundaria
} from './calculo.js';
import { kpiGrupo, conclusionesProfundas, estudiantesEnRiesgo, histogramaPuntajes, proyeccionSaber11Parcial,
         kr20, indiceDificultadPorPregunta, discriminacionPorPregunta, errorEstandarMedida, analisisDistractores } from './analisis.js';
import { configArea, tieneDimensionSecundaria, valorDimSecundaria, ordenCategoriasDim, etiquetasMarco, panelesVisibles, codigoAfirmacion, semaforoDesempeno } from './area-config.js';
import { formatDate } from './utils.js';
import { THEME } from './tema.js';
import { cargarLibsPDF } from './cargar-libs.js';
// Capa pedagogica por grado: el export precarga el cache para ser autonomo (conclusionesProfundas
// es sincrono y la lee de cache). Si el JSON falta, el cache queda {} y se usa el fallback por area.
import { cargarPedagogiaGrado } from './pedagogia-grado.js';

// Paleta del PDF derivada de THEME (single source of truth).
// Las claves se mantienen para compatibilidad con el código existente.
const C = {
  negro:       THEME.pdf.color.ink900,    // textos principales editorial
  grafito:     THEME.pdf.color.ink700,
  rojo:        THEME.pdf.color.brand600,
  rojoClaro:   [238, 107, 126],            // brand-400
  dorado:      THEME.pdf.color.gold500,
  doradoOscuro:THEME.pdf.color.gold600,
  cielo:       THEME.pdf.color.info600,
  menta:       THEME.pdf.color.ok600,
  uva:         [124, 92, 168],
  blanco:      THEME.pdf.color.paper,
  marfil:      THEME.pdf.color.ink50,
  bajo:        THEME.pdf.color.err600,
  basico:      THEME.pdf.color.warn600,
  alto:        THEME.pdf.color.ok600,
  superior:    THEME.pdf.color.gold600,
  gris:        THEME.pdf.color.ink500,
  grisClaro:   THEME.pdf.color.ink100,
  zebra:       THEME.pdf.color.zebra,
  ink200:      THEME.pdf.color.ink200,
  ink300:      THEME.pdf.color.ink300
};

// Color de NIVEL (semáforo ICFES): BAJO rojo · BÁSICO naranja · ALTO amarillo · SUPERIOR verde.
// Dedicado: separado de C.alto/C.superior que se usan como acentos genéricos (verde/dorado).
const RGB_NIVEL = { bajo: [239, 68, 68], basico: [245, 158, 11], alto: [251, 191, 36], superior: [16, 185, 129] };
function rgbNivel(nivel) { return RGB_NIVEL[(nivel || '').toLowerCase().replace('á', 'a')] || C.gris; }

function jsPDFFactory() { return window.jspdf?.jsPDF || window.jsPDF; }

async function loadLogoBase64() {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      cv.getContext('2d').drawImage(img, 0, 0);
      try {
        const dataUrl = cv.toDataURL('image/png');
        // v9: tambien retorna el aspect ratio para que el embeber respete proporciones
        resolve({ dataUrl, ratio: img.width / img.height });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = 'assets/logo-idea.png';
  });
}

// Helpers de niveles → tuplas RGB (fg para texto/border, bg para fondo claro del chip)
function hexFillForNivel(nivel) {
  const k = (nivel || '').toUpperCase();
  if (k === 'BAJO')      return { fg: THEME.pdf.color.err600,  bg: THEME.pdf.color.err100 };
  if (k === 'BÁSICO' || k === 'BASICO') return { fg: THEME.pdf.color.warn600, bg: THEME.pdf.color.warn100 };
  if (k === 'ALTO')      return { fg: THEME.pdf.color.gold600, bg: THEME.pdf.color.gold100 };
  if (k === 'SUPERIOR')  return { fg: THEME.pdf.color.ok600,   bg: THEME.pdf.color.ok100 };
  return { fg: THEME.pdf.color.ink500, bg: THEME.pdf.color.ink100 };
}

// Header v11.9 RESTAURADO: banda negra superior con logo + título + paginación dorada.
function dibujarHeader(doc, titulo, pagina, total, logo) {
  const w = doc.internal.pageSize.getWidth();
  // Banda negra 20mm
  doc.setFillColor(...C.negro);
  doc.rect(0, 0, w, 20, 'F');
  // Franja dorada hairline al pie de la banda
  doc.setFillColor(...C.dorado);
  doc.rect(0, 20, w, 0.6, 'F');
  // Logo blanco
  if (logo) {
    try {
      const src = logo.dataUrl || logo;
      const r = logo.ratio || 1;
      const w14 = Math.min(14, 14 * r);
      const h14 = w14 / r;
      doc.addImage(src, 'PNG', 6, 3 + (14 - h14) / 2, w14, h14);
    } catch (e) {}
  }
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('IDEA', 24, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(titulo, 24, 14);
  doc.setFontSize(8);
  doc.setTextColor(...C.dorado);
  doc.text(`Página ${pagina} de ${total}`, w - 6, 11, { align: 'right' });
  doc.setTextColor(...C.negro);
}

// Footer v11.9 RESTAURADO: hairline + copy + huella temporal.
function dibujarFooter(doc) {
  const h = doc.internal.pageSize.getHeight();
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(220, 220, 224);
  doc.line(15, h - 12, w - 15, h - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 130);
  doc.text('© Instrumento IDEA · Álvaro R. Córdoba B. · raulcordmath@gmail.com', 15, h - 7);
  const ahora = new Date();
  const huella = ahora.toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(2);
  doc.text(`Generado: ${formatDate(ahora.toISOString())} · IDEA#${huella}`, w - 15, h - 7, { align: 'right' });
  doc.setTextColor(...C.negro);
}

// Título de sección v11.9 RESTAURADO: helvetica bold grande + subtítulo gris pequeño.
function tituloPagina(doc, texto, subtitulo) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.negro);
  doc.text(texto, 15, 32);
  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(120, 120, 130);
    doc.text(subtitulo, 15, 38);
    doc.setTextColor(...C.negro);
  }
}

// Muestra temporalmente, FUERA DE PANTALLA, cualquier ancestro del elemento que
// esté oculto (display:none, p. ej. una pestaña/vista no activa), captura, y restaura.
// html2canvas sobre un elemento oculto da un canvas 0x0 y rompe el PDF; esto lo evita.
async function _conElementoVisible(el, fn) {
  const restauros = [];
  let node = el;
  while (node && node !== document.body && node.nodeType === 1) {
    if (getComputedStyle(node).display === 'none') {
      restauros.push([node, node.getAttribute('style')]);
      node.style.setProperty('display', 'block', 'important');
      node.style.setProperty('position', 'absolute', 'important');
      node.style.setProperty('left', '-100000px', 'important');
      node.style.setProperty('top', '0', 'important');
      node.style.setProperty('width', '980px', 'important');
      node.style.setProperty('max-width', 'none', 'important');
    }
    node = node.parentElement;
  }
  // Neutralizar animaciones/transiciones: el animate-fade-in se REINICIA al des-ocultar
  // y html2canvas lo capturaría a media opacidad (PDF tenue/incompleto). Forzar opacidad
  // plena y sin transform en todo el subárbol durante la captura.
  el.classList.add('pdf-capturando');
  const styleAnim = document.createElement('style');
  styleAnim.textContent = '.pdf-capturando, .pdf-capturando *{animation:none !important;transition:none !important;opacity:1 !important;transform:none !important;filter:none !important;}';
  document.head.appendChild(styleAnim);
  // Llevar los gráficos Chart.js a su estado FINAL sin animación, para que no salgan a medias.
  try {
    if (window.Chart && window.Chart.getChart) {
      el.querySelectorAll('canvas').forEach(c => { const ch = window.Chart.getChart(c); if (ch) { ch.resize(); ch.update('none'); } });
    }
  } catch (_) {}
  await new Promise(r => setTimeout(r, 450));
  try { return await fn(); }
  finally {
    el.classList.remove('pdf-capturando');
    styleAnim.remove();
    for (const [n, prev] of restauros) {
      if (prev === null) n.removeAttribute('style'); else n.setAttribute('style', prev);
    }
  }
}

// Captura un elemento (aunque esté en una pestaña oculta) y lo coloca en una página
// nueva, escalado para que TODO quepa y se vea como en pantalla.
async function agregarSeccionComoPagina(doc, el, titulo, logo, num, total) {
  doc.addPage();
  dibujarHeader(doc, 'Reporte institucional consolidado', num, total, logo);
  tituloPagina(doc, titulo, '');
  if (!el) { dibujarFooter(doc); return; }
  await _conElementoVisible(el, async () => {
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
      if (canvas.width > 0 && canvas.height > 0) {
        const w = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const yTop = 46, availW = w - 20, availH = pageH - yTop - 22;
        let imgW = availW, imgH = (canvas.height / canvas.width) * imgW;
        if (imgH > availH) { imgH = availH; imgW = (canvas.width / canvas.height) * imgH; }
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', (w - imgW) / 2, yTop, imgW, imgH);
      }
    } catch (e) { console.warn('sección PDF omitida:', e?.message || e); }
  });
  dibujarFooter(doc);
}

async function capturarElementoEnPDF(doc, el, x, y, anchoMm) {
  if (!el) return 0;
  return await _conElementoVisible(el, async () => {
    let h = 0;
    try {
      const canvas = await html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', logging: false });
      if (canvas.width > 0 && canvas.height > 0) {
        h = (canvas.height / canvas.width) * anchoMm;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, anchoMm, h);
      }
    } catch (e) { console.warn('captura PDF omitida:', e?.message || e); }
    return h;
  });
}

// v11.9: paginación RENDER-PER-PAGE — la única forma realmente robusta de no cortar filas.
// En lugar de cortar un canvas grande en franjas, agrupamos las filas en bloques que CABEN
// en cada página y renderizamos cada bloque como una tabla independiente. Cada página
// captura su propio canvas que incluye thead automáticamente. Imposible cortar mid-fila.
async function capturarTablaPaginadaEnPDF(doc, el, x, yIni, anchoMm, opciones = {}) {
  if (!el) return { paginasExtras: 0, yFinal: yIni };

  const h = doc.internal.pageSize.getHeight();
  const espacioReservadoFooter = 24;
  const margenTop = 48;
  const SAFETY_MM = 6;

  const altoDisponiblePrimera = h - yIni - espacioReservadoFooter - SAFETY_MM;
  const altoSubsiguiente = h - margenTop - espacioReservadoFooter - SAFETY_MM;

  // Medir alturas en mm a partir del DOM original
  const elRect = el.getBoundingClientRect();
  const mmPorPx = anchoMm / elRect.width;
  const theadEl = el.querySelector('thead');
  const theadHmm = theadEl ? theadEl.getBoundingClientRect().height * mmPorPx : 0;

  const allRows = Array.from(el.querySelectorAll('tbody tr'));
  if (allRows.length === 0) {
    const canvasFull = await html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', logging: false });
    const altoMm = (canvasFull.height / canvasFull.width) * anchoMm;
    doc.addImage(canvasFull.toDataURL('image/png'), 'PNG', x, yIni, anchoMm, altoMm);
    return { paginasExtras: 0, yFinal: yIni + altoMm };
  }

  const rowHmm = allRows.map(tr => tr.getBoundingClientRect().height * mmPorPx);
  const altoTotalMm = theadHmm + rowHmm.reduce((a, b) => a + b, 0);

  // Si cabe todo en la primera página, captura simple
  if (altoTotalMm <= altoDisponiblePrimera) {
    const canvasFull = await html2canvas(el, { scale: 2.5, backgroundColor: '#ffffff', logging: false });
    const altoMm = (canvasFull.height / canvasFull.width) * anchoMm;
    doc.addImage(canvasFull.toDataURL('image/png'), 'PNG', x, yIni, anchoMm, altoMm);
    return { paginasExtras: 0, yFinal: yIni + altoMm };
  }

  // Agrupar filas en páginas: cada página = thead + sus filas. Nunca se corta una fila.
  const pagesIndices = [];
  let currentPage = [];
  let currentHeightMm = theadHmm;
  let pageLimit = altoDisponiblePrimera;

  for (let i = 0; i < allRows.length; i++) {
    const rh = rowHmm[i];
    if (currentHeightMm + rh > pageLimit && currentPage.length > 0) {
      pagesIndices.push(currentPage);
      currentPage = [];
      currentHeightMm = theadHmm;
      pageLimit = altoSubsiguiente;
    }
    currentPage.push(i);
    currentHeightMm += rh;
  }
  if (currentPage.length > 0) pagesIndices.push(currentPage);

  // Render cada página
  let paginasExtras = 0;
  for (let pageIdx = 0; pageIdx < pagesIndices.length; pageIdx++) {
    const indexSet = new Set(pagesIndices[pageIdx]);

    // Clonar tabla con solo las filas de esta página
    const tablaClone = el.cloneNode(true);
    const tbodyClone = tablaClone.querySelector('tbody');
    if (tbodyClone) {
      const cloneRows = Array.from(tbodyClone.querySelectorAll('tr'));
      cloneRows.forEach((tr, idx) => {
        if (!indexSet.has(idx)) tr.remove();
      });
    }

    // Renderizar fuera de pantalla
    const cont = document.createElement('div');
    cont.style.position = 'fixed';
    cont.style.left = '-99999px';
    cont.style.top = '0';
    cont.style.background = 'white';
    cont.style.padding = '12px';
    cont.style.width = (el.offsetWidth + 24) + 'px';
    cont.appendChild(tablaClone);
    document.body.appendChild(cont);

    let yDestino;
    if (pageIdx === 0) {
      yDestino = yIni;
    } else {
      doc.addPage();
      paginasExtras++;
      if (opciones.dibujarHeaderFn) opciones.dibujarHeaderFn();
      yDestino = margenTop;
    }

    try {
      const pageCanvas = await html2canvas(tablaClone, { scale: 2.5, backgroundColor: '#ffffff', logging: false });
      const pageHmm = (pageCanvas.height / pageCanvas.width) * anchoMm;
      doc.addImage(pageCanvas.toDataURL('image/png'), 'PNG', x, yDestino, anchoMm, pageHmm);
    } finally {
      document.body.removeChild(cont);
    }
  }

  return { paginasExtras, yFinal: margenTop };
}

async function capturarCanvasEnPDF(doc, canvasEl, x, y, anchoMm) {
  if (!canvasEl) return 0;
  try {
    const dataUrl = canvasEl.toDataURL('image/png');
    const h = (canvasEl.height / canvasEl.width) * anchoMm;
    doc.addImage(dataUrl, 'PNG', x, y, anchoMm, h);
    return h;
  } catch (e) { return 0; }
}

// =========================================================
// 1) REPORTE DE GRUPO — 10 páginas
// =========================================================

export async function exportarReporteGrupoPDF(aplicaciones, cuadernillo, contexto) {
  await cargarLibsPDF();
  await cargarPedagogiaGrado();  // asegura la capa por grado antes del analisis sincrono
  const jsPDF = jsPDFFactory();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const logo = await loadLogoBase64();
  const total = 10;
  const titulo = `${cuadernillo.area} · ${contexto.grado}° ${contexto.grupo} · Período ${cuadernillo.periodo}`;
  const kpi = kpiGrupo(aplicaciones);
  const conclusiones = conclusionesProfundas(aplicaciones, cuadernillo);
  const enRiesgo = estudiantesEnRiesgo(aplicaciones, cuadernillo);
  const nivelGrupo = calcularNivel(kpi?.promedio || 0);

  // ====== PÁGINA 1 — PORTADA v11.9 RESTAURADA (banda + dorado + card institucional + KPI grande) ======
  let p = 1;
  dibujarHeader(doc, titulo, p, total, logo);
  doc.setFillColor(...C.marfil);
  doc.rect(0, 20, w, h - 20, 'F');

  // Separadores decorativos dorados
  doc.setDrawColor(...C.dorado);
  doc.setLineWidth(0.4);
  doc.line(20, 75, w - 20, 75);
  doc.line(20, 200, w - 20, 200);
  doc.setLineWidth(0.2);

  // Logo grande centrado
  if (logo && logo.dataUrl) {
    try {
      const targetH = 32;
      const targetW = targetH * (logo.ratio || 1.22);
      doc.addImage(logo.dataUrl, 'PNG', w/2 - targetW/2, 40, targetW, targetH);
    } catch (e) {}
  }

  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Reporte de Resultados', w/2, 82, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor(...C.rojo);
  doc.text(`${cuadernillo.area} — Grado ${contexto.grado}°`, w/2, 92, { align: 'center' });

  // Card dorada con datos institucionales
  doc.setFillColor(...C.dorado);
  doc.roundedRect(25, 105, w - 50, 36, 5, 5, 'F');
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(contexto.institucion || 'Institución', w/2, 114, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Sede ${contexto.sede || '—'} · Grupo ${contexto.grupo}`, w/2, 121, { align: 'center' });
  doc.text(`Período ${contexto.periodo} · ${aplicaciones.length} estudiantes evaluados`, w/2, 127, { align: 'center' });
  doc.text(formatDate(new Date().toISOString()), w/2, 133, { align: 'center' });

  // KPI grande coloreado por nivel (semáforo ICFES)
  doc.setFillColor(...rgbNivel(nivelGrupo));
  doc.roundedRect(w/2 - 50, 150, 100, 36, 6, 6, 'F');
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(38);
  doc.text(String(kpi?.promedio || 0), w/2 - 8, 174, { align: 'center' });
  doc.setFontSize(9);
  doc.text('PROMEDIO', w/2 - 8, 180, { align: 'center' });
  doc.setFontSize(13);
  doc.text(nivelGrupo, w/2 + 28, 172, { align: 'center' });
  doc.setFontSize(7);
  doc.text('NIVEL DEL GRUPO', w/2 + 28, 178, { align: 'center' });

  doc.setTextColor(...C.negro);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento generado por la plataforma IDEA — Fase II del ciclo pedagógico', w/2, 240, { align: 'center' });
  doc.text('Análisis y planeación · Uso restringido al docente y directivos de la institución', w/2, 246, { align: 'center' });
  dibujarFooter(doc);

  // ====== PÁGINA 2 — RESUMEN EJECUTIVO + DISTRIBUCIÓN DE NIVELES (combinado v13.2) ======
  doc.addPage(); p++;
  dibujarHeader(doc, titulo, p, total, logo);
  tituloPagina(doc, 'Resumen ejecutivo', 'Indicadores clave + distribución del grupo');

  // 4 KPIs v11.9 RESTAURADOS: cards de color sólido con valor grande blanco + emoji
  const kpiCards = [
    { titulo: 'Estudiantes',    valor: kpi?.total || 0,                  color: C.cielo, icono: '👥' },
    { titulo: 'Promedio',       valor: kpi?.promedio || 0,               color: rgbNivel(nivelGrupo), icono: '📊' },
    { titulo: 'En BAJO',        valor: kpi?.en_bajo || 0,                color: C.bajo, icono: '🚨' },
    { titulo: 'Alto+Superior',  valor: kpi?.en_alto_o_superior || 0,     color: C.alto, icono: '⭐' }
  ];
  const kpiY = 48;
  kpiCards.forEach((card, i) => {
    const x = 15 + i * 46;
    doc.setFillColor(...card.color);
    doc.roundedRect(x, kpiY, 41, 28, 4, 4, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(card.valor), x + 20.5, kpiY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(card.titulo, x + 20.5, kpiY + 22, { align: 'center' });
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.negro);
  // Compatibilidad con el resto de página 2: kpiH equivale al alto v11.9 (28)
  const kpiH = 28;

  // Diagnóstico narrativo COMPLETO (sin truncar — usa todo el ancho de página)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.negro);
  doc.text('Diagnóstico del grupo', 15, kpiY + kpiH + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const txtDiagFull = conclusiones.diagnostico.replace(/<[^>]+>/g, '');
  // Usamos todo el ancho disponible (w-30) sin truncar. Si es muy largo, baja el
  // tamaño de fuente para que quepa hasta ~10 líneas.
  const lineHeightDiag = 4.4;
  let txtDiag = doc.splitTextToSize(txtDiagFull, w - 30);
  if (txtDiag.length > 10) {
    doc.setFontSize(8);
    txtDiag = doc.splitTextToSize(txtDiagFull, w - 30);
  }
  doc.text(txtDiag, 15, kpiY + kpiH + 16);

  // Calcular y donde empieza distribución (después del diagnóstico completo)
  const diagAlto = txtDiag.length * lineHeightDiag;
  let yDist = kpiY + kpiH + 16 + diagAlto + 8;

  // Sub-título "Distribución de niveles" + donut MÁS COMPACTO (lado izquierdo) + tabla (lado derecho)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.negro);
  doc.text('Distribución de niveles del grupo', 15, yDist);
  yDist += 4;

  // Contar niveles
  const niveles = { BAJO: 0, 'BÁSICO': 0, ALTO: 0, SUPERIOR: 0 };
  aplicaciones.forEach(a => { niveles[a.nivel] = (niveles[a.nivel] || 0) + 1; });
  const totalAlumnos = aplicaciones.length || 1;
  const rangosNivel = { BAJO: '0 - 59', 'BÁSICO': '60 - 78', ALTO: '79 - 90', SUPERIOR: '91 - 100' };

  // Layout horizontal: donut izquierda 70mm + tabla derecha 110mm
  const donut = document.getElementById('chart-niveles-donut');
  const donutW = 70;
  if (donut) {
    await capturarCanvasEnPDF(doc, donut, 15, yDist, donutW);
  }

  // Tabla a la derecha del donut
  const tablaX = 15 + donutW + 5;
  const tablaW = w - 15 - tablaX;
  const colNivelX = tablaX + 4, colEstudX = tablaX + 38, colPctX = tablaX + 62, colRangoX = tablaX + 86;
  let yTab = yDist;
  doc.setFillColor(...C.grafito);
  doc.rect(tablaX, yTab, tablaW, 8, 'F');
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('NIVEL', colNivelX, yTab + 5.5);
  doc.text('ESTUD.', colEstudX, yTab + 5.5);
  doc.text('%', colPctX, yTab + 5.5);
  doc.text('RANGO', colRangoX, yTab + 5.5);
  yTab += 8;
  const altoFila = 9;
  Object.entries(niveles).forEach(([nivel, cant], idx) => {
    const pct = Math.round((cant / totalAlumnos) * 100);
    const colorNivel = rgbNivel(nivel);
    doc.setFillColor(idx % 2 ? 250 : 255, idx % 2 ? 251 : 255, idx % 2 ? 254 : 255);
    doc.rect(tablaX, yTab, tablaW, altoFila, 'F');
    doc.setFillColor(...colorNivel);
    doc.rect(tablaX, yTab, 3, altoFila, 'F');
    doc.setTextColor(...C.negro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(nivel, colNivelX, yTab + 6);
    doc.setTextColor(...colorNivel);
    doc.setFontSize(11);
    doc.text(String(cant), colEstudX + 6, yTab + 6.5);
    doc.setTextColor(...C.negro);
    doc.setFontSize(9);
    doc.text(`${pct}%`, colPctX, yTab + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gris);
    doc.text(rangosNivel[nivel] + 'pts', colRangoX, yTab + 6);
    doc.setDrawColor(220, 220, 224);
    doc.setLineWidth(0.2);
    doc.line(tablaX, yTab + altoFila, tablaX + tablaW, yTab + altoFila);
    yTab += altoFila;
  });
  // Fila TOTAL compacta
  doc.setFillColor(...C.dorado);
  doc.rect(tablaX, yTab, tablaW, 8, 'F');
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', colNivelX, yTab + 5.5);
  doc.setFontSize(10);
  doc.text(String(totalAlumnos), colEstudX + 6, yTab + 6);
  doc.setFontSize(9);
  doc.text('100%', colPctX, yTab + 5.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Todos', colRangoX, yTab + 5.5);

  dibujarFooter(doc);

  // ====== PÁGINA 4 — TABLA ACIERTOS/DESACIERTOS (v11: clon sin columna ACCIÓN + fuente más legible) ======
  doc.addPage(); p++;
  let paginaActual = p;
  dibujarHeader(doc, titulo, p, total, logo);
  tituloPagina(doc, 'Tabla de aciertos y desaciertos', 'Matriz completa estudiantes × preguntas');
  const tabla = document.getElementById('tabla-aciertos');
  if (tabla) {
    // v11: clonar la tabla, quitar la última columna (Acción / botón mensaje) y subir font-size
    const clon = tabla.cloneNode(true);
    clon.querySelectorAll('tr').forEach(tr => {
      const cells = tr.children;
      if (cells.length > 0) {
        const last = cells[cells.length - 1];
        // El header tiene 'Acción' o vacío, el body tiene el botón 💬
        last.parentNode.removeChild(last);
      }
    });
    // Mejorar legibilidad: forzar font-size mayor en el clon
    clon.style.fontSize = '13px';
    clon.querySelectorAll('td, th').forEach(c => {
      c.style.padding = '6px 4px';
      c.style.fontSize = '12px';
    });
    clon.querySelectorAll('td.nombre').forEach(c => { c.style.fontSize = '12px'; c.style.fontWeight = '600'; });
    // Renderizar el clon fuera de pantalla para que html2canvas lo capture
    const contenedor = document.createElement('div');
    contenedor.style.position = 'fixed';
    contenedor.style.left = '-9999px';
    contenedor.style.top = '0';
    contenedor.style.background = 'white';
    contenedor.style.padding = '12px';
    contenedor.style.width = '1400px';
    contenedor.appendChild(clon);
    document.body.appendChild(contenedor);
    try {
      await capturarTablaPaginadaEnPDF(doc, clon, 10, 46, w - 20, {
        dibujarHeaderFn: () => {
          paginaActual++;
          dibujarHeader(doc, titulo, paginaActual, total, logo);
          tituloPagina(doc, 'Tabla de aciertos y desaciertos', '');
        }
      });
      p = paginaActual;
    } finally {
      document.body.removeChild(contenedor);
    }
  }
  dibujarFooter(doc);

  // v13.2: Sección "Desglose pedagógico" SUPRIMIDA por solicitud del usuario.
  // Se mantienen las variables que las secciones posteriores necesitan.
  const cfgAreaPDF = configArea(cuadernillo);
  const ET_PDF = etiquetasMarco(cuadernillo);
  const PV_PDF = panelesVisibles(cuadernillo);
  const _hayDim2PDF = tieneDimensionSecundaria(cuadernillo);
  const _labelDim2PDF = cfgAreaPDF.dimension_secundaria?.etiqueta_corta || '';

  // === Bloque DESGLOSE PEDAGÓGICO eliminado (suprimido por feedback v13.2) ===
  /* INICIO suprimido
  doc.addPage(); p++;
  paginaActual = p;
  dibujarHeader(doc, titulo, p, total, logo);
  tituloPagina(doc, 'Desglose pedagógico', ...);

  // Helper para cortar texto sin que se pase del ancho dado.
  // v11: ahora respeta el estilo de fuente real (bold/normal) porque jsPDF mide ancho según el font activo.
  const splitText = (txt, maxW, fontSize, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(txt || '—', maxW);
  };
  // Color por competencia POR POSICIÓN (no por clave fija a/b/c): así funciona para LC (1/2/3),
  // Inglés (a–e) o cualquier estructura, igual que el panel web.
  const COMP_PAL_PDF = [[59, 130, 246], [245, 158, 11], [225, 29, 72], [16, 185, 129], [139, 92, 246], [20, 184, 166], [234, 88, 12]];
  const _compKeysPDF = Object.keys(cuadernillo.competencias || {});
  const colorComp = (letra) => { const i = _compKeysPDF.indexOf(String(letra)); return i >= 0 ? COMP_PAL_PDF[i % COMP_PAL_PDF.length] : [100, 116, 139]; };

  let yD = 46;
  const preguntas = cuadernillo.preguntas || [];
  // Render cada pregunta como una card con info completa
  // Semáforo empírico por pregunta (mismo helper que usa el panel docente).
  // Cortes únicos en toda la plataforma: <35 rojo, 35-65 ámbar, ≥65 verde.
  const _correctasPDF = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const _totalPDF = aplicaciones.length || 1;
  for (const pq of preguntas) {
    const compLetra = pq.competencia.charAt(0);
    const compNombre = cuadernillo.competencias?.[compLetra] || '';
    const afirTxt = cuadernillo.afirmaciones?.[pq.afirmacion] || '';
    const evidTxt = cuadernillo.evidencias?.[pq.evidencia] || '';
    const colC = colorComp(compLetra);
    // Semáforo empírico de desempeño del grupo en esta pregunta
    const _idxPq = preguntas.indexOf(pq);
    const _pctPq = Math.round((_correctasPDF[_idxPq] / _totalPDF) * 100);
    const _semPq = semaforoDesempeno(_pctPq);
    // Convertir hex del semáforo a [R,G,B] para jsPDF
    const _hexToRgb = (h) => { const m = h.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [100,116,139]; };
    const colorDif = _hexToRgb(_semPq.color);
    const labelDif = _semPq.label;

    // v11: queEval se renderiza en BOLD → medir en bold (antes se medía en normal y desbordaba al chip ALTA/MEDIA/BAJA)
    // Chip va de w-36 a w-19; queEval empieza en x=36 → ancho seguro = w - 36 - (36+4) = w - 76 con margen de 4mm
    const queEval = splitText(pq.que_evalua, w - 80, 9, true);
    const compL = splitText(compNombre, w - 80, 8);
    const afirL = splitText(afirTxt, w - 80, 8);
    const evidL = splitText(evidTxt, w - 80, 8);
    // Alturas con más margen para evitar overlap en todas las preguntas.
    // Sumar solo las secciones visibles para evitar espacios en blanco en las
    // cards de áreas que ocultan dimensiones (Inglés oculta Competencia y Evidencia).
    const hHeader = 6 + queEval.length * 4.2 + 5;
    const hComp = PV_PDF.competencia !== false ? (Math.max(compL.length * 4, 5) + 3) : 0;
    const hAfir = PV_PDF.afirmacion !== false ? (Math.max(afirL.length * 4, 5) + 3) : 0;
    const hEvid = PV_PDF.evidencia !== false ? (Math.max(evidL.length * 4, 5) + 3) : 0;
    const hCmc = _hayDim2PDF ? (5 + 5) : 0;
    const altoNecesario = hHeader + hComp + hAfir + hEvid + hCmc + 6;

    // Si no cabe en la página, nueva página
    if (yD + altoNecesario > h - 25) {
      doc.addPage(); paginaActual++; p = paginaActual;
      dibujarHeader(doc, titulo, p, total, logo);
      tituloPagina(doc, 'Desglose pedagógico', 'Detalle por pregunta');
      yD = 46;
      dibujarFooter(doc);
    }

    // v10c: cinta lateral del color de competencia (sin borde rectangular que cruce el texto)
    doc.setFillColor(...colC);
    doc.rect(15, yD, 4, altoNecesario - 3, 'F');
    // Fondo sutil de la card
    doc.setFillColor(252, 252, 254);
    doc.rect(19, yD, w - 34, altoNecesario - 3, 'F');

    // Número grande (círculo del color de competencia)
    doc.setFillColor(...colC);
    doc.circle(28, yD + 7, 5, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(pq.numero), 28, yD + 8.5, { align: 'center' });

    // ¿Qué evalúa? - empieza después del círculo y NO se extiende a la zona del chip
    doc.setTextColor(...C.negro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(queEval, 36, yD + 6);

    // Chip dificultad - posicionado a la derecha al MISMO nivel del header, NO encima del texto
    doc.setFillColor(...colorDif);
    doc.roundedRect(w - 36, yD + 3, 17, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFontSize(7);
    // Chip compacto con etiqueta semáforo unificada: ALTO / MEDIO / BAJO
    doc.setFillColor(...colorDif);
    doc.roundedRect(w - 36, yD + 3, 17, 6, 1.5, 1.5, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFontSize(7);
    doc.text(labelDif, w - 27.5, yD + 7, { align: 'center' });

    let yInner = yD + hHeader + 1;

    // Competencia (o "Parte" en Inglés) con código + nombre + color — solo si visible
    if (PV_PDF.competencia !== false) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...colC);
      doc.text(`${ET_PDF.competencia_codigo} ${compLetra}.`, 24, yInner);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.negro);
      doc.text(compL, 56, yInner);
      yInner += hComp;
    }

    // Afirmación (o "Nivel" en Inglés) con código + nombre completo — solo si visible
    if (PV_PDF.afirmacion !== false) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text(`${ET_PDF.afirmacion_codigo} ${codigoAfirmacion(cuadernillo, pq.afirmacion)}:`, 24, yInner);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.negro);
      doc.text(afirL, 56, yInner);
      yInner += hAfir;
    }

    // Evidencia (o "Habilidad" en Inglés) con código + nombre completo — solo si visible
    if (PV_PDF.evidencia !== false) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 33, 168);
      doc.text(`${ET_PDF.evidencia_codigo} ${pq.evidencia}:`, 24, yInner);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.negro);
      doc.text(evidL, 56, yInner);
      yInner += hEvid;
    }

    // Dimensión secundaria (CMC en MAT, Componente en CN, MCER en Inglés) — solo si el área la tiene
    if (_hayDim2PDF) {
      const _valDim2 = valorDimSecundaria(pq, cuadernillo) || '—';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`${_labelDim2PDF}:`, 24, yInner);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.negro);
      doc.text(_valDim2, 56, yInner);
    }

    yD += altoNecesario + 2;
  }
  dibujarFooter(doc);
  FIN suprimido */

  // ====== ALINEACIÓN CURRICULAR MBE (layout adaptativo v13.2: 1/2/3/4 dimensiones) ======
  // Construir mapa competencia->afirmaciones->evidencias desde preguntas
  const mapaCAE10 = {};
  const mapaCmcComp10 = {};
  (cuadernillo.preguntas || []).forEach(pq => {
    const cc = pq.competencia.charAt(0);
    mapaCAE10[cc] = mapaCAE10[cc] || { afir: new Set(), evid: new Set() };
    mapaCAE10[cc].afir.add(String(pq.afirmacion));
    mapaCAE10[cc].evid.add(String(pq.evidencia));
    const _dv = valorDimSecundaria(pq, cuadernillo);  // cmc / componente / nivel_mcer según el área
    if (_dv) mapaCmcComp10[_dv] = cc;
  });
  const compDeAfirPDF = (a) => { for (const [c, m] of Object.entries(mapaCAE10)) if (m.afir.has(String(a))) return c; return null; };
  const compDeEvidPDF = (e) => { for (const [c, m] of Object.entries(mapaCAE10)) if (m.evid.has(String(e))) return c; return null; };
  const _compKeysRGB = Object.keys(cuadernillo.competencias || {});
  const _PAL_RGB = [[59,130,246],[245,158,11],[225,29,72],[16,185,129],[139,92,246],[20,184,166],[234,88,12]];
  const colCompRGB = (c) => { const i = _compKeysRGB.indexOf(String(c)); return i >= 0 ? _PAL_RGB[i % _PAL_RGB.length] : [100,116,139]; };

  // Logros calculados
  const logCompA = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  const logAfirA = logroGrupoPor(logroPorAfirmacion, aplicaciones, cuadernillo);
  const logEvidA = logroGrupoPor(logroPorEvidencia, aplicaciones, cuadernillo);
  const logCmcA  = logroGrupoPor(logroPorCMC, aplicaciones, cuadernillo);

  // v11: dibujar UN bloque con GRÁFICO ARRIBA (grande) + TABLA ABAJO (ancho completo, fuente legible).
  // Cada bloque ocupa una página entera con su propio header.
  const dibujarBloqueAlineacion = async (yStart, titulo_, canvasId, items) => {
    // Título de la dimensión
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.negro);
    doc.text(titulo_, 15, yStart);
    doc.setDrawColor(...C.dorado);
    doc.setLineWidth(0.7);
    doc.line(15, yStart + 1.5, 55, yStart + 1.5);
    doc.setLineWidth(0.2);

    // Chart grande arriba (ancho completo, alto 80mm)
    const chartW = w - 30;          // 180mm aprox
    const chartH = 80;              // alto suficiente para que se lea cada barra
    const canvasEl = document.getElementById(canvasId);
    if (canvasEl) {
      try { await capturarCanvasEnPDF(doc, canvasEl, 15, yStart + 5, chartW); } catch (e) {}
    }

    // Tabla DEBAJO del gráfico (ancho completo)
    const tablaY = yStart + 5 + chartH + 4;
    const lx = 15;
    const lw = w - 30;
    // Header de la tabla
    doc.setFillColor(...C.grafito);
    doc.rect(lx, tablaY, lw, 7, 'F');
    doc.setTextColor(...C.blanco);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CÓD', lx + 3, tablaY + 5);
    doc.text('TÍTULO COMPLETO', lx + 38, tablaY + 5);
    doc.text('%', lx + lw - 5, tablaY + 5, { align: 'right' });

    let yL = tablaY + 7;
    items.forEach((it, idx) => {
      const valor = it.valor;
      // Semáforo unificado plataforma: <35 rojo, 35-65 ámbar, ≥65 verde
      const _semL = semaforoDesempeno(valor);
      const _hexL = _semL.color.replace('#','');
      const colorPct = [parseInt(_hexL.slice(0,2),16), parseInt(_hexL.slice(2,4),16), parseInt(_hexL.slice(4,6),16)];
      const tituloLines = doc.splitTextToSize(it.titulo || '—', lw - 50);
      const altoFila = Math.max(8, tituloLines.length * 4 + 3);
      // Fondo alternado
      if (idx % 2 === 0) { doc.setFillColor(250, 251, 253); doc.rect(lx, yL, lw, altoFila, 'F'); }
      // Borde inferior fino
      doc.setDrawColor(220, 220, 224);
      doc.setLineWidth(0.2);
      doc.line(lx, yL + altoFila, lx + lw, yL + altoFila);
      // Dot color + código
      doc.setFillColor(...it.color);
      doc.circle(lx + 4, yL + 4, 1.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...it.color);
      doc.text(it.codigo, lx + 8, yL + 5);
      // Título completo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.negro);
      doc.text(tituloLines, lx + 38, yL + 4.5);
      // Porcentaje
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colorPct);
      doc.text(`${valor}%`, lx + lw - 3, yL + 5, { align: 'right' });
      yL += altoFila;
    });
    return yL + 6;
  };

  // v11: cada dimensión MBE ocupa una página completa con su gráfico grande + tabla legible debajo.
  // v12: la página de competencias se OMITE si el área tiene UNA SOLA (Lectura Crítica)
  // porque la información es redundante con el promedio global del grupo. La riqueza
  // diagnóstica de LC vive en las afirmaciones (página siguiente).
  // Color del marco DCE (espeja la lógica del panel web docente):
  //  - paleta asignada POR AFIRMACIÓN (orden numérico del marco) para colores estables;
  //  - una competencia toma el color de SU primera afirmación (así comparte color con ellas);
  //  - VARIAS competencias → afir/evid se colorean por su competencia (mismos pocos colores);
  //  - UNA sola competencia (ej. LC primaria) → afir/evid por afirmación (panel no monocromo).
  // Esto también corrige el bug previo de llaves fijas a/b/c (LC con competencias 1/2/3 caía a gris).
  const _PAL_RGB_DCE = [[59,130,246],[245,158,11],[139,92,246],[16,185,129],[236,72,153],[6,182,212],[132,204,22],[239,68,68]];
  const _afirKeysOrden = Object.keys(cuadernillo.afirmaciones || {}).sort((a,b)=>+a-+b);
  const COLOR_BY_AFIR_PDF = {}; _afirKeysOrden.forEach((k,i)=>{ COLOR_BY_AFIR_PDF[String(k)] = _PAL_RGB_DCE[i % _PAL_RGB_DCE.length]; });
  const _afirsDeCompPDF = (c) => Object.entries(mapaCAE10).find(([cc]) => cc === String(c));
  const _primeraAfirDeComp = (c) => { const e = _afirsDeCompPDF(c); if (!e) return null; return [...e[1].afir].sort((a,b)=>+a-+b)[0]; };
  const COLOR_BY_COMP_PDF = {}; Object.keys(cuadernillo.competencias || {}).forEach(c => { const fa = _primeraAfirDeComp(c); COLOR_BY_COMP_PDF[c] = (fa != null && COLOR_BY_AFIR_PDF[String(fa)]) || [100,116,139]; });
  const _unaCompPDF = Object.keys(cuadernillo.competencias || {}).length <= 1;
  const _colAfirPDF = (k) => _unaCompPDF ? (COLOR_BY_AFIR_PDF[String(k)] || [100,116,139]) : (COLOR_BY_COMP_PDF[compDeAfirPDF(k)] || [100,116,139]);
  const _colEvidPDF = (k) => { if (_unaCompPDF) { const m = String(k).match(/^(\d+)/); return (m && COLOR_BY_AFIR_PDF[m[1]]) || [100,116,139]; } return COLOR_BY_COMP_PDF[compDeEvidPDF(k)] || [100,116,139]; };

  // v13.2 fix: compsOrden estaba definido dentro del Desglose suprimido; redefinir acá.
  // v13.5 fix: leer TODAS las keys del objeto competencias (no asumir 'a'..'g'),
  // así LC con competencias '1','2','3' u otras configuraciones también funcionan.
  const compsOrden = Object.keys(cuadernillo.competencias || {})
    .filter(k => cuadernillo.competencias[k])
    .sort((a, b) => {
      // Orden: numéricos primero (1, 2, 3), luego alfabéticos (a, b, c)
      const aN = parseInt(a), bN = parseInt(b);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      if (!isNaN(aN)) return -1;
      if (!isNaN(bN)) return 1;
      return a.localeCompare(b);
    });

  // v13.2: Layout ADAPTATIVO en UNA sola página según cuántas dimensiones haya:
  //   1 dim  → chart a la izquierda + tabla a la derecha (50/50)
  //   2 dims → 2 charts lado a lado (50/50), cada uno con su tabla compacta debajo
  //   3 dims → 2 arriba en fila (50/50) + 1 abajo centrada
  //   4 dims → grid 2x2
  // El layout es UN bloque por dimensión, donde cada bloque tiene chart + tabla.

  const _afirsUsadasPDF = new Set((cuadernillo.preguntas || []).map(p => String(p.afirmacion)));
  const _evidsUsadasPDF = new Set((cuadernillo.preguntas || []).map(p => String(p.evidencia)));

  // Construir la lista de dimensiones a renderizar (las visibles para el área)
  const dimensiones = [];

  if (compsOrden.length > 1 && PV_PDF.competencia !== false) {
    const itemsComp = compsOrden.map(k => ({
      codigo: `${k}.`,
      titulo: cuadernillo.competencias[k],
      valor: logCompA[k] || 0,
      color: COLOR_BY_COMP_PDF[k] || [100,116,139]
    }));
    dimensiones.push({ titulo: ET_PDF.competencia_plural, canvasId: 'chart-comp', items: itemsComp });
  }

  if (PV_PDF.afirmacion !== false) {
    const afirOrden = Object.keys(cuadernillo.afirmaciones || {})
      .filter(k => _afirsUsadasPDF.has(String(k)))
      .sort((a,b)=>+a-+b);
    const itemsAfir = afirOrden.map(k => {
      const c = compDeAfirPDF(k);
      return {
        codigo: `${ET_PDF.afirmacion_codigo} ${codigoAfirmacion(cuadernillo, k)}`,
        titulo: cuadernillo.afirmaciones[k],
        valor: logAfirA[k] || 0,
        color: _colAfirPDF(k)
      };
    });
    dimensiones.push({ titulo: ET_PDF.afirmacion_plural, canvasId: 'chart-afir', items: itemsAfir });
  }

  if (PV_PDF.evidencia !== false) {
    const evidOrden = Object.keys(cuadernillo.evidencias || {})
      .filter(k => _evidsUsadasPDF.has(String(k)))
      .sort((a,b) => {
        const [a1,a2] = a.split('.').map(Number);
        const [b1,b2] = b.split('.').map(Number);
        return a1 !== b1 ? a1 - b1 : a2 - b2;
      });
    const itemsEvid = evidOrden.map(k => {
      const c = compDeEvidPDF(k);
      return {
        codigo: k,
        titulo: cuadernillo.evidencias[k],
        valor: logEvidA[k] || 0,
        color: _colEvidPDF(k)
      };
    });
    dimensiones.push({ titulo: ET_PDF.evidencia_plural, canvasId: 'chart-evid', items: itemsEvid });
  }

  if (_hayDim2PDF) {
    const _tituloPagDim2 = cfgAreaPDF.dimension_secundaria.etiqueta;
    const logDim2A = logroGrupoPor(logroPorDimensionSecundaria, aplicaciones, cuadernillo);
    const PALETA_DIM2_PDF = (cfgAreaPDF.dimension_secundaria.paleta || []).map(hex => {
      const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [100,116,139];
    });
    if (!PALETA_DIM2_PDF.length) PALETA_DIM2_PDF.push([94,234,212], [167,139,250], [251,146,60], [134,239,172]);
    const ordenCanonicoDim2 = ordenCategoriasDim(cuadernillo);
    const dim2Keys = ordenCanonicoDim2
      ? ordenCanonicoDim2.filter(c => c in logDim2A)
      : Object.keys(logDim2A).sort();
    const itemsDim2 = dim2Keys.map((k, i) => ({
      codigo: k.length > 16 ? k.substring(0, 14) + '...' : k,
      titulo: k,
      valor: logDim2A[k] || 0,
      color: PALETA_DIM2_PDF[i % PALETA_DIM2_PDF.length]
    }));
    dimensiones.push({ titulo: _tituloPagDim2, canvasId: 'chart-cmc', items: itemsDim2 });
  }

  // Renderizar layout adaptativo si hay al menos 1 dimensión
  if (dimensiones.length > 0) {
    doc.addPage(); p++;
    dibujarHeader(doc, titulo, p, total, logo);
    tituloPagina(doc, 'Alineación curricular MBE', `Logro por dimensión del marco evaluativo del área`);

    // Helper: dibujar UN bloque compacto (chart + tabla mini) en una región x,y,w,h dada.
    const dibujarBloqueCompacto = async (xB, yB, wB, hB, dim) => {
      // Título de la dimensión
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.negro);
      doc.text(dim.titulo, xB, yB);
      doc.setDrawColor(...C.dorado);
      doc.setLineWidth(0.5);
      doc.line(xB, yB + 1.2, xB + Math.min(40, wB - 10), yB + 1.2);
      doc.setLineWidth(0.2);

      // Chart en la parte superior. Calcular ancho que mantenga el ratio del canvas
      // pero RESPETE el alto máximo (chartAltoMax), para que la tabla no se solape.
      const chartAltoMax = Math.min(58, hB * 0.46);
      const canvasEl = document.getElementById(dim.canvasId);
      let chartAltoReal = 0;
      if (canvasEl && canvasEl.width > 0 && canvasEl.height > 0) {
        // Ancho que respeta tanto el ancho del bloque (wB) como el alto máx (chartAltoMax)
        const ratio = canvasEl.height / canvasEl.width;       // h/w
        const anchoLimitadoPorAlto = chartAltoMax / ratio;     // ancho necesario para que h = chartAltoMax
        const anchoFinal = Math.min(wB, anchoLimitadoPorAlto);
        // Centrar horizontalmente dentro del bloque
        const xChart = xB + (wB - anchoFinal) / 2;
        try {
          chartAltoReal = await capturarCanvasEnPDF(doc, canvasEl, xChart, yB + 4, anchoFinal);
        } catch (e) { chartAltoReal = chartAltoMax; }
      }

      // Tabla mini debajo del chart — usar alto REAL del chart (no el max estimado)
      const tablaY = yB + 4 + (chartAltoReal || chartAltoMax) + 3;
      const altoMaxTabla = hB - (tablaY - yB) - 2;
      doc.setFillColor(...C.grafito);
      doc.rect(xB, tablaY, wB, 6, 'F');
      doc.setTextColor(...C.blanco);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('CÓD', xB + 2, tablaY + 4.3);
      doc.text('TÍTULO', xB + 22, tablaY + 4.3);
      doc.text('%', xB + wB - 3, tablaY + 4.3, { align: 'right' });

      let yL = tablaY + 6;
      const altoFila = Math.min(7, (altoMaxTabla - 6) / Math.max(dim.items.length, 1));
      dim.items.forEach((it, idx) => {
        if (yL + altoFila > yB + hB - 2) return;
        const valor = it.valor;
        const _semL = semaforoDesempeno(valor);
        const _hexL = _semL.color.replace('#','');
        const colorPct = [parseInt(_hexL.slice(0,2),16), parseInt(_hexL.slice(2,4),16), parseInt(_hexL.slice(4,6),16)];
        if (idx % 2 === 0) { doc.setFillColor(250, 251, 253); doc.rect(xB, yL, wB, altoFila, 'F'); }
        doc.setDrawColor(220, 220, 224);
        doc.setLineWidth(0.15);
        doc.line(xB, yL + altoFila, xB + wB, yL + altoFila);
        // Dot color + código
        doc.setFillColor(...it.color);
        doc.circle(xB + 3, yL + altoFila/2, 1.3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...it.color);
        doc.text(String(it.codigo).slice(0, 8), xB + 6, yL + altoFila/2 + 1);
        // Título compacto
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...C.negro);
        const tituloCorto = String(it.titulo).length > 36 ? String(it.titulo).slice(0, 34) + '…' : String(it.titulo);
        doc.text(tituloCorto, xB + 22, yL + altoFila/2 + 1);
        // %
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...colorPct);
        doc.text(`${valor}%`, xB + wB - 2, yL + altoFila/2 + 1, { align: 'right' });
        yL += altoFila;
      });
    };

    // Calcular regiones del grid según cantidad
    const yInicio = 50;
    const altoDisponible = h - yInicio - 22;  // dejar 22mm para footer
    const anchoFull = w - 30;                  // 180mm
    const cantDim = dimensiones.length;

    if (cantDim === 1) {
      // 1 dimensión: bloque ancho completo
      await dibujarBloqueCompacto(15, yInicio, anchoFull, altoDisponible, dimensiones[0]);
    } else if (cantDim === 2) {
      // 2 dimensiones: lado a lado (50/50)
      const wHalf = (anchoFull - 6) / 2;
      await dibujarBloqueCompacto(15, yInicio, wHalf, altoDisponible, dimensiones[0]);
      await dibujarBloqueCompacto(15 + wHalf + 6, yInicio, wHalf, altoDisponible, dimensiones[1]);
    } else if (cantDim === 3) {
      // 3 dimensiones: 2 arriba (50/50) + 1 abajo centrada (60% ancho)
      const wHalf = (anchoFull - 6) / 2;
      const hHalf = (altoDisponible - 6) / 2;
      await dibujarBloqueCompacto(15, yInicio, wHalf, hHalf, dimensiones[0]);
      await dibujarBloqueCompacto(15 + wHalf + 6, yInicio, wHalf, hHalf, dimensiones[1]);
      const wBottom = anchoFull * 0.65;
      const xBottom = 15 + (anchoFull - wBottom) / 2;
      await dibujarBloqueCompacto(xBottom, yInicio + hHalf + 6, wBottom, hHalf, dimensiones[2]);
    } else {
      // 4 dimensiones: grid 2x2
      const wHalf = (anchoFull - 6) / 2;
      const hHalf = (altoDisponible - 6) / 2;
      await dibujarBloqueCompacto(15, yInicio, wHalf, hHalf, dimensiones[0]);
      await dibujarBloqueCompacto(15 + wHalf + 6, yInicio, wHalf, hHalf, dimensiones[1]);
      await dibujarBloqueCompacto(15, yInicio + hHalf + 6, wHalf, hHalf, dimensiones[2]);
      await dibujarBloqueCompacto(15 + wHalf + 6, yInicio + hHalf + 6, wHalf, hHalf, dimensiones[3]);
    }

    dibujarFooter(doc);
  }

  // v11: Páginas 'Análisis por competencia' y 'Análisis individual destacado' ELIMINADAS por feedback del usuario.
  // La información de competencias ya está representada en Alineación curricular MBE (pág 6).

  // ====== PÁGINA — CONCLUSIONES PROFUNDAS ======
  doc.addPage(); p++;
  dibujarHeader(doc, titulo, p, total, logo);
  tituloPagina(doc, 'Conclusiones e interpretación pedagógica', 'Análisis en 4 bloques narrativos');

  const bloques = [
    { titulo: 'DIAGNÓSTICO', texto: conclusiones.diagnostico, color: C.gris },
    { titulo: 'FORTALEZAS', texto: conclusiones.fortalezas, color: C.alto },
    { titulo: 'OPORTUNIDADES DE MEJORA', texto: conclusiones.oportunidades, color: C.basico },
    { titulo: 'RECOMENDACIONES', texto: conclusiones.recomendaciones, color: C.bajo }
  ];
  let yB = 48;
  bloques.forEach(b => {
    const limpio = b.texto.replace(/<[^>]+>/g, '').replace(/\$[^$]*\$/g, '[fórmula]');
    const lines = doc.splitTextToSize(limpio, w - 40);
    const altoEstimado = lines.length * 4 + 12;
    if (yB + altoEstimado > h - 25) { doc.addPage(); dibujarHeader(doc, titulo, p, total, logo); yB = 32; }
    doc.setFillColor(...b.color);
    doc.rect(15, yB, 4, altoEstimado, 'F');
    doc.setFillColor(252, 252, 254);
    doc.rect(19, yB, w - 34, altoEstimado, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...b.color);
    doc.text(b.titulo, 23, yB + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.negro);
    doc.text(lines, 23, yB + 12);
    yB += altoEstimado + 5;
  });

  dibujarFooter(doc);

  // ====== PÁGINA 10 — PLAN DE ACCIÓN SUGERIDO ======
  doc.addPage(); p++;
  dibujarHeader(doc, titulo, p, total, logo);
  tituloPagina(doc, 'Plan de acción sugerido', 'Insumo para construir el Plan de Mejora (Fase II) y orientar la Fase III en el aula');

  // Tabla pre-rellenada
  doc.setFillColor(...C.dorado);
  doc.rect(15, 48, w - 30, 8, 'F');
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SUGERENCIAS POR BRECHA DETECTADA', 20, 53.5);

  const sugs = [
    { titulo: 'Brecha en Interpretación', accion: 'Implementar lectura crítica semanal de gráficas/tablas.' },
    { titulo: 'Brecha en Formulación', accion: 'Aplicar Pólya en 2 problemas contextualizados por semana.' },
    { titulo: 'Brecha en Argumentación', accion: 'Realizar al menos 1 debate matemático mensual.' },
    { titulo: 'Estudiantes en BAJO', accion: enRiesgo.length ? `Tutoría focalizada para ${enRiesgo.length} estudiante(s).` : 'No hay estudiantes en riesgo.' },
    { titulo: 'Vinculación SIEE', accion: 'Actualizar criterios formativos de evaluación.' },
    { titulo: 'Vinculación PEI', accion: 'Alinear el plan de mejora con el horizonte institucional.' }
  ];
  let yS = 60;
  sugs.forEach((s, i) => {
    doc.setFillColor(i % 2 ? 248 : 254, i % 2 ? 250 : 254, i % 2 ? 252 : 254);
    doc.rect(15, yS, w - 30, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.rojo);
    doc.text(s.titulo, 20, yS + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.negro);
    const lines = doc.splitTextToSize(s.accion, w - 50);
    doc.text(lines, 20, yS + 11);
    yS += 14;
  });

  // CTA siguiente paso
  doc.setFillColor(...C.rojo);
  doc.roundedRect(15, yS + 10, w - 30, 22, 5, 5, 'F');
  doc.setTextColor(...C.blanco);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SIGUIENTE PASO', w / 2, yS + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Genera el Plan de Mejora completo desde la plataforma IDEA · Fase II — Análisis y Planeación', w / 2, yS + 26, { align: 'center' });

  // Espacios de firma — docente, coordinador, rector
  const yFirmas = yS + 44;
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FIRMAS DE VALIDACIÓN', w / 2, yFirmas, { align: 'center' });
  doc.setDrawColor(160, 160, 170);
  const colsAncho = (w - 60) / 3;
  ['Docente del área', 'Coordinación académica', 'Rectoría'].forEach((rol, i) => {
    const cx = 20 + i * (colsAncho + 5) + colsAncho / 2;
    doc.line(20 + i * (colsAncho + 5), yFirmas + 18, 20 + i * (colsAncho + 5) + colsAncho, yFirmas + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 110);
    doc.text(rol, cx, yFirmas + 23, { align: 'center' });
    doc.setFontSize(7);
    doc.text('Nombre y firma', cx, yFirmas + 28, { align: 'center' });
  });
  doc.setTextColor(...C.negro);

  dibujarFooter(doc);

  // v4: Reescribir "Página X de Y" con el total REAL de paginas (puede ser > 10 por overflow)
  const totalReal = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalReal; pg++) {
    doc.setPage(pg);
    // Tapar la zona del contador de pagina con un rectángulo negro
    doc.setFillColor(...C.negro);
    doc.rect(w - 50, 5, 45, 12, 'F');
    doc.setTextColor(...C.dorado);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${pg} de ${totalReal}`, w - 6, 11, { align: 'right' });
  }
  doc.setTextColor(...C.negro);

  const nombre = `IDEA_Reporte_${contexto.grado}${contexto.grupo}_${cuadernillo.area}.pdf`.replace(/\s+/g, '_');
  doc.save(nombre);
}

// =========================================================
// 2) CONSOLIDADO INSTITUCIONAL — directivo / funcionario
// =========================================================

export async function exportarConsolidadoPDF(aplicaciones, instituciones, cuadernillos, contexto) {
  await cargarLibsPDF();
  const jsPDF = jsPDFFactory();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const w = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const prom = aplicaciones.length ? Math.round(aplicaciones.reduce((s, a) => s + (a.puntaje || 0), 0) / aplicaciones.length) : 0;

  // Cada pestaña del panel se vuelve una página, capturando TODO lo que se ve.
  const secciones = [
    { el: document.getElementById('vista-consolidado'), titulo: 'Consolidado institucional' },
    { el: document.getElementById('vista-ranking'),     titulo: 'Ranking de estudiantes' },
    { el: document.getElementById('vista-comparativo'), titulo: 'Comparativo entre grupos' },
    { el: document.getElementById('vista-por-grupo'),   titulo: 'Análisis por grupo' }
  ].filter(s => s.el);
  const totalP = 1 + secciones.length;

  // Portada
  dibujarHeader(doc, 'Reporte institucional consolidado', 1, totalP, logo);
  doc.setFillColor(...C.marfil);
  doc.rect(0, 20, w, doc.internal.pageSize.getHeight() - 20, 'F');
  if (logo) { try { const src = logo.dataUrl || logo; const r = logo.ratio || 1.22; const h = 38; const wL = h*r; doc.addImage(src, 'PNG', w/2 - wL/2, 36, wL, h); } catch (e) {} }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.negro);
  doc.text('Consolidado Institucional', w/2, 92, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(contexto.nombre, w/2, 102, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...C.gris);
  doc.text(`Total aplicaciones: ${aplicaciones.length}`, w/2, 116, { align: 'center' });
  doc.text(`Promedio global: ${prom}`, w/2, 122, { align: 'center' });
  doc.text(formatDate(new Date().toISOString()), w/2, 128, { align: 'center' });
  dibujarFooter(doc);

  // Una página por pestaña con TODO su contenido (KPIs, tablas, gráficos, tarjetas)
  let num = 2;
  for (const s of secciones) {
    await agregarSeccionComoPagina(doc, s.el, s.titulo, logo, num++, totalP);
  }

  doc.save(`IDEA_Consolidado_${(contexto.nombre || '').replace(/\s+/g, '_')}.pdf`);
}

// =========================================================
// 3) PLAN DE MEJORA — Fase II (Análisis y Planeación)
// =========================================================

// v9 final: rediseno COMPLETO del PDF de Plan de Mejora para igualar al Word doc.
// 7 secciones expertas + anexo de rubricas + firmas (paralelo al construirWordHtml).
export async function exportarPlanMejoraPDF(plan, cuadernillo) {
  await cargarLibsPDF();
  const jsPDF = jsPDFFactory();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const logo = await loadLogoBase64();
  const titulo = `Plan de Mejora · Fase II · ${plan.area} ${plan.grado}°${plan.grupo}`;
  let p = 1;
  const fechaActual = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  // Sanea caracteres Unicode que la fuente estándar de jsPDF (WinAnsi) no mide bien y que
  // rompen el ajuste de línea (desbordamiento): ≥ ≤ → • comillas tipográficas, guiones largos…
  const san = t => String(t == null ? '' : t)
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≈/g, '~')
    .replace(/[→➜►]/g, '->').replace(/[←]/g, '<-').replace(/[•·▪]/g, '-')
    .replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/[✓✔]/g, '').replace(/ /g, ' ');

  // ============= PAGINA 1: PORTADA =============
  dibujarHeader(doc, titulo, p, 1, logo);
  doc.setFillColor(...C.marfil);
  doc.rect(0, 20, w, h - 20, 'F');

  // Logo grande centrado en portada
  if (logo) {
    try {
      const src = logo.dataUrl || logo;
      const r = logo.ratio || 1.22;
      const lh = 30;
      const lw = lh * r;
      doc.addImage(src, 'PNG', w/2 - lw/2, 36, lw, lh);
    } catch (e) {}
  }

  // Chip Fase II
  doc.setFillColor(251, 191, 36);
  doc.roundedRect(w/2 - 50, 76, 100, 10, 3, 3, 'F');
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FASE II — ANÁLISIS Y PLANEACIÓN', w/2, 82.5, { align: 'center' });

  // Titulo
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Plan de Mejora', w/2, 102, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(...C.rojo);
  doc.text('Personalizado del Instrumento IDEA', w/2, 112, { align: 'center' });

  // Card datos generales
  doc.setFillColor(...C.dorado);
  doc.roundedRect(25, 125, w - 50, 50, 5, 5, 'F');
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL PLAN', w/2, 134, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Docente: ${plan.docente_nombre || '—'}`, w/2, 144, { align: 'center' });
  doc.text(`Área: ${plan.area} · Grado: ${plan.grado}° ${plan.grupo} · Período: ${plan.periodo}`, w/2, 152, { align: 'center' });
  doc.text(`Fecha del plan: ${fechaActual}`, w/2, 160, { align: 'center' });
  doc.text(`Estado: ${plan.estado || 'borrador'}`, w/2, 168, { align: 'center' });

  // Resumen contadores — v13: 2 cards (Acciones + Recomendaciones del catálogo).
  // Card "VINCULACIONES" eliminada porque la articulación SIEE/PEI/Mallas es
  // autonomía del docente y la IE.
  const numAcc = (plan.acciones || []).length;
  const numRecsPDF = (plan.recomendaciones_seleccionadas || []).length;
  const cardWPDF = (w - 50) / 2 - 5;
  doc.setFillColor(...C.blanco);
  doc.roundedRect(25, 188, cardWPDF, 28, 4, 4, 'F');
  doc.setDrawColor(...C.cielo); doc.setLineWidth(0.6); doc.roundedRect(25, 188, cardWPDF, 28, 4, 4, 'S');
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.cielo);
  doc.text(String(numAcc), 25 + cardWPDF/2, 203, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.gris);
  doc.text('ACCIONES DEL DOCENTE', 25 + cardWPDF/2, 210, { align: 'center' });

  doc.setFillColor(...C.blanco);
  doc.roundedRect(35 + cardWPDF, 188, cardWPDF, 28, 4, 4, 'F');
  doc.setDrawColor(...C.alto); doc.roundedRect(35 + cardWPDF, 188, cardWPDF, 28, 4, 4, 'S');
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.alto);
  doc.text(String(numRecsPDF), 35 + cardWPDF + cardWPDF/2, 203, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.gris);
  doc.text('DEL CATÁLOGO EXPERTO', 35 + cardWPDF + cardWPDF/2, 210, { align: 'center' });

  // Pie con marca
  doc.setTextColor(...C.gris);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Documento generado por la plataforma IDEA', w/2, 245, { align: 'center' });
  doc.text('Fase II del ciclo pedagógico · Insumo para la Fase III en el aula', w/2, 251, { align: 'center' });
  dibujarFooter(doc);

  // Helper para verificar/agregar nueva pagina con titulo de seccion
  const ensurePage = (currentY, neededHeight) => {
    if (currentY + neededHeight > h - 25) {
      doc.addPage(); p++;
      dibujarHeader(doc, titulo, p, p, logo);
      dibujarFooter(doc);
      return 32;
    }
    return currentY;
  };
  const seccionTitulo = (yPos, num, texto) => {
    doc.setFillColor(...C.rojo);
    doc.rect(15, yPos, 4, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.rojo);
    doc.text(`${num}. ${texto}`, 21, yPos + 6.5);
    doc.setDrawColor(...C.dorado); doc.setLineWidth(0.4);
    doc.line(15, yPos + 11, w - 15, yPos + 11);
    return yPos + 16;
  };
  const textoExperto = (yPos, lineas, sizept = 9.5) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizept);
    doc.setTextColor(...C.negro);
    const allLines = doc.splitTextToSize(san(lineas), w - 30);
    allLines.forEach(line => {
      yPos = ensurePage(yPos, 5);
      doc.text(line, 15, yPos);
      yPos += 5;
    });
    return yPos + 4;
  };

  // ============= PAGINA 2: DIAGNOSTICO + TRAYECTORIA =============
  doc.addPage(); p++;
  dibujarHeader(doc, titulo, p, p, logo);
  let y = 32;

  y = seccionTitulo(y, 1, 'Diagnóstico de partida');
  const promPlan = plan.puntajes_periodos?.find(pp => pp.periodo === plan.periodo)?.puntaje || 0;
  let diag = `El grupo evaluado con el Instrumento IDEA en ${plan.area} de grado ${plan.grado}° ${plan.grupo} obtuvo durante el período ${plan.periodo} un promedio de ${promPlan} puntos sobre 100. `;
  diag += `Este diagnóstico sirve como punto de partida para focalizar las acciones pedagógicas en las competencias y evidencias con menor logro. `;
  diag += `La lectura cuantitativa del desempeño grupal debe articularse con la observación cualitativa del docente en aula para construir un plan de mejora coherente con el contexto institucional.`;
  y = textoExperto(y, diag);

  y = ensurePage(y, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.negro);
  doc.text('1.1 Trayectoria histórica del grupo', 15, y);
  y += 6;
  // Tabla trayectoria
  doc.setFillColor(...C.grafito);
  doc.rect(15, y, w - 30, 8, 'F');
  doc.setTextColor(...C.blanco); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('PERÍODO', 20, y + 5.5);
  doc.text('PROMEDIO DEL GRUPO (0-100)', w/2 + 10, y + 5.5, { align: 'center' });
  y += 8;
  ['I', 'II', 'III'].forEach((per, i) => {
    doc.setFillColor(i % 2 ? 248 : 254, i % 2 ? 250 : 254, i % 2 ? 252 : 254);
    doc.rect(15, y, w - 30, 8, 'F');
    doc.setDrawColor(220, 220, 224);
    doc.rect(15, y, w - 30, 8);
    doc.setTextColor(...C.negro); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Período ${per}`, 20, y + 5.5);
    const v = plan.puntajes_periodos?.find(p => p.periodo === per)?.puntaje;
    doc.setFont('helvetica', 'bold');
    doc.text(v != null ? String(v) : '—', w/2 + 10, y + 5.5, { align: 'center' });
    y += 8;
  });
  y += 8;
  dibujarFooter(doc);

  // ============= PAGINA 3: COMPETENCIAS PRIORIZADAS + PLAN DE ACCION =============
  y = ensurePage(y, 40);
  y = seccionTitulo(y, 2, 'Competencias y evidencias priorizadas');
  const compsTexto = `A partir del análisis de logros por competencia del Instrumento IDEA, se priorizan para este plan las competencias del marco DCE con menos del 65% de logro grupal (umbral verde del semáforo de la plataforma). Estas áreas críticas demandan intervención pedagógica focalizada articulada con las trayectorias de aprendizaje del grado.`;
  y = textoExperto(y, compsTexto);

  if (cuadernillo?.competencias) {
    const compKeys = Object.keys(cuadernillo.competencias);
    compKeys.forEach(k => {
      y = ensurePage(y, 7);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.setTextColor(...C.rojo);
      doc.text('•', 17, y);
      doc.setTextColor(...C.negro);
      const txt = `${k}. ${cuadernillo.competencias[k]}`;
      doc.text(doc.splitTextToSize(txt, w - 35), 22, y);
      y += 7;
    });
  }
  y += 5;

  // === Sección 2.1: FORTALEZAS detectadas en el grupo (autodetectadas, no editables) ===
  y = ensurePage(y, 30);
  y = seccionTitulo(y, '2.1', 'Fortalezas detectadas en el grupo');
  y = textoExperto(y, 'Las siguientes dimensiones del marco evaluativo muestran un nivel de logro grupal igual o superior al 65% (umbral verde del semáforo unificado). Son la base sobre la cual construir el plan de mejora y no requieren intervención inmediata.');
  const fortalezasAutoPdf = plan.fortalezasAuto || [];
  if (fortalezasAutoPdf.length > 0) {
    const hdrFort = ['TIPO', 'CÓDIGO', 'DESCRIPCIÓN', 'LOGRO'];
    const colsFort = [35, 25, 100, 20];
    hdrFort.forEach((hd, i) => {
      const x = 15 + colsFort.slice(0, i).reduce((a, b) => a + b, 0);
      doc.setFillColor(...C.alto);
      doc.rect(x, y, colsFort[i], 8, 'F');
      doc.setTextColor(...C.blanco); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(hd, x + 2, y + 5.5);
    });
    y += 8;
    fortalezasAutoPdf.forEach((f, idx) => {
      const textos = [f.tipo || '', f.codigo || '—', f.nombre || '', `${f.logro || 0}%`].map(san);
      const linesArr = textos.map((t, i) => doc.splitTextToSize(String(t), colsFort[i] - 4));
      const maxH = Math.max(...linesArr.map(l => l.length * 4 + 4));
      y = ensurePage(y, maxH);
      if (idx % 2 === 0) { doc.setFillColor(240, 253, 244); doc.rect(15, y, colsFort.reduce((a, b) => a + b, 0), maxH, 'F'); }
      textos.forEach((_, i) => {
        const x = 15 + colsFort.slice(0, i).reduce((a, b) => a + b, 0);
        doc.setFont('helvetica', i === 3 ? 'bold' : 'normal');
        doc.setTextColor(...(i === 3 ? C.alto : C.negro));
        doc.text(linesArr[i], x + 2, y + 4);
        doc.setDrawColor(220, 220, 224);
        doc.rect(x, y, colsFort[i], maxH);
      });
      y += maxH;
    });
  } else {
    doc.setTextColor(...C.gris);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Aún no se han detectado fortalezas con logro ≥ 65% en este grupo.', 18, y + 6);
    y += 12;
  }
  y += 6;

  y = ensurePage(y, 25);
  y = seccionTitulo(y, 3, 'Plan de acción pedagógica detallado');
  // v14: tabla SIN columna FORTALEZAS (ya está arriba como bloque auto)
  const headers = ['OPORTUNIDADES DE MEJORA', 'ESTRATEGIAS DIDÁCTICAS', 'SEGUIMIENTO'];
  const cols = [55, 75, 50];
  const colorsCol = [C.basico, C.rojo, C.cielo];

  headers.forEach((hd, i) => {
    const x = 15 + cols.slice(0, i).reduce((a, b) => a + b, 0);
    doc.setFillColor(...colorsCol[i]);
    doc.rect(x, y, cols[i], 8, 'F');
    doc.setTextColor(...C.blanco); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(hd, x + 2, y + 5.5);
  });
  y += 8;
  doc.setTextColor(...C.negro);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const acciones = plan.acciones || [];
  if (acciones.length === 0) {
    doc.setTextColor(...C.gris);
    doc.text('No se registraron acciones. Complete el wizard antes de exportar.', 18, y + 6);
    y += 14;
  } else {
    acciones.forEach((acc, idx) => {
      const textos = [acc.oportunidades || '—', acc.estrategias || '—', acc.seguimiento || '—'].map(san);
      const linesArr = textos.map((t, i) => doc.splitTextToSize(t, cols[i] - 4));
      const maxH = Math.max(...linesArr.map(l => l.length * 4 + 4));
      y = ensurePage(y, maxH);
      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 254);
        doc.rect(15, y, cols.reduce((a, b) => a + b, 0), maxH, 'F');
      }
      textos.forEach((_, i) => {
        const x = 15 + cols.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(linesArr[i], x + 2, y + 4);
        doc.setDrawColor(220, 220, 224);
        doc.rect(x, y, cols[i], maxH);
      });
      y += maxH;
    });
  }
  y += 8;
  dibujarFooter(doc);

  // ============= PAGINA 4: CRONOGRAMA + INDICADORES =============
  y = ensurePage(y, 50);
  y = seccionTitulo(y, 4, 'Cronograma de implementación');
  const cronoTexto = `El cronograma estructura la ejecución del plan en semanas, asignando responsables específicos e indicadores de seguimiento medibles. Cada acción se acompaña de criterios de cierre verificables al final del período.`;
  y = textoExperto(y, cronoTexto);

  doc.setFillColor(...C.grafito);
  doc.rect(15, y, w - 30, 8, 'F');
  doc.setTextColor(...C.blanco); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  doc.text('ACCIÓN', 17, y + 5.5);
  doc.text('SEM.', 110, y + 5.5);
  doc.text('RESPONSABLE', 130, y + 5.5);
  doc.text('INDICADOR', 165, y + 5.5);
  y += 8;
  if (acciones.length === 0) {
    doc.setTextColor(...C.gris); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Sin acciones para programar.', 18, y + 5);
    y += 12;
  } else {
    acciones.slice(0, 8).forEach((acc, i) => {
      y = ensurePage(y, 10);
      doc.setFillColor(i % 2 ? 248 : 254, 250, 252);
      doc.rect(15, y, w - 30, 10, 'F');
      doc.setDrawColor(220, 220, 224); doc.rect(15, y, w - 30, 10);
      doc.setTextColor(...C.negro); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(doc.splitTextToSize(san(acc.estrategias || acc.oportunidades || 'Acción'), 90).slice(0, 2), 17, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`S${i+1}`, 112, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(san(plan.responsable || 'Docente').slice(0, 18), 130, y + 6);
      doc.setFontSize(7);
      doc.text(doc.splitTextToSize(san(acc.seguimiento || '—'), 28).slice(0, 3), 165, y + 3.4);
      doc.setFontSize(8);
      y += 10;
    });
  }
  y += 6;

  y = ensurePage(y, 60);
  y = seccionTitulo(y, 5, 'Indicadores de seguimiento y verificación');
  const indicadores = [
    { titulo: 'Cuantitativo', texto: 'Aplicación de un segundo instrumento IDEA al cierre del próximo período, con metas de mejora del 10% mínimo en las competencias priorizadas.' },
    { titulo: 'Cualitativo', texto: 'Observación de aula focalizada en las estrategias didácticas implementadas, con rúbrica de fidelidad de aplicación.' },
    { titulo: 'De proceso', texto: `Verificación quincenal del cumplimiento del cronograma con el responsable institucional: ${plan.responsable || '—'}.` },
    { titulo: 'De producto', texto: 'Portafolio de evidencias de aprendizaje por estudiante priorizado, con muestras de inicio, medio y cierre del período.' },
    { titulo: 'De impacto', texto: 'Seguimiento individualizado de estudiantes en nivel BAJO, con plan de tutoría documentado.' }
  ];
  indicadores.forEach(ind => {
    y = ensurePage(y, 14);
    doc.setFillColor(...C.dorado);
    doc.rect(15, y, 4, 12, 'F');
    doc.setFillColor(255, 251, 235);
    doc.rect(19, y, w - 34, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(...C.doradoOscuro);
    doc.text(ind.titulo + ':', 22, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.setTextColor(...C.negro);
    const lines = doc.splitTextToSize(san(ind.texto), w - 60).slice(0, 2);
    doc.text(lines, 45, y + 5);
    y += 12;
  });
  y += 6;
  dibujarFooter(doc);

  // ============= PAGINA 5: PUENTE A FASE III + ANEXO RUBRICAS + FIRMAS =============
  // v13: Sección "Articulación con SIEE y PEI" REMOVIDA. La articulación
  // institucional es autonomía del docente y de la IE; el instrumento IDEA
  // no la prescribe. Se reemplaza por un cierre motivacional hacia Fase III.
  y = ensurePage(y, 70);
  y = seccionTitulo(y, 6, 'Puente a la Fase III — Implementación en el aula');
  const cierreFase2 = `Este plan cierra la Fase II — Análisis y Planeación del instrumento IDEA. La Fase III — Implementación y Acción es enteramente autonomía del docente: sucede en el aula, con sus secuencias didácticas y su juicio profesional ajustando la ruta según el avance de los estudiantes.`;
  y = textoExperto(y, cierreFase2);
  const ruta = `Para llevar este plan al aula esta misma semana: (1) Empieza con la primera estrategia y prográmala para la próxima clase, sin esperar el lunes "perfecto". (2) Lleva una bitácora corta con qué funcionó, qué ajustaste y cómo respondieron los estudiantes — ese registro será insumo para la próxima aplicación. (3) Conversa una vez por semana con otro docente del área; la mejora pedagógica más sostenible nace del diálogo profesional honesto.`;
  y = textoExperto(y, ruta);
  const cierreInvitacion = `Al cierre del período, una nueva aplicación del cuadernillo IDEA permitirá comparar el impacto concreto del plan que hoy comienza. Confía en tu juicio profesional: tu aula te necesita.`;
  y = textoExperto(y, cierreInvitacion);
  y += 5;

  // ANEXO RUBRICAS
  y = ensurePage(y, 70);
  y = seccionTitulo(y, 'Anexo', 'Rúbricas analíticas por nivel de desempeño');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
  doc.setTextColor(...C.gris);
  doc.text('Plantilla editable según el contexto institucional.', 15, y);
  y += 6;
  doc.setTextColor(...C.negro);

  if (cuadernillo?.competencias) {
    // header de la tabla de rubrica
    const colsR = [42, 36, 36, 36, 36];
    const headersR = ['COMPETENCIA', 'SUPERIOR\n(90-100)', 'ALTO\n(75-89)', 'BÁSICO\n(60-74)', 'BAJO\n(0-59)'];
    const colorsR = [C.grafito, C.alto, [52, 211, 153], C.basico, C.bajo];
    headersR.forEach((hd, i) => {
      const x = 15 + colsR.slice(0, i).reduce((a, b) => a + b, 0);
      doc.setFillColor(...colorsR[i]);
      doc.rect(x, y, colsR[i], 12, 'F');
      doc.setTextColor(...C.blanco); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text(hd, x + colsR[i]/2, y + 4.5, { align: 'center', maxWidth: colsR[i] - 2 });
    });
    y += 12;

    const descripciones = [
      'Resuelve situaciones complejas con argumentación rigurosa y articula múltiples representaciones.',
      'Resuelve situaciones contextualizadas con procedimientos correctos y justificación parcial.',
      'Resuelve situaciones básicas con apoyo y reconoce conceptos centrales.',
      'Requiere acompañamiento sostenido para alcanzar comprensiones mínimas.'
    ];
    Object.keys(cuadernillo.competencias).forEach(k => {
      const comp = cuadernillo.competencias[k];
      const rowH = 22;
      y = ensurePage(y, rowH);
      doc.setFillColor(244, 244, 247);
      doc.rect(15, y, colsR[0], rowH, 'F');
      doc.setDrawColor(200, 200, 210); doc.rect(15, y, colsR[0], rowH);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.setTextColor(...C.negro);
      doc.text(doc.splitTextToSize(comp, colsR[0] - 4), 17, y + 5);
      let xRow = 15 + colsR[0];
      descripciones.forEach((desc, i) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(xRow, y, colsR[i+1], rowH, 'F');
        doc.rect(xRow, y, colsR[i+1], rowH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
        doc.text(doc.splitTextToSize(desc, colsR[i+1] - 4), xRow + 2, y + 4);
        xRow += colsR[i+1];
      });
      y += rowH;
    });
  }
  y += 10;

  // SECCION 7: FIRMAS
  y = ensurePage(y, 50);
  y = seccionTitulo(y, 7, 'Firmas de validación');
  const colsFirm = 3;
  const colW = (w - 30) / colsFirm;
  const firmas = [
    { nombre: plan.docente_nombre || '_______________________', rol: 'Docente del área' },
    { nombre: '_______________________', rol: 'Coordinación académica' },
    { nombre: '_______________________', rol: 'Rectoría' }
  ];
  firmas.forEach((f, i) => {
    const x = 15 + i * colW;
    doc.setDrawColor(120, 120, 130); doc.setLineWidth(0.4);
    doc.line(x + 4, y + 25, x + colW - 4, y + 25);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.setTextColor(...C.negro);
    doc.text(f.nombre.slice(0, 25), x + colW/2, y + 32, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(...C.gris);
    doc.text(f.rol, x + colW/2, y + 37, { align: 'center' });
  });

  dibujarFooter(doc);

  // Reescribir total de paginas
  const totalReal = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalReal; pg++) {
    doc.setPage(pg);
    doc.setFillColor(...C.negro);
    doc.rect(w - 50, 6, 44, 8, 'F');
    doc.setTextColor(...C.dorado);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${pg} de ${totalReal}`, w - 8, 11, { align: 'right' });
    doc.setTextColor(...C.negro);
  }

  doc.save(`IDEA_PlanMejora_${plan.area}_${plan.grado}${plan.grupo}.pdf`.replace(/\s+/g, '_'));
}
