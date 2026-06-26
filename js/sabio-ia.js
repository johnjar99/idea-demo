// js/sabio-ia.js — "Sabio IA": motor de recomendaciones pedagógicas automáticas.
//
// Cruza los resultados REALES del grupo (logro por competencia / afirmación / evidencia /
// componente, calculados con calculo.js) con el catálogo DCE del cuadernillo y la base de
// estrategias didácticas por área (analisis.js) para AUTOCOMPLETAR el Plan de acción
// pedagógica: por cada oportunidad de mejora detectada propone una estrategia didáctica y
// un indicador de seguimiento, articulados con el marco evaluativo.
//
// No usa servicios externos: es un sistema experto determinista sobre los datos y el marco
// de la plataforma, presentado al docente como asistente "Sabio IA". El docente puede
// editar todo a su criterio: la IA propone, el docente decide.

import {
  logroGrupoPor, logroPorCompetencia, logroPorAfirmacion,
  logroPorEvidencia, logroPorDimensionSecundaria
} from './calculo.js';
import { generarRecomendacionesPersonalizables } from './analisis.js';
import { configArea, etiquetasMarco, tieneDimensionSecundaria, codigoAfirmacion } from './area-config.js';
import { estrategiasPedagogicas } from './sabio-pedagogia.js';
// Capa ADITIVA por grado para el Plan de Mejora. Lectura sincrona desde cache (el panel
// de plan de mejora precarga el JSON). Si no hay celda por grado, todo cae al comportamiento
// actual (recomendaciones por area + base experta por banda).
import { pedagogiaDeSync, areaSlugDeCuadernillo, esVivoProtegido } from './pedagogia-grado.js';

// Mapea el área del cuadernillo a la clave de la base pedagógica experta (mat/lc/cn/sc/in).
function areaKeyDe(cuadernillo, cfg) {
  const s = (cuadernillo.area || cuadernillo.materia || (cfg && (cfg.nombre || cfg.etiqueta)) || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/matematic|numeric/.test(s)) return 'mat';
  if (/lectura|lenguaje|lengua|critic/.test(s)) return 'lc';
  if (/natural|biolog|quimic|fisic/.test(s)) return 'cn';
  if (/social|ciudadan|historia|geograf/.test(s)) return 'sc';
  if (/ingl|english/.test(s)) return 'in';
  return null;
}

const UMBRAL_OPORTUNIDAD = 75;   // logro (%) por debajo del cual algo es "oportunidad de mejora"
const MAX_FILAS = 5;

export function nivelDeLogro(pct) {
  if (pct <= 59) return 'BAJO';
  if (pct <= 78) return 'BÁSICO';
  if (pct <= 90) return 'ALTO';
  return 'SUPERIOR';
}

function _codAfir(cuadernillo, k) {
  try { return codigoAfirmacion(cuadernillo, k) || k; } catch { return k; }
}
function mapaAfirComp(cuadernillo) {
  const m = {};
  (cuadernillo.preguntas || []).forEach(p => { if (p.afirmacion != null && p.competencia) m[String(p.afirmacion)] = p.competencia; });
  return m;
}
function evidenciaMasDebil(afir, logEvid) {
  const evs = Object.keys(logEvid).filter(e => String(e).split('.')[0] === String(afir));
  if (!evs.length) return null;
  const k = evs.reduce((a, b) => logEvid[a] <= logEvid[b] ? a : b);
  return { codigo: k, pct: logEvid[k] };
}
function estrategiaFallback(foco) {
  return `Implementar una secuencia didáctica graduada centrada en "${foco}": modelación del docente, práctica guiada con ejemplos del contexto del estudiante, y retroalimentación inmediata y específica sobre el error, no solo sobre el resultado.`;
}

/**
 * Genera el Plan de acción a partir de los resultados del grupo.
 * @returns {{filas: Array<{oportunidades,estrategias,seguimiento}>, resumen: object|null}}
 */
export function generarPlanAccionIA(apsGrupo, cuadernillo) {
  if (!apsGrupo || !apsGrupo.length || !cuadernillo) return { filas: [], resumen: null };
  const ET = etiquetasMarco(cuadernillo);
  const cfg = configArea(cuadernillo);
  const hayDim2 = tieneDimensionSecundaria(cuadernillo);
  const dim2Nombre = cfg?.dimension_secundaria?.etiqueta_singular || 'componente';
  // Base pedagógica experta por área y grado (estrategias y ejemplos investigados).
  let expertas = null; try { const ak = areaKeyDe(cuadernillo, cfg); if (ak) expertas = estrategiasPedagogicas(ak, cuadernillo.grado); } catch { expertas = null; }
  let expIdx = 0;

  // Capa POR GRADO (aditiva): sugerencias de plan de mejora especificas de este grado.
  // Mismo esquema que la plantilla (competencia/afirmacion/dim_secundaria). Se exponen como:
  //   - sugPorComp[comp], sugPorAfir[n], sugPorDim2[cat]  (indexadas, prioridad por dimension)
  //   - sugPlanGrado (cola plana de respaldo)
  // Si no hay celda por grado, todos quedan vacios => comportamiento actual intacto.
  const sugPorComp = {}, sugPorAfir = {}, sugPorDim2 = {}, sugPlanGrado = [];
  try {
    const slugPG = esVivoProtegido(cuadernillo) ? null : areaSlugDeCuadernillo(cuadernillo);
    const pm = slugPG ? pedagogiaDeSync(slugPG, cuadernillo.grado, 'plan_mejora_sugerencias') : null;
    if (pm && typeof pm === 'object') {
      Object.entries(pm.competencia || {}).forEach(([k, arr]) => { if (Array.isArray(arr) && arr.length) { sugPorComp[k] = arr.slice(); sugPlanGrado.push(...arr); } });
      Object.entries(pm.afirmacion || {}).forEach(([k, arr]) => { if (Array.isArray(arr) && arr.length) { sugPorAfir[String(k)] = arr.slice(); sugPlanGrado.push(...arr); } });
      Object.entries(pm.dim_secundaria || {}).forEach(([k, arr]) => { if (Array.isArray(arr) && arr.length) { sugPorDim2[k] = arr.slice(); sugPlanGrado.push(...arr); } });
    }
  } catch { /* fallback total */ }
  let sugIdx = 0;

  const logAfir = logroGrupoPor(logroPorAfirmacion, apsGrupo, cuadernillo);
  const logEvid = logroGrupoPor(logroPorEvidencia, apsGrupo, cuadernillo);
  const logDim2 = hayDim2 ? logroGrupoPor(logroPorDimensionSecundaria, apsGrupo, cuadernillo) : {};
  const recs = generarRecomendacionesPersonalizables(apsGrupo, cuadernillo) || [];
  const afirComp = mapaAfirComp(cuadernillo);

  // Estrategias reales (de la base por área) indexadas por la dimensión a la que se articulan.
  const estrPorAfir = {}, estrPorComp = {};
  const pool = [];
  recs.forEach(r => {
    const a = r.articula_con || {};
    if (r.accion_detallada) pool.push(r.accion_detallada);
    if (a.afirmacion) (estrPorAfir[String(a.afirmacion)] = estrPorAfir[String(a.afirmacion)] || []).push(r.accion_detallada);
    if (a.competencia) (estrPorComp[a.competencia] = estrPorComp[a.competencia] || []).push(r.accion_detallada);
  });
  let poolIdx = 0;
  const usadasEstr = new Set();
  const tomarEstrategia = (afir, comp, foco, dim2) => {
    let e = (estrPorAfir[afir] || []).filter(x => !usadasEstr.has(x)).slice(0, 1);
    if (!e.length && comp) e = (estrPorComp[comp] || []).filter(x => !usadasEstr.has(x)).slice(0, 1);
    while (!e.length && poolIdx < pool.length) { const c = pool[poolIdx++]; if (!usadasEstr.has(c)) e = [c]; }
    // Capa POR GRADO: sugerencias del plan de mejora especificas del grado, articuladas a la
    // dimension del foco (afirmacion / dim secundaria / competencia) y, si no, la cola plana.
    if (!e.length && afir != null && sugPorAfir[String(afir)]) e = sugPorAfir[String(afir)].filter(x => !usadasEstr.has(x)).slice(0, 1);
    if (!e.length && dim2 != null && sugPorDim2[dim2]) e = sugPorDim2[dim2].filter(x => !usadasEstr.has(x)).slice(0, 1);
    if (!e.length && comp != null && sugPorComp[comp]) e = sugPorComp[comp].filter(x => !usadasEstr.has(x)).slice(0, 1);
    while (!e.length && sugIdx < sugPlanGrado.length) { const c = sugPlanGrado[sugIdx++]; if (!usadasEstr.has(c)) e = [c]; }
    if (!e.length && expertas && expertas.estrategias && expIdx < expertas.estrategias.length) e = [expertas.estrategias[expIdx++]];
    if (!e.length) e = [estrategiaFallback(foco)];
    e.forEach(x => usadasEstr.add(x));
    return e[0];
  };

  const filas = [];

  // 1) Oportunidades por AFIRMACIÓN débil (las más bajas bajo el umbral).
  const afirOrden = Object.keys(logAfir).sort((x, y) => logAfir[x] - logAfir[y]);
  for (const k of afirOrden) {
    if (filas.length >= MAX_FILAS - (hayDim2 ? 1 : 0)) break;
    const pct = logAfir[k];
    if (pct >= UMBRAL_OPORTUNIDAD) break;
    const cod = _codAfir(cuadernillo, k);
    const nomAfir = cuadernillo.afirmaciones?.[k] || `${ET.afirmacion_singular} ${k}`;
    const ev = evidenciaMasDebil(k, logEvid);
    const comp = afirComp[k];
    const nomComp = comp ? (cuadernillo.competencias?.[comp] || comp) : null;

    let oportunidad = `${ET.afirmacion_singular} ${cod} (${pct}%, nivel ${nivelDeLogro(pct)}): ${nomAfir}`;
    if (nomComp) oportunidad += ` — ${ET.competencia_singular.toLowerCase()} ${comp}. ${nomComp}.`;
    if (ev) oportunidad += ` La ${ET.evidencia_singular.toLowerCase()} más débil es ${ev.codigo} (${ev.pct}%).`;

    const meta = Math.min(pct + 20, 80);
    const seguimiento = `Re-aplicar ítems de ${ET.afirmacion_singular.toLowerCase()} ${cod} al cierre del período; meta: pasar de ${pct}% a ≥${meta}%. Evidencia formativa: quiz corto y rúbrica de proceso, con registro por estudiante.`;

    filas.push({ oportunidades: oportunidad, estrategias: tomarEstrategia(k, comp, nomAfir), seguimiento });
  }

  // 2) Oportunidad por DIMENSIÓN SECUNDARIA (componente / CMC / nivel MCER) si el área la tiene.
  if (hayDim2) {
    const d2keys = Object.keys(logDim2).sort((x, y) => logDim2[x] - logDim2[y]);
    const d2 = d2keys[0];
    if (d2 != null && logDim2[d2] < UMBRAL_OPORTUNIDAD && filas.length < MAX_FILAS) {
      const pct = logDim2[d2];
      const meta = Math.min(pct + 20, 80);
      filas.push({
        oportunidades: `${dim2Nombre.charAt(0).toUpperCase() + dim2Nombre.slice(1)} "${d2}" (${pct}%, nivel ${nivelDeLogro(pct)}): es el ${dim2Nombre} con menor desempeño del grupo.`,
        estrategias: tomarEstrategia(null, null, d2, d2),
        seguimiento: `Diseñar una unidad corta centrada en "${d2}" y verificar el avance con una prueba breve al final; meta: ≥${meta}%.`
      });
    }
  }

  // 3) Grupo fuerte (nada bajo el umbral): proponer profundización del punto relativamente más bajo.
  if (!filas.length) {
    const k = afirOrden[0];
    if (k != null) {
      const pct = logAfir[k];
      const cod = _codAfir(cuadernillo, k);
      filas.push({
        oportunidades: `El grupo muestra buen desempeño general. El punto relativamente más bajo es ${ET.afirmacion_singular.toLowerCase()} ${cod} (${pct}%).`,
        estrategias: `Profundizar con tareas de mayor demanda cognitiva (análisis, argumentación y transferencia a nuevos contextos) sobre ${ET.afirmacion_singular.toLowerCase()} ${cod}, para consolidar el dominio.`,
        seguimiento: `Mantener el nivel con retos quincenales; verificar que ${ET.afirmacion_singular.toLowerCase()} ${cod} se sostenga en ≥80%.`
      });
    }
  }

  const promedio = Math.round(apsGrupo.reduce((s, a) => s + (a.puntaje || 0), 0) / apsGrupo.length);
  const n = filas.length;
  return {
    filas,
    resumen: {
      estudiantes: apsGrupo.length,
      promedio,
      oportunidades: n,
      mensaje: `Analicé los ${apsGrupo.length} resultados del grupo (promedio ${promedio}%) y detecté ${n} oportunidad${n === 1 ? '' : 'es'} de mejora prioritaria${n === 1 ? '' : 's'}. Para cada una propuse una estrategia didáctica y un seguimiento, articulados con el marco DCE del área${expertas ? ` y con el enfoque experto de ${expertas.area} en ${expertas.banda}` : ''}. Revísalos y ajústalos a tu criterio profesional.`
    }
  };
}

/**
 * Insight contextual breve para el asistente Sabio IA (reutilizable en paneles).
 * Devuelve { expr, texto, accion } para mostrar en una burbuja.
 */
export function insightSabioIA(apsGrupo, cuadernillo) {
  if (!apsGrupo || !apsGrupo.length || !cuadernillo) {
    return { expr: 'saludando', texto: 'Soy Sabio IA. Cuando haya resultados del grupo, analizaré los datos y te propondré un plan de acción automáticamente.', accion: null };
  }
  const logAfir = logroGrupoPor(logroPorAfirmacion, apsGrupo, cuadernillo);
  const hayDim2 = tieneDimensionSecundaria(cuadernillo);
  const logDim2 = hayDim2 ? logroGrupoPor(logroPorDimensionSecundaria, apsGrupo, cuadernillo) : {};
  const cfg = configArea(cuadernillo);
  const ET = etiquetasMarco(cuadernillo);
  let foco = null, pct = 100, tipo = '';
  const aK = Object.keys(logAfir).sort((x, y) => logAfir[x] - logAfir[y])[0];
  if (aK != null) { foco = `${ET.afirmacion_singular.toLowerCase()} ${_codAfir(cuadernillo, aK)}`; pct = logAfir[aK]; tipo = 'afir'; }
  if (hayDim2) {
    const dK = Object.keys(logDim2).sort((x, y) => logDim2[x] - logDim2[y])[0];
    if (dK != null && logDim2[dK] < pct) { foco = `${cfg?.dimension_secundaria?.etiqueta_singular || 'componente'} ${dK}`; pct = logDim2[dK]; tipo = 'dim2'; }
  }
  if (!foco) return { expr: 'feliz', texto: '¡El grupo va muy bien! No detecto oportunidades críticas; te sugiero profundizar para sostener el nivel.', accion: null };
  return {
    expr: pct < 60 ? 'pensativo' : 'animando',
    texto: `Detecté una oportunidad de mejora en ${foco} (${pct}%, nivel ${nivelDeLogro(pct)}). ¿Genero el plan de acción para la Fase II?`,
    accion: { tipo: 'autocompletar-plan', foco, pct }
  };
}
