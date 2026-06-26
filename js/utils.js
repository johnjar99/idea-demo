// utils.js — Helpers comunes (UUID, fechas, validación, slugify, encoding)
// Sin dependencias externas. Funciones puras reutilizables.

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  const def = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('es-CO', { ...def, ...opts });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

export function slugify(str) {
  return String(str || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function documentoValido(doc) {
  return /^\d{6,15}$/.test(String(doc || '').trim());
}

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Conversión segundos → "MM:SS"
export function segundosAReloj(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Promedio aritmético seguro
export function promedio(arr) {
  const vals = arr.filter(v => Number.isFinite(v));
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Redondeo a un decimal
export function redondear(n, decimales = 0) {
  const f = Math.pow(10, decimales);
  return Math.round(n * f) / f;
}

// Descarga de blob como archivo
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Mostrar toast simple (requiere un div #toast-container en la página)
export function toast(mensaje, tipo = 'info', durMs = 3000) {
  const cont = document.getElementById('toast-container') || crearToastContainer();
  const t = document.createElement('div');
  const colores = {
    info: 'bg-slate-800 text-white',
    exito: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    aviso: 'bg-amber-500 text-white'
  };
  t.className = `${colores[tipo] || colores.info} px-5 py-3 rounded-xl shadow-lg mb-2 animate-fade-in`;
  t.textContent = mensaje;
  cont.appendChild(t);
  setTimeout(() => t.remove(), durMs);
}

function crearToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'fixed top-5 right-5 z-50 flex flex-col items-end';
  document.body.appendChild(c);
  return c;
}

/**
 * Renderiza expresiones LaTeX dentro de un elemento usando KaTeX (cargado via CDN).
 * Llamar después de insertar HTML dinámico con contenido matemático.
 * Si KaTeX aún no cargó, espera hasta 6 segundos por llamada (contador local, no global).
 * @param {HTMLElement} [elemento=document.body]
 */
export function renderMath(elemento, _intentos = 0) {
  const el = elemento || document.body;
  if (typeof window === 'undefined' || !el) return;
  if (typeof window.renderMathInElement !== 'function') {
    if (_intentos < 60) {
      setTimeout(() => renderMath(el, _intentos + 1), 100);
    } else {
      console.warn('KaTeX no cargó después de 6s. Las fórmulas no se renderizarán en', el);
    }
    return;
  }
  try {
    window.renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false,
      trust: false,
      strict: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
    });
  } catch (e) {
    console.warn('renderMath error:', e);
  }
}

// Re-render automático global cuando KaTeX termine de cargar (asegura render inicial)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const _renderInicial = () => {
    if (typeof window.renderMathInElement === 'function') {
      renderMath(document.body);
    } else {
      setTimeout(_renderInicial, 150);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _renderInicial);
  } else {
    _renderInicial();
  }
}

/**
 * Renderiza una expresión LaTeX a string HTML usando KaTeX (sin DOM).
 * Útil para insertar HTML pre-renderizado en componentes.
 * @param {string} latex
 * @param {boolean} display
 */
export function latexToHtml(latex, display = false) {
  if (typeof window.katex !== 'object' || !window.katex.renderToString) {
    return escapeHtml(latex);
  }
  try {
    return window.katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false });
  } catch (e) {
    return escapeHtml(latex);
  }
}

/**
 * Renderiza una fórmula LaTeX a PNG dataURL usando KaTeX + html2canvas.
 * Útil para embeber fórmulas en PDF (jsPDF) o Excel (ExcelJS) como imágenes.
 * Requiere html2canvas cargado globalmente.
 * @param {string} latex
 * @param {Object} [opciones]
 * @returns {Promise<string>} dataURL PNG
 */
export async function latexToPng(latex, opciones = {}) {
  const display = !!opciones.display;
  const scale = opciones.scale || 3;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;padding:8px;background:#FFF;font-size:'+(opciones.fontSize||16)+'px;';
  wrap.innerHTML = latexToHtml(latex, display);
  document.body.appendChild(wrap);
  try {
    if (typeof window.html2canvas !== 'function') {
      console.warn('html2canvas no disponible para latexToPng');
      return null;
    }
    const canvas = await window.html2canvas(wrap, { scale, backgroundColor: '#FFFFFF', logging: false });
    return canvas.toDataURL('image/png');
  } finally {
    wrap.remove();
  }
}
