// extractor-imagenes.js - Resolución de imágenes y fallback a placeholder genérico.
//
// Las imágenes oficiales del cuadernillo se entregan como archivos físicos en `assets/img/`:
//   p01.svg, p02.svg ... p20.svg → enunciado de cada pregunta
//   p08_opA.svg ... p10_opD.svg  → opciones gráficas (P8 y P10)
//
// El JSON del cuadernillo apunta a estos archivos. Si se reemplazan en el futuro por
// PNG/JPG oficiales extraídos del cuadernillo, basta con cambiar la ruta del JSON.
// El placeholder genérico se usa solo si la ruta del JSON está rota.

const PLACEHOLDER_GENERICO = 'assets/img/_placeholder.svg';

/**
 * Construye el atributo src de la imagen del enunciado.
 * Prioridad: imagen_enunciado → imagen → null
 */
export function srcImagenPregunta(pregunta) {
  return pregunta.imagen_enunciado || pregunta.imagen || null;
}

/**
 * Devuelve el src de una opción gráfica (P8, P10) o null si la pregunta no tiene.
 */
export function srcImagenOpcion(pregunta, letra) {
  return pregunta.opciones_imagenes?.[letra] || null;
}

/**
 * Marca un <img> que ya falló para no entrar en loop con el placeholder.
 * Se usa como onerror inline.
 */
export const onerrorPlaceholder = `this.onerror=null;this.src='${PLACEHOLDER_GENERICO}';this.classList.add('img-fallback');`;

// === COPIA LIVIANA DE LAS FIGURAS (rendimiento) ======================================
// Las figuras del banco son PNG y muchas son ilustraciones fotográficas: un cuadernillo llega a
// pesar 8,4 MB solo en imágenes, que el estudiante debe esperar antes de empezar la prueba.
// `scripts/generar_webp.py` deja una copia .webp al lado de cada .png (~85% menos peso, sin
// diferencia visible). Los PNG originales NO se tocan: siguen ahí y siguen siendo los que usan
// los PDF, porque jsPDF no acepta WebP.
//
// En pantalla se pide la copia liviana y, si por cualquier razón no existe, el navegador cae al
// PNG original y solo si ese también falla aparece el placeholder. Así la prueba nunca se rompe.

/** Ruta de la copia liviana (.webp) de un PNG. Cualquier otra extensión se devuelve igual. */
export function srcLiviano(ruta) {
  if (!ruta || typeof ruta !== 'string') return ruta;
  return /\.png$/i.test(ruta) ? ruta.replace(/\.png$/i, '.webp') : ruta;
}

/**
 * onerror en dos escalones para una imagen servida en versión liviana:
 * 1º reintenta con el PNG original, 2º si tampoco carga, muestra el placeholder.
 * @param {string} rutaOriginal la ruta .png tal como viene en el JSON
 */
export function onerrorLiviano(rutaOriginal) {
  const orig = String(rutaOriginal || '').replace(/'/g, "\\'");
  return `if(!this.dataset.fb){this.dataset.fb='1';this.src='${orig}';}else{${onerrorPlaceholder}}`;
}

// Tablas referenciales que conserva el código antiguo (compatibilidad)
export function placeholderImagenPregunta() { return PLACEHOLDER_GENERICO; }
export function placeholderOpcion() { return PLACEHOLDER_GENERICO; }
export const DESCRIPCIONES_IMAGEN = {
  1: 'Pentágono de cinco casas',
  2: 'Tres planos cartesianos con figuras rotadas',
  3: 'Tabla de comercio entre países P, Q, R, S',
  6: 'Torre de Pisa inclinada 4° respecto a la vertical',
  7: 'Tres piscinas decoradas con baldosas',
  8: 'Gráfica de función escalonada',
  9: 'Diagrama circular de calidad del servicio',
  10: 'Diagrama de árbol de tres CDs',
  11: 'Curva de temperatura periódica',
  13: 'Figura compuesta con cuadrados P, R y triángulo S',
  17: 'Gráfica de ventas mensuales de dos productos',
  18: 'Recta numérica con un pingüino',
  19: 'Construcción geométrica con lados W, X, Y, Z',
  20: 'Elipse con semiejes mayor y menor'
};
