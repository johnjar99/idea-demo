// certificado.js — Certificado de RECONOCIMIENTO académico (Instrumento IDEA).
//
// Reglas de negocio (actualizadas 2026-06-08):
//   - Reconocimiento = el estudiante obtiene 60 o MÁS puntos en TODAS las áreas evaluadas
//     de su grado (es decir, ningún área en nivel BAJO). El nivel mostrado en el certificado
//     se adapta al promedio global del estudiante (BÁSICO / ALTO / SUPERIOR).
//   - El certificado se gestiona desde el perfil del DIRECTIVO (rector): lo firma el
//     directivo docente y lleva el ESCUDO de la institución arriba.
//   - Diseño con identidad IDEA (rojo + dorado, marfil), en formato vertical (A4 retrato),
//     inspirado en el modelo de referencia pero conservando nuestra esencia.
//
// API pública:
//   - UMBRAL_RECONOCIMIENTO (60)
//   - evaluarGrupoExcelencia({ institucionId, grado, grupo, cuadernillos, apps })
//   - generarCertificadoExcelenciaPDF({ estudiante, institucion, promedio, nivel, periodo, firmante, fecha })

import { cargarJsPDF } from './cargar-libs.js';

export const UMBRAL_RECONOCIMIENTO = 60;   // ≥ 60 en TODAS las áreas → reconocimiento
export const UMBRAL_EXCELENCIA = 60;       // alias retro-compatible

const _normGrupo = (g) => String(g ?? '').trim().toUpperCase();
const _ts = (a) => new Date(a.fecha_envio || a.fecha_fin || a.fecha_creacion || 0).getTime();

export function nivelDeProm(p) {
  if (p > 90) return 'SUPERIOR';
  if (p >= 79) return 'ALTO';
  if (p >= 60) return 'BÁSICO';
  return 'BAJO';
}
function _adjNivel(nivel) {
  return ({ SUPERIOR: 'sobresaliente', ALTO: 'alto', 'BÁSICO': 'buen', BAJO: '' })[nivel] || 'destacado';
}

// De varias entregas de un mismo estudiante+cuadernillo, la VÁLIDA (regla de integridad de
// los paneles): la más reciente con permiso autorizado; si ninguna usó permiso, la primera.
function _oficialDe(lista) {
  const cp = lista.filter(a => a.permiso_usado);
  if (cp.length) return cp.sort((x, y) => _ts(y) - _ts(x))[0];
  return lista.slice().sort((x, y) => _ts(x) - _ts(y))[0];
}

/**
 * Evalúa el reconocimiento de un grupo (institución + grado + grupo).
 * Un estudiante es "excelente" (reconocido) si tiene TODAS las áreas del grado y en cada una
 * obtuvo 60 o más. Se incluye su nivel global para el certificado.
 */
export function evaluarGrupoExcelencia({ institucionId, grado, grupo, cuadernillos, apps }) {
  const g = _normGrupo(grupo);
  const materias = [];
  const vistos = new Set();
  for (const c of (cuadernillos || [])) {
    if (String(c.grado) === String(grado) && !vistos.has(c.id)) { vistos.add(c.id); materias.push(c); }
  }
  const idsEsperados = materias.map(c => c.id);
  const totalMaterias = idsEsperados.length;

  const delGrupo = (apps || []).filter(a =>
    a.institucion_id === institucionId &&
    String(a.grado) === String(grado) &&
    _normGrupo(a.grupo) === g &&
    a.estado === 'enviada');

  const porEst = new Map();
  for (const a of delGrupo) {
    const ek = a.estudiante_id || a.estudiante_nombre;
    if (!ek) continue;
    if (!porEst.has(ek)) porEst.set(ek, { id: a.estudiante_id, nombre: a.estudiante_nombre, tipo_documento: a.tipo_documento, documento: a.numero_documento, porCuad: new Map() });
    const e = porEst.get(ek);
    if (!e.porCuad.has(a.cuadernillo_id)) e.porCuad.set(a.cuadernillo_id, []);
    e.porCuad.get(a.cuadernillo_id).push(a);
  }

  const estudiantes = [];
  let completo = porEst.size > 0 && totalMaterias > 0;
  for (const e of porEst.values()) {
    const oficiales = idsEsperados.map(cid => {
      const l = e.porCuad.get(cid);
      return l ? _oficialDe(l) : null;
    });
    const validas = oficiales.filter(Boolean);
    const tieneTodas = validas.length === totalMaterias && totalMaterias > 0;
    if (!tieneTodas) completo = false;
    const promedio = validas.length ? Math.round(validas.reduce((s, a) => s + (a.puntaje || 0), 0) / validas.length) : 0;
    // Reconocimiento: todas las áreas presentes y cada una con 60 o más.
    const todasAprobadas = tieneTodas && validas.every(a => (a.puntaje || 0) >= UMBRAL_RECONOCIMIENTO);
    estudiantes.push({
      id: e.id, nombre: e.nombre, tipo_documento: e.tipo_documento, documento: e.documento,
      promedio, nivel: nivelDeProm(promedio), completas: validas.length, total: totalMaterias, tieneTodas,
      minArea: validas.length ? Math.min(...validas.map(a => a.puntaje || 0)) : 0,
      excelente: todasAprobadas
    });
  }
  estudiantes.sort((a, b) => b.promedio - a.promedio);
  // El reconocimiento es SOLO para el PRIMER PUESTO de cada grupo (mayor promedio), y siempre
  // que ese estudiante haya aprobado TODAS las áreas evaluadas (60 o más en cada una).
  const primero = estudiantes[0];
  const excelentes = (primero && primero.excelente) ? [primero] : [];
  return { completo, totalMaterias, materias, estudiantes, excelentes };
}

// Carga una imagen a dataURL para incrustarla. Devuelve null si falla (sin romper el PDF).
function _cargarImagen(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: cv.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
      } catch (_) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function _fechaLarga(d) {
  try { return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; } catch (_) { return ''; }
}

/**
 * Genera y descarga el certificado de reconocimiento en PDF (A4 VERTICAL), identidad IDEA.
 * @param {object} p
 * @param {object} p.estudiante  { nombre, tipo_documento, documento, grado, grupo }
 * @param {object} p.institucion { nombre, abreviatura, municipio, departamento, logo|logo_url }
 * @param {number} p.promedio    promedio global (0..100)
 * @param {string} [p.nivel]     nivel global; si no, se calcula del promedio
 * @param {string} [p.periodo]   p. ej. "I"
 * @param {object} [p.firmante]  { nombre, cargo }  → el directivo docente que firma
 * @param {Date}   [p.fecha]
 */
export async function generarCertificadoExcelenciaPDF({ estudiante, institucion, promedio, nivel, periodo, firmante, fecha }) {
  await cargarJsPDF();
  const JsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!JsPDF) throw new Error('No se pudo cargar el generador de PDF.');

  const INK = [31, 26, 23], ROJO = [199, 22, 60], ORO = [184, 138, 50], ORO_CLARO = [212, 175, 90], MARFIL = [253, 250, 244], GRIS = [120, 113, 108];
  const nivelG = nivel || nivelDeProm(promedio);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const cx = W / 2;

  doc.setFillColor(...MARFIL); doc.rect(0, 0, W, H, 'F');

  // Doble marco rojo + dorado (esencia IDEA). Sin marca de agua.
  // Marco elegante y sobrio: keyline rojo muy fino + doble filete dorado + diamantes en las esquinas.
  doc.setDrawColor(...ROJO); doc.setLineWidth(0.4); doc.rect(8, 8, W - 16, H - 16);
  doc.setDrawColor(...ORO); doc.setLineWidth(0.9); doc.rect(12, 12, W - 24, H - 24);
  doc.setDrawColor(...ORO_CLARO); doc.setLineWidth(0.3); doc.rect(14, 14, W - 28, H - 28);
  const diamante = (x, y) => { const s = 2.2; doc.setFillColor(...ORO); doc.triangle(x, y - s, x + s, y, x, y + s, 'F'); doc.triangle(x, y - s, x - s, y, x, y + s, 'F'); };
  diamante(13, 13); diamante(W - 13, 13); diamante(13, H - 13); diamante(W - 13, H - 13);

  // Logos: INTERCAMBIADOS respecto a la versión anterior.
  //  - El ESCUDO de la institución va ARRIBA AL CENTRO.
  //  - El logo IDEA va en la esquina superior izquierda (pequeño).
  const logoIdea = await _cargarImagen('assets/logo-idea.png');
  if (logoIdea) {
    const hI = 12, wI = hI * (logoIdea.ratio || 2.4);
    try { doc.addImage(logoIdea.dataUrl, 'PNG', 20, 18, wI, hI); } catch (_) {}
  }

  const escudo = await _cargarImagen(institucion?.logo || institucion?.logo_url);
  let y = 18;
  const escH = 30;
  if (escudo) {
    const w2 = Math.min(40, escH * (escudo.ratio || 1));
    try { doc.addImage(escudo.dataUrl, 'PNG', cx - w2 / 2, y, w2, escH); } catch (_) {}
  } else {
    doc.setDrawColor(...ORO_CLARO); doc.setLineWidth(0.4);
    doc.roundedRect(cx - 17, y, 34, escH, 2.5, 2.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(198, 186, 165);
    doc.text('ESCUDO IE', cx, y + escH / 2 + 1.5, { align: 'center' });
  }
  y += escH + 12;

  // Título (con leve espaciado tipográfico para mayor elegancia).
  doc.setCharSpace(2.4);
  doc.setFont('times', 'bold'); doc.setFontSize(36); doc.setTextColor(...ROJO);
  doc.text('CERTIFICADO', cx, y, { align: 'center' });
  y += 9.5;
  doc.setCharSpace(3.4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(12.5); doc.setTextColor(...INK);
  doc.text('DE RECONOCIMIENTO', cx, y, { align: 'center' });
  doc.setCharSpace(0);
  y += 7;
  // Ornamento elegante: dos filetes dorados con un diamante central.
  doc.setDrawColor(...ORO); doc.setLineWidth(0.5); doc.line(cx - 42, y, cx - 5, y); doc.line(cx + 5, y, cx + 42, y);
  doc.setFillColor(...ORO); doc.triangle(cx, y - 2.1, cx + 2.1, y, cx, y + 2.1, 'F'); doc.triangle(cx, y - 2.1, cx - 2.1, y, cx, y + 2.1, 'F');
  y += 9;

  // Institución.
  const nomIE = institucion?.nombre || institucion?.abreviatura || '';
  if (nomIE) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
    doc.text(nomIE.toUpperCase(), cx, y, { align: 'center' });
    y += 5.5;
    const detalleIE = [institucion?.municipio, institucion?.departamento].filter(Boolean).join(', ');
    if (detalleIE) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS); doc.text(detalleIE, cx, y, { align: 'center' }); y += 5; }
  }
  y += 5;

  // "Es otorgado a".
  doc.setFont('times', 'italic'); doc.setFontSize(14); doc.setTextColor(...GRIS);
  doc.text('Es otorgado a', cx, y, { align: 'center' });
  y += 16;

  // Nombre del estudiante (cursiva elegante, como en el modelo).
  doc.setFont('times', 'bolditalic'); doc.setFontSize(30); doc.setTextColor(...INK);
  doc.text(String(estudiante?.nombre || '—'), cx, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(...ORO); doc.setLineWidth(0.6); doc.line(cx - 58, y + 1, cx + 58, y + 1);
  doc.setFillColor(...ORO);
  [-62, 62].forEach(dx => { const xx = cx + dx; doc.triangle(xx, y - 0.4, xx + 2, y + 1, xx, y + 2.4, 'F'); doc.triangle(xx, y - 0.4, xx - 2, y + 1, xx, y + 2.4, 'F'); });
  y += 8;

  const docTxt = estudiante?.documento ? `${estudiante.tipo_documento || 'CC'} ${estudiante.documento}` : '';
  const ggTxt = `Grado ${estudiante?.grado ?? ''}° · Grupo ${_normGrupo(estudiante?.grupo)}`;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...GRIS);
  doc.text([docTxt, ggTxt].filter(Boolean).join('   ·   '), cx, y, { align: 'center' });
  y += 12;

  // Cuerpo con palabras clave + nivel dinámico.
  const adj = _adjNivel(nivelG);
  const per = periodo ? ` — Periodo ${periodo}` : '';
  doc.setFont('times', 'normal'); doc.setFontSize(13.5); doc.setTextColor(...INK);
  const cuerpo = `por la participación y ${adj} desempeño en la Evaluación Diagnóstica del Instrumento IDEA${per}, ¡felicitaciones!`;
  const lineas = doc.splitTextToSize(cuerpo, 150);
  doc.text(lineas, cx, y, { align: 'center' });
  y += lineas.length * 7 + 4;

  // Sello elegante tipo medalla acuñada: disco dorado con reborde "moneda" (reeded) y centro marfil.
  const mx = cx, my = y + 16, r = 15.5;
  doc.setFillColor(...ORO); doc.circle(mx, my, r, 'F');
  doc.setFillColor(...MARFIL); doc.circle(mx, my, r - 2.4, 'F');
  doc.setDrawColor(...ORO); doc.setLineWidth(0.4); doc.circle(mx, my, r);
  doc.setDrawColor(...ORO_CLARO); doc.setLineWidth(0.4); doc.circle(mx, my, r - 2.4);
  doc.setDrawColor(...ORO_CLARO); doc.setLineWidth(0.3);
  for (let i = 0; i < 36; i++) { const a = i * Math.PI / 18; doc.line(mx + Math.cos(a) * (r - 2.1), my + Math.sin(a) * (r - 2.1), mx + Math.cos(a) * (r - 0.4), my + Math.sin(a) * (r - 0.4)); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...ROJO);
  doc.text(String(nivelG), mx, my - 3.2, { align: 'center' });
  doc.setFont('times', 'bold'); doc.setFontSize(17); doc.setTextColor(...INK);
  doc.text(String(Math.round(promedio)), mx, my + 3.6, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(...GRIS);
  doc.text('/ 100', mx, my + 7.5, { align: 'center' });

  // Firma del DIRECTIVO DOCENTE (centro-abajo).
  const fNombre = (firmante?.nombre || '').trim();
  const fCargo = firmante?.cargo || 'Directivo docente';
  const fy = H - 54;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(cx - 45, fy, cx + 45, fy);
  if (fNombre) {
    doc.setFont('times', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text(fNombre, cx, fy + 7, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  doc.text([fCargo, nomIE].filter(Boolean).join(' · '), cx, fy + (fNombre ? 12.5 : 7), { align: 'center' });

  // Fecha (abajo-izquierda) y lugar.
  const lugar = institucion?.municipio || 'San Juan de Pasto';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIS);
  doc.text(`${lugar}, ${_fechaLarga(fecha instanceof Date ? fecha : new Date(fecha || Date.now()))}`, 24, H - 24, { align: 'left' });

  // Pie IDEA.
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text('Instrumento de Interpretación de Datos para la Evaluación del Aprendizaje', cx, H - 16, { align: 'center' });

  const slug = String(estudiante?.nombre || 'estudiante').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`certificado-reconocimiento-${slug}.pdf`);
}
