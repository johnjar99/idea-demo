// export-excel.js — Excel premium con ExcelJS (colores reales, fórmulas, formato condicional).
// ExcelJS se carga global como `window.ExcelJS`.
//
// Dos exportaciones:
//   - exportarResultadoEstudianteExcel(aplicacion, cuadernillo) — 5 hojas individuales
//   - exportarReporteGrupoExcel(aplicaciones, cuadernillo, contexto) — 7 hojas Plantilla SJB

import {
  logroPorCompetencia, logroPorAfirmacion, logroPorEvidencia, logroPorCMC, logroPorDimensionSecundaria,
  promedioGrupo, correctasPorPreguntaGrupo, logroGrupoPor
} from './calculo.js';
import { conclusionesProfundas, estudiantesEnRiesgo } from './analisis.js';
import { configArea, tieneDimensionSecundaria, valorDimSecundaria, ordenCategoriasDim, etiquetasMarco, panelesVisibles, codigoAfirmacion, semaforoDesempeno } from './area-config.js';
import { formatDateTime } from './utils.js';
import { cargarExcelJS } from './cargar-libs.js';
// Capa pedagogica por grado: precarga del cache para que conclusionesProfundas (sincrona)
// la lea. Si el JSON falta, el cache queda {} y se usa el fallback por area.
import { cargarPedagogiaGrado } from './pedagogia-grado.js';
// v13.2 fix: paleta Excel RESTAURADA a vivos clásicos v11.9 (rojo #E11D48, dorado #FBBF24,
// verde #10B981, ámbar #F59E0B, rojo #EF4444). Antes usaba THEME oscuro editorial
// que el usuario calificó como "diseño modificado" no deseado.
const COLOR = {
  negro:        '0F0F12',
  rojo:         'E11D48',
  dorado:       'FBBF24',
  doradoSuave:  'FEF3C7',
  verdeAcierto: 'DCFCE7',
  rojoError:    'FEE2E2',
  gris:         'F5F5F7',
  zebra:        'F8F6F0',
  grisOscuro:   '4B5563',
  bajo:         'EF4444',
  basico:       'F59E0B',
  alto:         '10B981',
  superior:     'FBBF24',
  blanco:       'FFFFFF',
  ink100:       'F1ECE3',
  ink200:       'E5DDD2',
  ink500:       '6B5F54',
  cielo:        '38BDF8'
};

function getExcelJS() { return window.ExcelJS; }

function colorNivel(nivel) {
  return ({ BAJO: COLOR.bajo, 'BÁSICO': COLOR.basico, ALTO: 'FBBF24', SUPERIOR: '10B981' })[nivel] || COLOR.grisOscuro;
}

async function cargarLogoBase64() {
  try {
    const res = await fetch('assets/logo-idea.png');
    const blob = await res.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

function descargarBlob(buffer, nombre) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Helpers de estilo
const fillSolid = (color) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } });
const fontBoldWhite = (size = 10) => ({ bold: true, size, color: { argb: 'FF' + COLOR.blanco }, name: 'Calibri' });
const fontBold = (size = 10, color = COLOR.negro) => ({ bold: true, size, color: { argb: 'FF' + color }, name: 'Calibri' });
const fontNormal = (size = 10) => ({ size, name: 'Calibri' });
const borderThin = { top: { style: 'hair', color: { argb: 'FF' + COLOR.ink200 } }, left: { style: 'hair', color: { argb: 'FF' + COLOR.ink200 } }, bottom: { style: 'hair', color: { argb: 'FF' + COLOR.ink200 } }, right: { style: 'hair', color: { argb: 'FF' + COLOR.ink200 } } };
const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };

function aplicarHeader(row, color = COLOR.negro) {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill = fillSolid(color);
    cell.font = fontBoldWhite(10);
    cell.alignment = alignCenter;
    cell.border = borderThin;
  });
  row.height = 22;
}

function aplicarFilaZebra(row, par) {
  // Zebra cálida v14: filas pares fondo zebra (FAF6EE), impares blanco puro.
  row.eachCell({ includeEmpty: true }, cell => {
    if (!cell.fill || cell.fill.fgColor?.argb === undefined) {
      cell.fill = fillSolid(par ? COLOR.zebra : COLOR.blanco);
    }
    cell.border = borderThin;
    if (!cell.alignment) cell.alignment = alignCenter;
    if (!cell.font) cell.font = fontNormal(9);
  });
}

// ====================================================================
// EXCEL INDIVIDUAL DEL ESTUDIANTE — 5 hojas
// ====================================================================

export async function exportarResultadoEstudianteExcel(aplicacion, cuadernillo) {
  await cargarExcelJS();
  const ExcelJS = getExcelJS();
  if (!ExcelJS) { alert('Librería ExcelJS no disponible'); return; }
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Instrumento IDEA';
  wb.created = new Date();

  // === Hoja 1: Portada ===
  const wsP = wb.addWorksheet('Portada', { properties: { tabColor: { argb: 'FF' + COLOR.rojo } } });
  wsP.mergeCells('A1:F1'); wsP.getCell('A1').value = 'INSTRUMENTO IDEA — RESULTADO INDIVIDUAL';
  wsP.getCell('A1').font = fontBold(18, COLOR.rojo); wsP.getCell('A1').alignment = alignCenter;
  wsP.getRow(1).height = 32;
  wsP.mergeCells('A2:F2'); wsP.getCell('A2').value = 'Instrumento de Interpretación de Datos para la Evaluación del Aprendizaje';
  wsP.getCell('A2').font = fontNormal(11); wsP.getCell('A2').alignment = alignCenter;

  const datosP = [
    ['', ''],
    ['Estudiante', aplicacion.estudiante_nombre],
    ['Cuadernillo', cuadernillo.nombre],
    ['Período', cuadernillo.periodo],
    ['Fecha de aplicación', formatDateTime(aplicacion.fecha_envio || aplicacion.fecha_fin)],
    ['Intento N°', aplicacion.intento_numero],
    ['Duración', `${Math.floor((aplicacion.duracion_segundos || 0) / 60)} min`],
    ['', ''],
    ['Puntaje', aplicacion.puntaje],
    ['Nivel', aplicacion.nivel],
    ['Total aciertos', `${aplicacion.total_correctas} / ${cuadernillo.preguntas.length}`]
  ];
  datosP.forEach((fila, i) => {
    const r = wsP.addRow(fila);
    if (fila[0]) {
      r.getCell(1).font = fontBold(10, COLOR.grisOscuro);
      r.getCell(2).font = fontNormal(10);
      r.getCell(2).alignment = alignLeft;
    }
  });
  // Nivel coloreado
  const filaNivel = wsP.getRow(2 + 10);
  filaNivel.getCell(2).fill = fillSolid(colorNivel(aplicacion.nivel));
  filaNivel.getCell(2).font = fontBoldWhite(10);
  filaNivel.getCell(2).alignment = alignCenter;

  wsP.columns = [{ width: 22 }, { width: 50 }];
  wsP.getRow(11).height = 28;
  wsP.getCell('A11').font = fontBold(14);
  wsP.getCell('B11').font = fontBold(14, COLOR.rojo);

  // === Hoja 2: Mi resultado ===
  const wsR = wb.addWorksheet('Mi resultado', { properties: { tabColor: { argb: 'FF' + COLOR.dorado } } });
  wsR.mergeCells('A1:E1'); wsR.getCell('A1').value = 'Mi resultado';
  wsR.getCell('A1').font = fontBold(16); wsR.getRow(1).height = 28;
  const headRow = wsR.addRow(['KPI', 'Valor', '', 'Pregunta', 'Acierto']);
  aplicarHeader(headRow, COLOR.negro);
  wsR.addRow(['Puntaje', aplicacion.puntaje]);
  wsR.addRow(['Nivel', aplicacion.nivel]);
  wsR.addRow(['Aciertos', aplicacion.total_correctas]);
  wsR.addRow(['Desaciertos', cuadernillo.preguntas.length - aplicacion.total_correctas]);
  wsR.columns = [{ width: 18 }, { width: 14 }, { width: 4 }, { width: 16 }, { width: 12 }];

  // === Hoja 3: Detalle por pregunta ===
  const wsD = wb.addWorksheet('Detalle', { properties: { tabColor: { argb: 'FF' + COLOR.alto } } });
  const _cfgArR = configArea(cuadernillo);
  const _hayDim2R = tieneDimensionSecundaria(cuadernillo);
  const _labelDim2R = _cfgArR.dimension_secundaria?.etiqueta_corta || 'Cat';
  const hdrD = wsD.addRow(['N°', 'Código ICFES', '¿Qué evalúa?', 'Comp', 'Afir', 'Evid', _labelDim2R, 'Difi', 'Tu resp', 'Correcta', 'Resultado']);
  aplicarHeader(hdrD, COLOR.negro);
  cuadernillo.preguntas.forEach((p, i) => {
    const r = aplicacion.respuestas.find(x => x.pregunta_id === p.id);
    const elegida = r?.opcion_elegida_real || '—';
    const acierto = aplicacion.aciertos_por_pregunta[i] === 1;
    const row = wsD.addRow([
      p.numero, p.id, p.que_evalua.replace(/\$[^$]*\$/g, '[fórmula]'),
      p.competencia, p.afirmacion, p.evidencia, (_hayDim2R ? (valorDimSecundaria(p, cuadernillo) || '') : ''), p.dificultad,
      elegida, p.clave, acierto ? '✓ Correcta' : '✗ Incorrecta'
    ]);
    row.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = alignCenter; });
    row.getCell(3).alignment = alignLeft;
    // Coloreado de tu respuesta y resultado
    row.getCell(9).fill = fillSolid(acierto ? COLOR.verdeAcierto : COLOR.rojoError);
    row.getCell(11).fill = fillSolid(acierto ? COLOR.verdeAcierto : COLOR.rojoError);
    row.getCell(11).font = fontBold(9, acierto ? COLOR.alto : COLOR.bajo);
  });
  wsD.columns = [{ width: 5 }, { width: 12 }, { width: 50 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 16 }, { width: 8 }, { width: 9 }, { width: 9 }, { width: 14 }];

  // === Hoja 4: Mi desempeño por competencia ===
  const wsC = wb.addWorksheet('Por competencia', { properties: { tabColor: { argb: 'FF' + COLOR.cielo || 'FF38BDF8' } } });
  const hdrC = wsC.addRow(['Dimensión', 'Categoría', 'Logro %']);
  aplicarHeader(hdrC, COLOR.negro);
  const _ETxlsR = etiquetasMarco(cuadernillo);
  const _PVxlsR = panelesVisibles(cuadernillo);
  if (_PVxlsR.competencia !== false) {
    const lc = logroPorCompetencia(aplicacion.aciertos_por_pregunta, cuadernillo);
    Object.keys(lc).forEach(k => {
      const r = wsC.addRow([_ETxlsR.competencia_singular, `${k}. ${cuadernillo.competencias[k] || k}`, lc[k]]);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = alignCenter; });
      r.getCell(2).alignment = alignLeft;
    });
  }
  // logroPorAfirmacion ya filtra implícitamente las que tienen preguntas
  // (Object.keys del resultado solo incluye claves con totales > 0).
  if (_PVxlsR.afirmacion !== false) {
    const la = logroPorAfirmacion(aplicacion.aciertos_por_pregunta, cuadernillo);
    Object.keys(la).sort((a,b)=>+a-+b).forEach(k => {
      const r = wsC.addRow([_ETxlsR.afirmacion_singular, `${_ETxlsR.afirmacion_codigo} ${codigoAfirmacion(cuadernillo, k)}`, la[k]]);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); });
    });
  }
  if (_PVxlsR.evidencia !== false) {
    const le = logroPorEvidencia(aplicacion.aciertos_por_pregunta, cuadernillo);
    Object.keys(le).sort().forEach(k => {
      const r = wsC.addRow([_ETxlsR.evidencia_singular, k, le[k]]);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); });
    });
  }
  // Dimensión secundaria del área (CMC en MAT, Componente en CN, MCER en Inglés, omitida en LC/SC)
  if (tieneDimensionSecundaria(cuadernillo)) {
    const _lDim2 = logroPorDimensionSecundaria(aplicacion.aciertos_por_pregunta, cuadernillo);
    const _etDim2 = configArea(cuadernillo).dimension_secundaria.etiqueta_corta;
    Object.keys(_lDim2).forEach(k => {
      const r = wsC.addRow([_etDim2, k, _lDim2[k]]);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); });
    });
  }
  wsC.columns = [{ width: 16 }, { width: 38 }, { width: 14 }];

  // === Hoja 5: Recomendaciones ===
  const wsRec = wb.addWorksheet('Recomendaciones', { properties: { tabColor: { argb: 'FF' + COLOR.bajo } } });
  wsRec.mergeCells('A1:C1'); wsRec.getCell('A1').value = 'Recomendaciones para tu estudio';
  wsRec.getCell('A1').font = fontBold(14); wsRec.getRow(1).height = 28;
  // Recursos por área del cuadernillo — alineados con su guía ICFES.
  const RECURSOS_POR_AREA = {
    'matemáticas': [
      ['Khan Academy Matemáticas', 'Refuerzo por tema y nivel', 'https://es.khanacademy.org/math'],
      ['GeoGebra', 'Visualización geometría y funciones', 'https://www.geogebra.org/m/start'],
      ['ICFES — Cuadernillos oficiales', 'Practicar pruebas tipo SABER 11°', 'https://www.icfes.gov.co/']
    ],
    'lectura crítica': [
      ['Diccionario RAE', 'Léxico y significado contextual', 'https://dle.rae.es/'],
      ['Coursera — Lectura crítica', 'Curso gratuito sobre estructura textual y argumentación', 'https://www.coursera.org/learn/lectura-critica'],
      ['BBC Verifica / TED-Ed', 'Evaluación de fuentes y pensamiento crítico', 'https://ed.ted.com/'],
      ['ICFES — Guía Lectura Crítica', 'Marco oficial de la prueba', 'https://www.icfes.gov.co/']
    ],
    'sociales y ciudadanas': [
      ['Banco de la República Cultural', 'Memoria histórica y contextos sociales', 'https://www.banrepcultural.org/'],
      ['Comisión de la Verdad', 'Informes y testimonios oficiales', 'https://www.comisiondelaverdad.co/'],
      ['Constitución Política 1991', 'Texto íntegro comentado', 'https://www.constitucioncolombia.com/'],
      ['ICFES — Cuadernillos Sociales y Ciudadanas', 'Práctica oficial', 'https://www.icfes.gov.co/']
    ],
    'ciencias naturales': [
      ['Khan Academy Ciencias', 'Biología, química y física graduadas', 'https://es.khanacademy.org/science'],
      ['PhET Simulaciones', 'Laboratorios virtuales en español', 'https://phet.colorado.edu/es/'],
      ['CK-12', 'Explicaciones de fenómenos por modelo', 'https://www.ck12.org/student/'],
      ['ICFES — Guía Ciencias Naturales', 'Componentes y competencias', 'https://www.icfes.gov.co/']
    ],
    'inglés': [
      ['British Council LearnEnglish', 'Curso oficial por nivel MCER', 'https://learnenglish.britishcouncil.org/'],
      ['BBC Learning English', 'Audio, video y comprensión auditiva', 'https://www.bbc.co.uk/learningenglish/'],
      ['Cambridge English Practice', 'Tests de práctica oficiales A2/B1', 'https://www.cambridgeenglish.org/'],
      ['ICFES — Guía Inglés', 'Marco oficial alineado al MCER', 'https://www.icfes.gov.co/']
    ]
  };
  const areaKey = (cuadernillo.area || '').toLowerCase();
  const recursosArea = RECURSOS_POR_AREA[areaKey] || RECURSOS_POR_AREA['matemáticas'];
  const recs = [
    ['Recurso', 'Para qué', 'Enlace'],
    ...recursosArea
  ];
  recs.forEach((fila, i) => {
    const r = wsRec.addRow(fila);
    if (i === 0) aplicarHeader(r, COLOR.negro);
    else r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = alignLeft; });
  });
  wsRec.columns = [{ width: 30 }, { width: 40 }, { width: 40 }];

  // Descargar
  const nombre = `IDEA_${(aplicacion.estudiante_nombre || 'estudiante').replace(/\s+/g, '_')}_intento${aplicacion.intento_numero || 1}.xlsx`;
  const buf = await wb.xlsx.writeBuffer();
  descargarBlob(buf, nombre);
}

// ====================================================================
// EXCEL DE GRUPO (PLANTILLA SJB) — 7 hojas
// ====================================================================

export async function exportarReporteGrupoExcel(aplicaciones, cuadernillo, contexto) {
  await cargarExcelJS();
  await cargarPedagogiaGrado();  // asegura la capa por grado antes del analisis sincrono
  const ExcelJS = getExcelJS();
  if (!ExcelJS) { alert('Librería ExcelJS no disponible'); return; }
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Instrumento IDEA';
  wb.created = new Date();

  const nPregs = cuadernillo.preguntas.length;
  const claves = cuadernillo.preguntas.map(p => p.clave);
  const ordenadas = [...aplicaciones].sort((a, b) => (a.estudiante_nombre || '').localeCompare(b.estudiante_nombre || ''));

  // === Hoja 1: Portada con miniaturas de graficos (v4 premium) ===
  const wsP = wb.addWorksheet('Portada', { properties: { tabColor: { argb: 'FF' + COLOR.rojo } } });
  // Logo embebido en la portada (esquina superior izquierda)
  const logoB64 = await cargarLogoBase64();
  if (logoB64) {
    try {
      const imgId = wb.addImage({ base64: logoB64, extension: 'png' });
      // v9: respetar aspect ratio del logo (asumido ~1.22:1 si no se conoce).
      // Si height fijo 60, width proporcional ~73; mejor 96 width y altura ~78 para mejor lectura.
      wsP.addImage(imgId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 88, height: 72 } });
      wsP.getRow(1).height = 60;
      wsP.getRow(2).height = 30;
      wsP.getRow(3).height = 24;
    } catch (e) { console.warn('No se pudo embeber logo en Excel:', e); }
  }

  // v6: las miniaturas de gráficos van DESPUÉS del índice (row ≥ 45) para no superponer datos.
  // Esto se hace al final del armado de la portada — ver más abajo.
  wsP.mergeCells('B1:G1'); wsP.getCell('B1').value = 'INSTRUMENTO IDEA';
  wsP.getCell('B1').font = fontBold(22, COLOR.rojo); wsP.getCell('B1').alignment = alignCenter;
  wsP.mergeCells('B2:G2'); wsP.getCell('B2').value = 'Reporte de Resultados — ' + cuadernillo.area;
  wsP.getCell('B2').font = fontBold(14, COLOR.grisOscuro); wsP.getCell('B2').alignment = alignCenter;
  wsP.mergeCells('B3:G3'); wsP.getCell('B3').value = 'Fase II · Análisis y Planeación';
  wsP.getCell('B3').font = fontNormal(11); wsP.getCell('B3').alignment = alignCenter;
  wsP.addRow([]);
  const datosInst = [
    ['Institución', contexto.institucion],
    ['Sede', contexto.sede],
    ['Grado', `${contexto.grado}° ${contexto.grupo}`],
    ['Período', contexto.periodo],
    ['Estudiantes evaluados', aplicaciones.length],
    ['Promedio del grupo', promedioGrupo(aplicaciones)],
    ['Fecha del reporte', formatDateTime(new Date().toISOString())]
  ];
  datosInst.forEach(([k, v]) => {
    const r = wsP.addRow([k, v]);
    r.getCell(1).font = fontBold(10, COLOR.grisOscuro);
    r.getCell(2).font = fontNormal(10);
  });
  // Índice de hojas
  wsP.addRow([]);
  const ix = wsP.addRow(['ÍNDICE', '']);
  ix.getCell(1).font = fontBoldWhite(10); ix.getCell(1).fill = fillSolid(COLOR.negro);
  ['Resumen Ejecutivo', 'Datos (entrada)', 'Análisis (Mat)', 'Por Competencia', 'Consolidado', 'Recomendaciones']
    .forEach((nom, i) => wsP.addRow([`Hoja ${i + 2}`, nom]));
  wsP.columns = [{ width: 24 }, { width: 48 }];

  // v9: las miniaturas de graficas YA NO van en portada. Van en hoja "Gráficas" dedicada (creada al final).

  // === Hoja 2: Resumen ejecutivo ===
  const wsE = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: 'FF' + COLOR.dorado } } });
  wsE.mergeCells('A1:E1');
  wsE.getCell('A1').value = 'Resumen Ejecutivo';
  wsE.getCell('A1').font = fontBold(16); wsE.getRow(1).height = 28;

  const niveles = { BAJO: 0, 'BÁSICO': 0, ALTO: 0, SUPERIOR: 0 };
  aplicaciones.forEach(a => { niveles[a.nivel] = (niveles[a.nivel] || 0) + 1; });
  const hdr = wsE.addRow(['Nivel', 'Estudiantes', 'Porcentaje', '', '']);
  aplicarHeader(hdr, COLOR.negro);
  Object.entries(niveles).forEach(([n, c]) => {
    const pct = aplicaciones.length ? Math.round((c / aplicaciones.length) * 100) : 0;
    const r = wsE.addRow([n, c, pct + '%', '', '']);
    r.getCell(1).fill = fillSolid(colorNivel(n));
    r.getCell(1).font = fontBoldWhite(10);
    r.getCell(1).alignment = alignCenter;
    r.eachCell({ includeEmpty: false }, c2 => { c2.border = borderThin; c2.alignment = alignCenter; if (!c2.font) c2.font = fontNormal(10); });
  });
  wsE.addRow([]);
  const kpiH = wsE.addRow(['KPI', 'Valor']);
  aplicarHeader(kpiH, COLOR.negro);
  [
    ['Promedio del grupo', promedioGrupo(aplicaciones)],
    ['Estudiantes evaluados', aplicaciones.length],
    ['En BAJO', niveles.BAJO],
    ['Sobre BÁSICO', (niveles['BÁSICO'] || 0) + (niveles.ALTO || 0) + (niveles.SUPERIOR || 0)]
  ].forEach(([k, v]) => {
    const r = wsE.addRow([k, v]);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = alignCenter; });
    r.getCell(1).alignment = alignLeft;
    r.getCell(1).font = fontBold(10, COLOR.grisOscuro);
  });
  wsE.columns = [{ width: 24 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 12 }];

  // === Hoja 3: Datos (entrada de respuestas) ===
  const wsD = wb.addWorksheet('Datos', { properties: { tabColor: { argb: 'FF' + COLOR.cielo || 'FF38BDF8' } } });
  wsD.mergeCells('A1:C1'); wsD.getCell('A1').value = `Resultados ${cuadernillo.area}`;
  wsD.getCell('A1').font = fontBold(14); wsD.getRow(1).height = 26;
  const hdrCols = ['N°', 'Apellidos y Nombres', ...cuadernillo.preguntas.map(p => p.numero)];
  const hdrRow = wsD.addRow(hdrCols);
  aplicarHeader(hdrRow, COLOR.negro);
  ordenadas.forEach((a, i) => {
    const fila = [i + 1, a.estudiante_nombre];
    cuadernillo.preguntas.forEach(p => {
      const r = a.respuestas.find(x => x.pregunta_id === p.id);
      fila.push(r?.opcion_elegida_real || '');
    });
    const row = wsD.addRow(fila);
    aplicarFilaZebra(row, i % 2 === 0);
  });
  wsD.columns = [{ width: 5 }, { width: 38 }, ...new Array(nPregs).fill({ width: 5 })];
  wsD.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

  // === Hoja 4: Análisis — réplica formato SJB (rótulo de pestaña por ÁREA real, no fijo "Mat_") ===
  const sheetName = `${configArea(cuadernillo).sigla}_${contexto.grado}°`;
  const wsM = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: 'FF' + COLOR.alto } } });
  // Header
  wsM.mergeCells(`A1:${String.fromCharCode(65 + 3 + nPregs)}1`);
  wsM.getCell('A1').value = `Reporte de resultados — ${cuadernillo.area} · Grado ${contexto.grado}° ${contexto.grupo}`;
  wsM.getCell('A1').font = fontBold(13, COLOR.rojo);
  wsM.getRow(1).height = 24;
  wsM.addRow(['Promedio:', promedioGrupo(aplicaciones), '', '', 'CLAVES']);
  wsM.getRow(2).getCell(1).font = fontBold(10, COLOR.grisOscuro);
  wsM.getRow(2).getCell(2).font = fontBold(12, COLOR.alto);
  wsM.getRow(2).getCell(5).font = fontBoldWhite(10);
  wsM.getRow(2).getCell(5).fill = fillSolid(COLOR.negro);
  wsM.getRow(2).getCell(5).alignment = alignCenter;

  // Fila claves
  const filaClaves = wsM.addRow(['', '', '', '', '', ...claves]);
  filaClaves.eachCell({ includeEmpty: false }, c => {
    if (c.value && c.col >= 6) {
      c.fill = fillSolid(COLOR.dorado); c.font = fontBold(10); c.alignment = alignCenter; c.border = borderThin;
    }
  });

  // Header tabla principal
  wsM.addRow([]);
  const hdrMat = wsM.addRow(['N°', 'Apellidos y Nombres', 'Puntaje', 'Nivel', 'PREGUNTAS', ...cuadernillo.preguntas.map(p => p.numero), 'Total']);
  aplicarHeader(hdrMat, COLOR.negro);

  // Filas estudiantes con formato condicional manual (verde si acierta, rojo si erra)
  ordenadas.forEach((a, i) => {
    const fila = [i + 1, a.estudiante_nombre, a.puntaje, a.nivel, ''];
    cuadernillo.preguntas.forEach((p, idx) => {
      const r = a.respuestas.find(x => x.pregunta_id === p.id);
      fila.push(r?.opcion_elegida_real || '');
    });
    fila.push(a.total_correctas);
    const row = wsM.addRow(fila);
    row.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = alignCenter; });
    row.getCell(2).alignment = alignLeft;
    row.getCell(3).font = fontBold(10);
    // Nivel coloreado
    row.getCell(4).fill = fillSolid(colorNivel(a.nivel));
    row.getCell(4).font = fontBoldWhite(9);
    // Celdas de respuesta verde/rojo
    cuadernillo.preguntas.forEach((p, idx) => {
      const col = 6 + idx;
      const acierto = a.aciertos_por_pregunta[idx] === 1;
      const celda = row.getCell(col);
      celda.fill = fillSolid(acierto ? COLOR.verdeAcierto : COLOR.rojoError);
      celda.font = fontBold(9, acierto ? COLOR.alto : COLOR.bajo);
    });
  });
  // Fila TOTAL
  const correctasG = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const filaTotal = wsM.addRow(['TOTAL NÚMERO DE RESPUESTAS CORRECTAS', '', '', '', '', ...correctasG, correctasG.reduce((s, v) => s + v, 0)]);
  wsM.mergeCells(`A${filaTotal.number}:E${filaTotal.number}`);
  filaTotal.eachCell({ includeEmpty: false }, c => {
    c.fill = fillSolid(COLOR.dorado);
    c.font = fontBold(10);
    c.alignment = alignCenter;
    c.border = borderThin;
  });

  // Espacio + Desglose pedagógico
  wsM.addRow([]); wsM.addRow([]);
  wsM.addRow(['DESGLOSE DE LA INTENCIONALIDAD PEDAGÓGICA']).getCell(1).font = fontBold(12, COLOR.rojo);
  const _cfgArG = configArea(cuadernillo);
  const _hayDim2G = tieneDimensionSecundaria(cuadernillo);
  const _labelDim2G = _cfgArG.dimension_secundaria?.etiqueta_corta || 'Cat';
  // Semáforo empírico de desempeño del grupo en cada pregunta (cortes únicos plataforma)
  const _correctasG = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const _totalG = aplicaciones.length || 1;
  const hdrDesg = wsM.addRow(['Pregunta', '¿Qué evalúa?', 'Comp', 'Afir', 'Evid', _labelDim2G, 'Dificultad']);
  aplicarHeader(hdrDesg, COLOR.negro);
  cuadernillo.preguntas.forEach((p, i) => {
    const _pctG = Math.round((_correctasG[i] / _totalG) * 100);
    const _semG = semaforoDesempeno(_pctG);
    // Dificultad empírica: ≤35% acertó → ALTA (rojo) · 35–65% → MEDIA (naranja) · ≥65% → BAJA (verde)
    const _difG = _pctG < 35 ? 'ALTA' : (_pctG < 65 ? 'MEDIA' : 'BAJA');
    const r = wsM.addRow([p.numero, p.que_evalua.replace(/\$[^$]*\$/g, '[fórmula]'), p.competencia, p.afirmacion, p.evidencia, (_hayDim2G ? (valorDimSecundaria(p, cuadernillo) || '') : ''), _difG]);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = alignCenter; });
    r.getCell(2).alignment = alignLeft;
    // Color del semáforo (sin el #) — mismo color que la dificultad en el panel docente
    const _colorHex = _semG.color.replace('#','');
    r.getCell(7).fill = fillSolid(_colorHex); r.getCell(7).font = fontBoldWhite(9);
  });

  // Ancho
  wsM.columns = [
    { width: 5 }, { width: 36 }, { width: 9 }, { width: 9 }, { width: 12 },
    ...new Array(nPregs).fill({ width: 5 }),
    { width: 8 }
  ];
  wsM.views = [{ state: 'frozen', xSplit: 4, ySplit: 4 }];

  // v11: Hoja 'Por Competencia' ELIMINADA por feedback del usuario.
  // La info de competencias vive ahora exclusivamente en 'Alineación descripciones'.

  // === Hoja 5: Consolidado ===
  const wsCons = wb.addWorksheet('Consolidado', { properties: { tabColor: { argb: 'FF' + COLOR.uva || 'FFA78BFA' } } });
  wsCons.mergeCells('A1:E1');
  wsCons.getCell('A1').value = `Consolidado/Ranking · ${cuadernillo.area} · ${contexto.grado}° ${contexto.grupo}`;
  wsCons.getCell('A1').font = fontBold(14); wsCons.getRow(1).height = 24;
  const hdrCons = wsCons.addRow(['Puesto', 'Apellidos y Nombres', 'Puntaje', 'Nivel', 'Total aciertos']);
  aplicarHeader(hdrCons, COLOR.negro);
  const rk = [...aplicaciones].sort((a, b) => b.puntaje - a.puntaje);
  rk.forEach((a, i) => {
    const r = wsCons.addRow([i + 1, a.estudiante_nombre, a.puntaje, a.nivel, a.total_correctas]);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = alignCenter; });
    r.getCell(2).alignment = alignLeft;
    r.getCell(4).fill = fillSolid(colorNivel(a.nivel));
    r.getCell(4).font = fontBoldWhite(10);
    if (i < 3) r.getCell(1).font = fontBold(12, COLOR.dorado);
  });
  wsCons.columns = [{ width: 8 }, { width: 38 }, { width: 12 }, { width: 12 }, { width: 16 }];
  wsCons.views = [{ state: 'frozen', ySplit: 2 }];

  // Data bar para columna Puntaje
  const ultRk = rk.length + 2;
  if (rk.length) {
    wsCons.addConditionalFormatting({
      ref: `C3:C${ultRk}`,
      rules: [{
        type: 'colorScale',
        cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 60 }, { type: 'num', value: 100 }],
        color: [{ argb: 'FF' + COLOR.bajo }, { argb: 'FF' + COLOR.basico }, { argb: 'FF' + COLOR.alto }]
      }]
    });
  }

  // === Hoja 7: Recomendaciones ===
  const wsRec = wb.addWorksheet('Recomendaciones', { properties: { tabColor: { argb: 'FF' + COLOR.bajo } } });
  wsRec.mergeCells('A1:B1');
  wsRec.getCell('A1').value = 'Conclusiones e interpretación pedagógica';
  wsRec.getCell('A1').font = fontBold(14); wsRec.getRow(1).height = 24;
  const conc = conclusionesProfundas(aplicaciones, cuadernillo);
  [
    ['Diagnóstico', conc.diagnostico.replace(/<[^>]+>/g, '')],
    ['Fortalezas', conc.fortalezas.replace(/<[^>]+>/g, '')],
    ['Oportunidades', conc.oportunidades.replace(/<[^>]+>/g, '')],
    ['Recomendaciones', conc.recomendaciones.replace(/<[^>]+>/g, '').replace(/\$[^$]*\$/g, '[fórmula]')],
    ['Proyección y seguimiento', (conc.proyeccion || '').replace(/<[^>]+>/g, '').replace(/\$[^$]*\$/g, '[fórmula]')]
  ].forEach(([t, txt]) => {
    const r = wsRec.addRow([t, txt]);
    r.getCell(1).font = fontBold(11, COLOR.rojo);
    r.getCell(1).alignment = { vertical: 'top', horizontal: 'left' };
    r.getCell(2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    r.getCell(2).font = fontNormal(10);
    r.height = 80;
  });
  // === FORTALEZAS AUTODETECTADAS (logro grupal >= 65%) ===
  wsRec.addRow([]); wsRec.addRow([]);
  wsRec.addRow(['FORTALEZAS DETECTADAS EN EL GRUPO (autodetectadas)']).getCell(1).font = fontBold(12, COLOR.alto);
  wsRec.addRow(['Dimensiones con logro grupal ≥ 65% — son la base sobre la cual construir el plan, no requieren intervención inmediata.']).getCell(1).font = fontNormal(9);
  const hdrFort = wsRec.addRow(['Tipo', 'Código', 'Descripción', 'Logro']);
  aplicarHeader(hdrFort, COLOR.alto);
  // Construir fortalezas auto desde los logros del grupo + cuadernillo
  const _logCompFort = (typeof logroPorCompetencia === 'function')
    ? logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo) : {};
  const _logAfirFort = (typeof logroPorAfirmacion === 'function')
    ? logroGrupoPor(logroPorAfirmacion, aplicaciones, cuadernillo) : {};
  const fortalezas = [];
  Object.entries(_logCompFort).filter(([, v]) => v >= 65).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    fortalezas.push(['Competencia', `${k}.`, cuadernillo.competencias?.[k] || k, v + '%']);
  });
  Object.entries(_logAfirFort).filter(([, v]) => v >= 65).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    fortalezas.push(['Afirmación', `Afir ${k}`, cuadernillo.afirmaciones?.[k] || k, v + '%']);
  });
  if (fortalezas.length === 0) {
    const r = wsRec.addRow(['—', '—', 'No se detectaron fortalezas con logro ≥ 65% en este grupo.', '—']);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = { vertical: 'top', wrapText: true }; });
  } else {
    fortalezas.forEach(f => {
      const r = wsRec.addRow(f);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = { vertical: 'top', wrapText: true }; });
      r.getCell(4).font = fontBold(10, COLOR.alto);
    });
  }

  // Tabla editable para Plan de Mejora (SIN columna Fortalezas — están arriba como bloque auto)
  wsRec.addRow([]); wsRec.addRow([]);
  wsRec.addRow(['PLAN DE MEJORA — TABLA EDITABLE']).getCell(1).font = fontBold(12, COLOR.rojo);
  const hdrPlan = wsRec.addRow(['Oportunidades', 'Estrategias', 'Seguimiento']);
  aplicarHeader(hdrPlan, COLOR.negro);
  for (let i = 0; i < 5; i++) {
    const r = wsRec.addRow(['', '', '']);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = { vertical: 'top', wrapText: true }; });
    r.height = 40;
  }
  wsRec.columns = [{ width: 30 }, { width: 50 }, { width: 40 }, { width: 28 }];

  // Estudiantes en riesgo en una hoja extra
  const enR = estudiantesEnRiesgo(aplicaciones, cuadernillo);
  if (enR.length) {
    const wsRi = wb.addWorksheet('En Riesgo', { properties: { tabColor: { argb: 'FF' + COLOR.bajo } } });
    wsRi.mergeCells('A1:D1');
    wsRi.getCell('A1').value = 'Estudiantes en riesgo (nivel BAJO)';
    wsRi.getCell('A1').font = fontBold(14, COLOR.bajo); wsRi.getRow(1).height = 24;
    const hdrRi = wsRi.addRow(['Estudiante', 'Puntaje', 'Competencia más débil', 'Acción 1', 'Acción 2', 'Acción 3']);
    aplicarHeader(hdrRi, COLOR.negro);
    enR.forEach(e => {
      const sugs = e.sugerencias || [e.sugerencia, '', ''];
      const r = wsRi.addRow([e.estudiante, e.puntaje, `${e.competencia_debil}. ${e.nombre_competencia} (${e.logro_competencia}%)`, sugs[0] || '', sugs[1] || '', sugs[2] || '']);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); c.alignment = { vertical: 'top', wrapText: true }; });
      r.getCell(2).fill = fillSolid(COLOR.bajo); r.getCell(2).font = fontBoldWhite(10); r.getCell(2).alignment = alignCenter;
      r.height = 60;
    });
    wsRi.columns = [{ width: 28 }, { width: 10 }, { width: 30 }, { width: 38 }, { width: 38 }, { width: 38 }];
    wsRi.views = [{ state: 'frozen', ySplit: 2 }];
  }

  // === v9: Hoja Gráficas dedicada (charts del dashboard en una sola hoja limpia) ===
  const wsG = wb.addWorksheet('Gráficas', { properties: { tabColor: { argb: 'FF38BDF8' } } });
  wsG.mergeCells('A1:H1');
  wsG.getCell('A1').value = 'Visualizaciones del grupo';
  wsG.getCell('A1').font = fontBold(16);
  wsG.getRow(1).height = 28;
  wsG.mergeCells('A2:H2');
  wsG.getCell('A2').value = `${cuadernillo.area} · Grado ${contexto.grado}° ${contexto.grupo} · Período ${contexto.periodo}`;
  wsG.getCell('A2').font = fontNormal(10);

  // Establecer dimensiones de filas y columnas para que los charts no dejen huecos
  for (let i = 1; i <= 60; i++) { wsG.getRow(i).height = 18; }
  wsG.columns = [{ width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];

  // v10: chart list actualizada - sin histograma (eliminado del dashboard), incluye los 4 charts de Alineación
  const chartIdsG = [
    { id: 'chart-niveles-donut', titulo: 'Distribución por niveles del grupo' },
    { id: 'chart-aciertos-pregunta', titulo: 'Aciertos por pregunta' },
    { id: 'chart-tendencia-grupo', titulo: 'Tendencia por período' },
    { id: 'chart-radar-comp', titulo: 'Radar de competencias' },
    { id: 'chart-scatter-est', titulo: 'Puntajes por estudiante' },
    { id: 'chart-comp', titulo: `Alineación · ${etiquetasMarco(cuadernillo).competencia_plural}` },
    { id: 'chart-afir', titulo: `Alineación · ${etiquetasMarco(cuadernillo).afirmacion_plural}` },
    { id: 'chart-evid', titulo: `Alineación · ${etiquetasMarco(cuadernillo).evidencia_plural}` },
    { id: 'chart-cmc', titulo: `Alineación · ${configArea(cuadernillo).dimension_secundaria?.etiqueta || 'Dimensión secundaria'}` }
  ];
  let rowG = 4;
  for (let i = 0; i < chartIdsG.length; i++) {
    const ch = chartIdsG[i];
    const canvas = document.getElementById(ch.id);
    if (!canvas || canvas.tagName !== 'CANVAS') continue;
    // Skip si el contenedor del canvas está oculto (ej. panel CMC en LC/SC o
    // panel Competencia única en LC). Evita embebir imágenes en blanco.
    const ancestor = canvas.closest('[style*="display: none"], .hidden') ||
      (canvas.parentElement && getComputedStyle(canvas.parentElement.parentElement || canvas.parentElement).display === 'none' ? canvas.parentElement : null);
    if (ancestor) continue;
    if (canvas && canvas.tagName === 'CANVAS') {
      try {
        const tCell = wsG.getCell(`A${rowG}`);
        tCell.value = ch.titulo;
        tCell.font = fontBold(12, COLOR.negro);
        wsG.mergeCells(`A${rowG}:H${rowG}`);
        wsG.getRow(rowG).height = 22;
        const dataUrl = canvas.toDataURL('image/png');
        const cid = wb.addImage({ base64: dataUrl, extension: 'png' });
        wsG.addImage(cid, { tl: { col: 0.2, row: rowG }, ext: { width: 720, height: 280 } });
        rowG += 17;
      } catch (e) { console.warn('No se pudo embeber chart', ch.id, e); }
    }
  }
  // v10: Heatmap eliminado del dashboard, no se incluye en Excel.

  // === v10: Hoja NUEVA "Alineación con descripciones" - títulos completos por dimensión ===
  const wsAlin = wb.addWorksheet('Alineación descripciones', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  wsAlin.mergeCells('A1:D1');
  wsAlin.getCell('A1').value = 'Alineación curricular MBE — Descripciones completas';
  wsAlin.getCell('A1').font = fontBold(16);
  wsAlin.getRow(1).height = 26;
  wsAlin.mergeCells('A2:D2');
  wsAlin.getCell('A2').value = `Estándares oficiales por dimensión con su % de logro grupal · ${cuadernillo.area} · ${contexto.grado}° ${contexto.grupo}`;
  wsAlin.getCell('A2').font = fontNormal(10);
  wsAlin.addRow([]);

  // Helper - construir mapa competencia→afir/evid/dim2 desde preguntas
  const mapaCAE = {};
  const mapaDim2Comp = {};  // categoría dim secundaria → competencia
  (cuadernillo.preguntas || []).forEach(pq => {
    const cc = (pq.competencia || 'a').charAt(0);
    mapaCAE[cc] = mapaCAE[cc] || { afir: new Set(), evid: new Set() };
    mapaCAE[cc].afir.add(String(pq.afirmacion));
    mapaCAE[cc].evid.add(String(pq.evidencia));
    const _vd2 = valorDimSecundaria(pq, cuadernillo);
    if (_vd2) mapaDim2Comp[_vd2] = cc;
  });
  const compDeAfir = (a) => { for (const [c, m] of Object.entries(mapaCAE)) if (m.afir.has(String(a))) return c; return null; };
  const compDeEvid = (e) => { for (const [c, m] of Object.entries(mapaCAE)) if (m.evid.has(String(e))) return c; return null; };
  // Color del marco DCE (espeja el panel web docente): paleta por AFIRMACIÓN; la competencia
  // hereda el color de su primera afirmación; varias competencias → afir/evid por competencia;
  // UNA sola competencia (ej. LC primaria) → afir/evid por afirmación (no monocromo). También
  // corrige el bug de llaves fijas a/b/c (LC con competencias 1/2/3 caía a gris).
  const _PAL_HEX_DCE = ['3B82F6','F59E0B','8B5CF6','10B981','EC4899','06B6D4','84CC16','EF4444'];
  const _afirKeysXls = Object.keys(cuadernillo.afirmaciones || {}).sort((a,b)=>+a-+b);
  const COLOR_BY_AFIR_XLS = {}; _afirKeysXls.forEach((k,i)=>{ COLOR_BY_AFIR_XLS[String(k)] = _PAL_HEX_DCE[i % _PAL_HEX_DCE.length]; });
  const _primeraAfirXls = (cc) => { const m = mapaCAE[cc]; if (!m) return null; return [...m.afir].sort((a,b)=>+a-+b)[0]; };
  const colorCompHex = (cc) => { const fa = _primeraAfirXls(cc); return (fa != null && COLOR_BY_AFIR_XLS[String(fa)]) || '64748B'; };
  const _unaCompXls = Object.keys(cuadernillo.competencias || {}).length <= 1;
  const colAfirXls = (k) => _unaCompXls ? (COLOR_BY_AFIR_XLS[String(k)] || '64748B') : colorCompHex(compDeAfir(k));
  const colEvidXls = (k) => { if (_unaCompXls) { const m = String(k).match(/^(\d+)/); return (m && COLOR_BY_AFIR_XLS[m[1]]) || '64748B'; } return colorCompHex(compDeEvid(k)); };

  const logComp = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  const logAfir = logroGrupoPor(logroPorAfirmacion, aplicaciones, cuadernillo);
  const logEvid = logroGrupoPor(logroPorEvidencia, aplicaciones, cuadernillo);
  const logDim2A = logroGrupoPor(logroPorDimensionSecundaria, aplicaciones, cuadernillo);
  const _cfgArAln = configArea(cuadernillo);
  const _hayDim2Aln = tieneDimensionSecundaria(cuadernillo);

  const escribirSeccion = (titulo, filas) => {
    const tit = wsAlin.addRow([titulo]);
    tit.getCell(1).font = fontBoldWhite(12);
    tit.getCell(1).fill = fillSolid(COLOR.negro);
    wsAlin.mergeCells(`A${tit.number}:D${tit.number}`);
    const hdr = wsAlin.addRow(['CÓDIGO', 'TÍTULO COMPLETO', '% DE LOGRO', 'COMPETENCIA']);
    aplicarHeader(hdr, COLOR.grisOscuro || COLOR.negro);
    filas.forEach((f, idx) => {
      const r = wsAlin.addRow([f.codigo, f.titulo, f.valor + '%', f.compLabel || '—']);
      r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(10); c.alignment = { vertical: 'top', wrapText: true }; });
      // Color del código según competencia
      r.getCell(1).font = fontBold(10, f.color || COLOR.negro);
      r.getCell(1).alignment = alignCenter;
      r.getCell(3).font = fontBold(10);
      r.getCell(3).alignment = alignCenter;
      // Color del porcentaje según semáforo unificado plataforma (<35 rojo, 35-65 ámbar, ≥65 verde)
      const _semFv = semaforoDesempeno(f.valor);
      r.getCell(3).font = fontBold(10, _semFv.color.replace('#',''));
      r.height = 32;
    });
    wsAlin.addRow([]);
  };

  // 1. Competencias (omitida en Inglés)
  const _ETxlsG = etiquetasMarco(cuadernillo);
  const _PVxlsG = panelesVisibles(cuadernillo);
  // v13.5 fix: leer todas las keys del objeto competencias (no asumir 'a'..'g'), así LC con keys '1','2','3' funciona.
  const compsOrden = Object.keys(cuadernillo.competencias || {})
    .filter(k => cuadernillo.competencias[k])
    .sort((a, b) => {
      const aN = parseInt(a), bN = parseInt(b);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      if (!isNaN(aN)) return -1;
      if (!isNaN(bN)) return 1;
      return a.localeCompare(b);
    });
  if (_PVxlsG.competencia !== false) {
    escribirSeccion(_ETxlsG.competencia_plural.toUpperCase(), compsOrden.map(k => ({
      codigo: `${k}.`,
      titulo: cuadernillo.competencias[k],
      valor: logComp[k] || 0,
      color: colorCompHex(k),
      compLabel: k
    })));
  }

  // Set de afirmaciones/evidencias EFECTIVAMENTE evaluadas en el cuadernillo
  // (filtra entradas del marco sin preguntas como afirmación 2 de SC en P1).
  const _afirsUsadasXls = new Set((cuadernillo.preguntas || []).map(p => String(p.afirmacion)));
  const _evidsUsadasXls = new Set((cuadernillo.preguntas || []).map(p => String(p.evidencia)));

  // 2. Afirmaciones (o Niveles MCER para Inglés)
  if (_PVxlsG.afirmacion !== false) {
    const afirOrden = Object.keys(cuadernillo.afirmaciones || {})
      .filter(k => _afirsUsadasXls.has(String(k)))
      .sort((a,b)=>+a-+b);
    escribirSeccion(_ETxlsG.afirmacion_plural.toUpperCase(), afirOrden.map(k => {
      const cc = compDeAfir(k);
      return {
        codigo: `${_ETxlsG.afirmacion_codigo} ${codigoAfirmacion(cuadernillo, k)}`,
        titulo: cuadernillo.afirmaciones[k],
        valor: logAfir[k] || 0,
        color: colAfirXls(k),
        compLabel: cc ? cc : '—'
      };
    }));
  }

  // 3. Evidencias (omitida en Inglés)
  if (_PVxlsG.evidencia !== false) {
    const evidOrden = Object.keys(cuadernillo.evidencias || {})
      .filter(k => _evidsUsadasXls.has(String(k)))
      .sort((a,b)=>{
        const [a1,a2]=a.split('.').map(Number), [b1,b2]=b.split('.').map(Number);
        return a1!==b1 ? a1-b1 : a2-b2;
      });
    escribirSeccion(_ETxlsG.evidencia_plural.toUpperCase(), evidOrden.map(k => {
      const cc = compDeEvid(k);
      return {
        codigo: k,
        titulo: cuadernillo.evidencias[k],
        valor: logEvid[k] || 0,
        color: colEvidXls(k),
        compLabel: cc ? cc : '—'
      };
    }));
  }

  // 4. Dimensión secundaria del área (CMC en MAT, Componente en CN, MCER en Inglés). Solo si existe.
  if (_hayDim2Aln) {
    const _tit = _cfgArAln.dimension_secundaria.etiqueta.toUpperCase();
    const _ordenCan = ordenCategoriasDim(cuadernillo);
    const _keys = _ordenCan ? _ordenCan.filter(k => k in logDim2A) : Object.keys(logDim2A).sort();
    escribirSeccion(_tit, _keys.map(k => {
      const cc = mapaDim2Comp[k];
      return {
        codigo: k,
        titulo: k,
        valor: logDim2A[k] || 0,
        color: colorCompHex(cc),
        compLabel: cc ? cc : '—'
      };
    }));
  }

  wsAlin.columns = [{ width: 20 }, { width: 70 }, { width: 14 }, { width: 14 }];
  wsAlin.views = [{ state: 'frozen', ySplit: 3 }];

  // === v8: Hoja 9 Plan Personalizado (estructura editable + firmas) ===
  const wsPlan = wb.addWorksheet('Plan Personalizado', { properties: { tabColor: { argb: 'FF' + (COLOR.uva || 'A78BFA') } } });
  wsPlan.mergeCells('A1:F1');
  wsPlan.getCell('A1').value = 'Plan de Mejora Personalizado';
  wsPlan.getCell('A1').font = fontBold(16, COLOR.uva || '#A78BFA');
  wsPlan.getRow(1).height = 28;

  wsPlan.mergeCells('A2:F2');
  wsPlan.getCell('A2').value = `${contexto.institucion || 'Institución'} · ${cuadernillo.area} · Grado ${contexto.grado}° ${contexto.grupo} · Período ${contexto.periodo}`;
  wsPlan.getCell('A2').font = fontNormal(10);

  wsPlan.addRow([]);

  const planHdr = wsPlan.addRow(['ACCIÓN', 'COMPETENCIA', 'EVIDENCIA', 'RESPONSABLE', 'PLAZO', 'INDICADOR DE SEGUIMIENTO']);
  aplicarHeader(planHdr, COLOR.negro);

  // Cargar acciones del wizard si existen en localStorage
  let acciones = [];
  try {
    const raw = localStorage.getItem('idea_planes_personalizados') || localStorage.getItem('idea_plan_actual');
    if (raw) {
      const data = JSON.parse(raw);
      acciones = Array.isArray(data) ? data : (data.acciones || data.recomendaciones || []);
    }
  } catch (e) {}

  // Si no hay acciones guardadas, prerellenar con plantilla por brechas detectadas
  if (!acciones.length) {
    acciones = [
      { accion: 'Implementar lectura crítica semanal de gráficas y tablas', competencia: 'Interpretación', evidencia: 'Análisis de información matemática', responsable: 'Docente principal', plazo: 'Semanas 1-4', indicador: 'Mejora del 15% en preguntas de interpretación' },
      { accion: 'Aplicar Pólya en dos problemas contextualizados por semana', competencia: 'Formulación y Ejecución', evidencia: 'Resolución de problemas', responsable: 'Docente + monitores', plazo: 'Mes 1-2', indicador: 'Tasa de acierto formulación > 70%' },
      { accion: 'Realizar un debate matemático mensual sobre afirmaciones', competencia: 'Argumentación', evidencia: 'Justificación de procedimientos', responsable: 'Docente principal', plazo: 'Período', indicador: 'Participación activa de >80% de estudiantes' },
      { accion: 'Tutoría focalizada para estudiantes en nivel BAJO', competencia: 'Transversal', evidencia: 'Apoyo personalizado', responsable: 'Docente apoyo', plazo: 'Continuo', indicador: 'Promoción de nivel en segunda aplicación' }
    ];
  }

  acciones.forEach(a => {
    const r = wsPlan.addRow([
      a.accion || a.titulo || '',
      a.competencia || '',
      a.evidencia || '',
      a.responsable || 'Docente principal',
      a.plazo || a.duracion || '',
      a.indicador || a.indicador_seguimiento || ''
    ]);
    r.eachCell({ includeEmpty: true }, c => {
      c.border = borderThin;
      c.font = fontNormal(9);
      c.alignment = { vertical: 'top', wrapText: true };
    });
    r.height = 42;
  });

  wsPlan.columns = [
    { width: 38 }, { width: 18 }, { width: 30 }, { width: 22 }, { width: 18 }, { width: 32 }
  ];

  // Cronograma editable
  wsPlan.addRow([]);
  const cronHdr = wsPlan.addRow(['CRONOGRAMA DE IMPLEMENTACIÓN']);
  cronHdr.getCell(1).font = fontBoldWhite(11);
  cronHdr.getCell(1).fill = fillSolid(COLOR.negro);
  wsPlan.mergeCells(`A${cronHdr.number}:F${cronHdr.number}`);

  const semanasHdr = wsPlan.addRow(['Acción', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5+']);
  aplicarHeader(semanasHdr, COLOR.dorado);
  acciones.forEach(a => {
    const r = wsPlan.addRow([a.accion || a.titulo || '', '', '', '', '', '']);
    r.eachCell({ includeEmpty: true }, c => { c.border = borderThin; c.font = fontNormal(9); });
  });

  // Espacio firmas
  wsPlan.addRow([]); wsPlan.addRow([]);
  const firmasRow = wsPlan.addRow(['FIRMAS DE VALIDACIÓN']);
  firmasRow.getCell(1).font = fontBoldWhite(11);
  firmasRow.getCell(1).fill = fillSolid(COLOR.negro);
  wsPlan.mergeCells(`A${firmasRow.number}:F${firmasRow.number}`);
  wsPlan.addRow([]);
  const firmas = wsPlan.addRow(['Docente del área', '', 'Coordinación académica', '', 'Rectoría', '']);
  firmas.eachCell({ includeEmpty: true }, c => { c.font = fontBold(10); c.alignment = alignCenter; });
  wsPlan.addRow(['_______________', '', '_______________', '', '_______________', '']).eachCell({ includeEmpty: true }, c => c.alignment = alignCenter);
  wsPlan.addRow(['Nombre y firma', '', 'Nombre y firma', '', 'Nombre y firma', '']).eachCell({ includeEmpty: true }, c => { c.font = fontNormal(8); c.alignment = alignCenter; });

  wsPlan.views = [{ state: 'frozen', ySplit: 4 }];

  const slug = `${(contexto.institucion || '').slice(0, 12)}_${contexto.grado}${contexto.grupo}_${cuadernillo.area}`.replace(/\s+/g, '_');
  const buf = await wb.xlsx.writeBuffer();
  descargarBlob(buf, `IDEA_Reporte_${slug}.xlsx`);
}
