// shuffle.js — Randomización Fisher-Yates con seed opcional.
// Garantiza que cada estudiante reciba la prueba en orden distinto y opciones barajadas
// pero PRESERVA la trazabilidad: el orden original se reconstruye al calcular resultados.

/**
 * Fisher-Yates shuffle in-place.
 * @template T
 * @param {T[]} arr
 * @returns {T[]} mismo arr barajado
 */
export function fisherYates(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Devuelve nuevo array barajado sin mutar el original.
 */
export function barajado(arr) {
  return fisherYates([...arr]);
}

/**
 * Genera el "plan de aplicación" de un cuadernillo para un estudiante:
 * - orden de las preguntas (array de índices originales)
 * - para cada pregunta, el mapeo de opciones barajadas
 *
 * @param {Cuadernillo} cuadernillo
 * @returns {{ ordenPreguntas: number[], ordenesOpciones: Array<{original: string[], mostrada: string[]}> }}
 */
export function generarPlanAplicacion(cuadernillo) {
  const n = cuadernillo.preguntas.length;
  // Si el cuadernillo declara preservar_orden_preguntas, conservamos el orden
  // natural. Esto es obligatorio en áreas como Lectura Crítica, donde varias
  // preguntas dependen de un mismo texto/infografía y su numeración guía la
  // construcción de la respuesta.
  const ordenPreguntas = cuadernillo.preservar_orden_preguntas
    ? [...Array(n).keys()]
    : barajado([...Array(n).keys()]);
  const ordenesOpciones = cuadernillo.preguntas.map(p => {
    // Usar dinámicamente las llaves reales de opciones (A,B,C ó A,B,C,D) en lugar
    // de hardcodear 4 letras. Inglés Partes 2 y 3 usan A-C porque el cuadernillo
    // ICFES original solo presenta 3 opciones.
    const original = Object.keys(p.opciones || {}).sort();
    const mostrada = barajado([...original]);
    return { original, mostrada };
  });
  return { ordenPreguntas, ordenesOpciones };
}

/**
 * Dado el mapeo barajado y la opción que el estudiante eligió en pantalla (su posición visual),
 * devuelve la letra real de la opción seleccionada en el cuadernillo original.
 *
 * Ej: si en pantalla la opción "A" mostrada corresponde a la letra "C" del cuadernillo original,
 *      y el estudiante eligió "A", la función devuelve "C".
 *
 * @param {{original:string[], mostrada:string[]}} mapeo
 * @param {'A'|'B'|'C'|'D'} letraVisual letra que ve y selecciona el estudiante
 * @returns {'A'|'B'|'C'|'D'} letra real en el cuadernillo
 */
export function letraVisualARealReal(mapeo, letraVisual) {
  const i = mapeo.original.indexOf(letraVisual);
  return mapeo.mostrada[i];
}
