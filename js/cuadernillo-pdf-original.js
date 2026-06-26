// cuadernillo-pdf-original.js — Descarga del cuadernillo con portada y contraportada
// PROPIAS de IDEA. Las páginas de preguntas son las originales del ICFES sin
// modificar (uso pedagógico). La primera página (portada ICFES) y la última
// (contraportada "FIN" ICFES) se REEMPLAZAN por las generadas por IDEA con su
// propio branding, evitando reproducir el branding institucional ICFES/MEN.
//
// Requiere pdf-lib cargado globalmente (window.PDFLib), pdf-lib@1.17 via CDN.

function urlPdfOriginal(cuadernillo) {
  if (!cuadernillo || !cuadernillo.id) return null;
  return `assets/cuadernillos-pdf/${cuadernillo.id}.pdf`;
}

async function cargarLogoIdeaBytes() {
  try {
    const res = await fetch('assets/logo-idea.png');
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) { return null; }
}

// Helper de dibujo: texto centrado horizontalmente en una página A4
function textoCentrado(page, txt, y, opts) {
  const { font, size, color } = opts;
  const w = font.widthOfTextAtSize(txt, size);
  const pageW = page.getWidth();
  page.drawText(txt, { x: (pageW - w) / 2, y: page.getHeight() - y, size, font, color });
}

/**
 * Descarga el PDF del cuadernillo: portada IDEA + páginas de preguntas
 * (sin la portada/contraportada ICFES) + contraportada IDEA con créditos.
 */
// Carga pdf-lib SOLO cuando se necesita (al descargar), para no bloquear el arranque de la página.
async function asegurarPdfLib() {
  if (window.PDFLib) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar pdf-lib (sin conexión).'));
    document.head.appendChild(s);
  });
}

// Descarga directa de un PDF ya empaquetado con identidad IDEA (sin re-envolver
// con pdf-lib). Se usa para los cuadernillos del BANCO PROPIO (ids "*-propio-*"),
// cuyos PDFs ya traen su propia portada/contraportada IDEA generadas por
// scripts/generar_pdf_p2.py. Evita duplicar portada y reaprovecha el branding.
async function descargarPdfDirecto(cuadernillo, url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se encontró el cuadernillo en ${url}.`);
  }
  const blob = await res.blob();
  const nombre = `IDEA_Cuadernillo_${(cuadernillo.area || 'area').replace(/\s+/g, '_')}_${cuadernillo.grado || ''}-P${cuadernillo.periodo || ''}.pdf`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombre;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 200);
}

export async function exportarCuadernilloOriginalPDF(cuadernillo) {
  const url = urlPdfOriginal(cuadernillo);
  if (!url) throw new Error('Cuadernillo sin id válido');

  // BANCO PROPIO (ids "*propio*"): el PDF en assets/cuadernillos-pdf/<id>.pdf YA
  // tiene la identidad IDEA (portada + contraportada + créditos de autoría propia).
  // Se descarga tal cual, sin pdf-lib, para no duplicar la portada.
  const idStr = String(cuadernillo.id || '');
  if (idStr.includes('propio') || /-propio-2023$/.test(idStr)) {
    return descargarPdfDirecto(cuadernillo, url);
  }

  // Camino clásico (cuadernillos ICFES, p. ej. 11° P1): se re-envuelve con pdf-lib
  // reemplazando portada/contraportada ICFES por las de IDEA.
  await asegurarPdfLib();

  // 1) Fetch del PDF original
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se encontró el cuadernillo en ${url}.`);
  }
  const bytesOriginal = new Uint8Array(await res.arrayBuffer());

  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  // 2) Cargar original + crear nuevo documento
  const pdfOrig = await PDFDocument.load(bytesOriginal);
  const pdfOut = await PDFDocument.create();

  pdfOut.setTitle(`IDEA — Cuadernillo ${cuadernillo.area} ${cuadernillo.grado}° P${cuadernillo.periodo}`);
  pdfOut.setAuthor('Plataforma IDEA');
  pdfOut.setSubject(`Prueba diagnóstica · ${cuadernillo.area} · Grado ${cuadernillo.grado}°`);
  pdfOut.setCreator('Plataforma IDEA — exportar cuadernillo');

  // Fuentes estándar (PDF built-in, no requiere embed externo)
  const fontBold = await pdfOut.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await pdfOut.embedFont(StandardFonts.Helvetica);
  const fontIt   = await pdfOut.embedFont(StandardFonts.HelveticaOblique);

  // Embed logo IDEA si está disponible
  const logoBytes = await cargarLogoIdeaBytes();
  const logo = logoBytes ? await pdfOut.embedPng(logoBytes) : null;

  // Paleta IDEA vivos clásicos
  const cRojo   = rgb(225/255, 29/255, 72/255);   // #E11D48
  const cDorado = rgb(251/255, 191/255, 36/255);  // #FBBF24
  const cNegro  = rgb(15/255, 15/255, 18/255);
  const cGris   = rgb(120/255, 120/255, 130/255);
  const cBlanco = rgb(1, 1, 1);
  const cMarfil = rgb(254/255, 249/255, 243/255);

  // ============= PORTADA IDEA =============
  const portada = pdfOut.addPage([595, 842]);  // A4 portrait
  const pW = portada.getWidth();
  const pH = portada.getHeight();

  // Fondo marfil
  portada.drawRectangle({ x: 0, y: 0, width: pW, height: pH, color: cMarfil });

  // Banda superior negra + franja dorada
  portada.drawRectangle({ x: 0, y: pH - 70, width: pW, height: 70, color: cNegro });
  portada.drawRectangle({ x: 0, y: pH - 72, width: pW, height: 2, color: cDorado });

  // Logo IDEA centrado en la banda negra (si carga)
  if (logo) {
    const logoH = 40;
    const logoW = (logo.width / logo.height) * logoH;
    portada.drawImage(logo, { x: pW/2 - logoW/2, y: pH - 56, width: logoW, height: logoH });
  } else {
    textoCentrado(portada, 'IDEA', 42, { font: fontBold, size: 22, color: cBlanco });
  }

  // Eyebrow
  textoCentrado(portada, 'INSTRUMENTO IDEA · CUADERNILLO DE PRUEBA', 130, { font: fontBold, size: 9, color: cDorado });

  // Título: nombre del cuadernillo
  textoCentrado(portada, cuadernillo.area || 'Cuadernillo', 180, { font: fontBold, size: 32, color: cNegro });

  // Subtítulo: grado + periodo
  textoCentrado(portada, `Grado ${cuadernillo.grado || ''}° · Período ${cuadernillo.periodo || ''}`, 215, { font: fontReg, size: 16, color: cRojo });

  // Línea divisoria dorada
  portada.drawRectangle({ x: pW/2 - 80, y: pH - 240, width: 160, height: 1.5, color: cDorado });

  // Card con datos
  const cardY = pH - 380;
  portada.drawRectangle({ x: 80, y: cardY, width: pW - 160, height: 110, color: cDorado });
  const cardCenter = cardY + 55;
  const nPreg = (cuadernillo.preguntas || []).length;
  const dur = cuadernillo.duracion_minutos || 60;
  textoCentrado(portada, `${nPreg} preguntas · ${dur} minutos recomendados`, pH - cardCenter - 22, { font: fontBold, size: 12, color: cNegro });
  textoCentrado(portada, `Tipo: ${cuadernillo.tipo || 'Diagnóstico'}`, pH - cardCenter - 4, { font: fontReg, size: 11, color: cNegro });
  textoCentrado(portada, 'Selecciona una única respuesta por pregunta', pH - cardCenter + 14, { font: fontIt, size: 10, color: cNegro });

  // Indicaciones generales
  const tituloIndY = 420;
  portada.drawText('Indicaciones generales', { x: 80, y: pH - tituloIndY, font: fontBold, size: 14, color: cNegro });
  portada.drawRectangle({ x: 80, y: pH - tituloIndY - 4, width: 40, height: 2, color: cDorado });

  const indicaciones = [
    'Lee detenidamente cada pregunta antes de responder.',
    'Selecciona una unica opcion por pregunta (A, B, C o D).',
    'Si hay figura, tabla o lectura, observala con atencion.',
    'Administra tu tiempo con calma — todas las preguntas valen lo mismo.',
    'No es necesario que respondas en orden; puedes regresar a una pregunta.',
    'No se penalizan respuestas incorrectas: si dudas, intenta tu mejor opcion.'
  ];
  let yInd = 450;
  indicaciones.forEach((t, i) => {
    portada.drawText(`${i + 1}.`, { x: 80, y: pH - yInd, font: fontBold, size: 10.5, color: cRojo });
    portada.drawText(t, { x: 100, y: pH - yInd, font: fontReg, size: 10.5, color: cNegro });
    yInd += 22;
  });

  // Footer de la portada
  portada.drawRectangle({ x: 80, y: 80, width: pW - 160, height: 0.6, color: cGris });
  textoCentrado(portada, 'Documento exportado por la Plataforma IDEA para uso del docente y del estudiante.', 778, { font: fontReg, size: 8.5, color: cGris });
  textoCentrado(portada, 'Las preguntas son material pedagogico de evaluacion del ICFES (vease pagina final).', 792, { font: fontIt, size: 8, color: cGris });
  textoCentrado(portada, new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' }), 808, { font: fontReg, size: 8, color: cGris });

  // ============= PÁGINAS DE PREGUNTAS =============
  // Copiar TODAS las páginas del PDF original EXCEPTO la primera (portada ICFES).
  // Antes se omitía también la última asumiendo que era contraportada "FIN ICFES",
  // pero en varios cuadernillos esa última página contiene preguntas reales y se
  // perdían. Mejor preservar todo el contenido pedagógico íntegro.
  const totalOrig = pdfOrig.getPageCount();
  const indicesACopiar = [];
  for (let i = 1; i < totalOrig; i++) indicesACopiar.push(i);  // omite solo [0] portada
  const paginasCopiadas = await pdfOut.copyPages(pdfOrig, indicesACopiar);
  paginasCopiadas.forEach(p => pdfOut.addPage(p));

  // ============= CONTRAPORTADA IDEA + CRÉDITOS =============
  const fin = pdfOut.addPage([595, 842]);

  fin.drawRectangle({ x: 0, y: 0, width: pW, height: pH, color: cMarfil });
  fin.drawRectangle({ x: 0, y: pH - 70, width: pW, height: 70, color: cNegro });
  fin.drawRectangle({ x: 0, y: pH - 72, width: pW, height: 2, color: cDorado });

  if (logo) {
    const logoH = 40;
    const logoW = (logo.width / logo.height) * logoH;
    fin.drawImage(logo, { x: pW/2 - logoW/2, y: pH - 56, width: logoW, height: logoH });
  } else {
    textoCentrado(fin, 'IDEA', 42, { font: fontBold, size: 22, color: cBlanco });
  }

  textoCentrado(fin, 'FIN DEL CUADERNILLO', 130, { font: fontBold, size: 9, color: cDorado });
  textoCentrado(fin, 'Gracias por presentar la prueba', 180, { font: fontBold, size: 24, color: cNegro });
  textoCentrado(fin, `${cuadernillo.area || ''} · Grado ${cuadernillo.grado || ''}°`, 210, { font: fontIt, size: 13, color: cRojo });

  fin.drawRectangle({ x: pW/2 - 60, y: pH - 240, width: 120, height: 1.5, color: cDorado });

  // Mensaje final
  const msgs = [
    'Verifica que hayas respondido todas las preguntas',
    'antes de cerrar el cuadernillo o entregarlo.',
    '',
    'Si presentaste la prueba en la plataforma IDEA,',
    'tu resultado estara disponible en tu panel del estudiante.'
  ];
  let yMsg = 290;
  msgs.forEach(t => {
    textoCentrado(fin, t, yMsg, { font: fontReg, size: 12, color: cNegro });
    yMsg += 22;
  });

  // Bloque de créditos al ICFES — coordenadas reescritas en sistema "desde TOP" para
  // evitar el solapamiento título/texto que tenía la versión anterior. pdf-lib usa
  // origen bottom-left, así que cada drawText recibe `y = pH - yTop`.
  const credLineas = [
    'Las preguntas, lecturas y opciones de respuesta de este cuadernillo son',
    'material pedagogico de evaluacion del Instituto Colombiano para la Evaluacion',
    'de la Educacion (ICFES). Se reproducen aqui con fines exclusivamente educativos',
    'y de practica, sin modificacion del contenido original.',
    '',
    'La portada, contraportada, diseno editorial y herramientas de analisis son',
    'propiedad de la Plataforma IDEA — Instrumento de Interpretacion de Datos para',
    'la Evaluacion del Aprendizaje. Autor: Alvaro Raul Cordoba Belalcazar.'
  ];
  const credBoxX = 60;
  const credBoxW = pW - 120;
  const credBoxTopY = 480;        // distancia desde arriba donde inicia la caja
  const lineH = 13;
  const padTop = 32;              // espacio dentro de la caja: título + raya
  const padBottom = 16;
  const credBoxH = padTop + (credLineas.length * lineH) + padBottom;
  // Fondo gris del bloque (pdf-lib: y desde bottom = pH - (top + height))
  fin.drawRectangle({
    x: credBoxX,
    y: pH - credBoxTopY - credBoxH,
    width: credBoxW,
    height: credBoxH,
    color: rgb(0.95, 0.95, 0.96)
  });
  // Título dentro de la caja (10pt padding desde el borde superior)
  fin.drawText('Creditos y fuente del material', {
    x: credBoxX + 20,
    y: pH - (credBoxTopY + 16),
    font: fontBold, size: 11, color: cNegro
  });
  // Raya dorada bajo el título (separador)
  fin.drawRectangle({
    x: credBoxX + 20,
    y: pH - (credBoxTopY + 22),
    width: 36, height: 1.5,
    color: cDorado
  });
  // Líneas del texto de créditos (cada una baja `lineH` desde el título)
  credLineas.forEach((line, i) => {
    const yTop = credBoxTopY + padTop + (i * lineH);
    fin.drawText(line, {
      x: credBoxX + 20,
      y: pH - yTop,
      font: fontReg, size: 9, color: rgb(0.30, 0.30, 0.35)
    });
  });

  // Footer fecha
  fin.drawRectangle({ x: 80, y: 80, width: pW - 160, height: 0.6, color: cGris });
  textoCentrado(fin, 'Plataforma IDEA · Documento exportado el ' + new Date().toLocaleDateString('es-CO'), 778, { font: fontReg, size: 8.5, color: cGris });
  textoCentrado(fin, 'Uso pedagogico — no comercializar', 792, { font: fontIt, size: 8, color: cGris });

  // ============= SERIALIZAR + DESCARGAR =============
  const pdfBytes = await pdfOut.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const nombre = `IDEA_Cuadernillo_${(cuadernillo.area || 'area').replace(/\s+/g, '_')}_${cuadernillo.grado || ''}-P${cuadernillo.periodo || ''}.pdf`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombre;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 200);
}

export { urlPdfOriginal };
