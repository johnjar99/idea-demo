// cargar-libs.js — Carga BAJO DEMANDA las librerías pesadas (solo cuando se exporta),
// para que NINGUNA página las descargue al abrir. Antes bloqueaban el arranque hasta
// con 4 MB de JavaScript; ahora la página abre al instante y la librería se trae solo
// en el momento exacto en que se necesita (al pulsar descargar/exportar).

const _cache = {};
function _cargarScript(src) {
  if (_cache[src]) return _cache[src];
  _cache[src] = new Promise((resolve, reject) => {
    // ¿Ya está en el DOM (por ejemplo cargada por otra acción)?
    const ya = Array.from(document.scripts).some(s => s.src === src);
    if (ya) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { delete _cache[src]; reject(new Error('No se pudo cargar la librería (¿sin conexión?): ' + src)); };
    document.head.appendChild(s);
  });
  return _cache[src];
}

export async function cargarJsPDF() {
  if (window.jspdf?.jsPDF || window.jsPDF) return;
  await _cargarScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
}
export async function cargarHtml2Canvas() {
  if (typeof window.html2canvas === 'function') return;
  await _cargarScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
}
export async function cargarExcelJS() {
  if (window.ExcelJS) return;
  await _cargarScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
}
export async function cargarPdfLib() {
  if (window.PDFLib) return;
  await _cargarScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
}

// Para PDF se necesitan ambas (jsPDF arma el documento, html2canvas fotografía el DOM).
export async function cargarLibsPDF() {
  await Promise.all([cargarJsPDF(), cargarHtml2Canvas()]);
}
