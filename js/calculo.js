// calculo.js — Lógica de puntaje, nivel, agregaciones, comparativos y conclusiones automáticas.
// Toda la matemática de IDEA vive aquí. Sin dependencias externas.

/**
 * Calcula el nivel de desempeño según fórmula canónica del Excel SJB.
 * @param {number} puntaje 0-100
 * @returns {'BAJO'|'BÁSICO'|'ALTO'|'SUPERIOR'}
 */
export function calcularNivel(puntaje) {
  if (puntaje <= 59) return 'BAJO';
  if (puntaje < 79) return 'BÁSICO';
  if (puntaje <= 90) return 'ALTO';
  return 'SUPERIOR';
}

// Semáforo de niveles según ICFES: BAJO=rojo, BÁSICO=naranja, ALTO=amarillo, SUPERIOR=verde.
export const COLOR_NIVEL = {
  BAJO: '#EF4444',
  'BÁSICO': '#F59E0B',
  ALTO: '#FBBF24',
  SUPERIOR: '#10B981'
};

/**
 * Dada una aplicación finalizada y el cuadernillo, calcula puntaje, nivel,
 * aciertos por pregunta (en orden ORIGINAL del cuadernillo) y total de correctas.
 */
export function calcularResultados(aplicacion, cuadernillo) {
  const n = cuadernillo.preguntas.length;
  const aciertos = new Array(n).fill(0);
  let totalCorrectas = 0;

  for (const r of aplicacion.respuestas) {
    const pregunta = cuadernillo.preguntas.find(p => p.id === r.pregunta_id);
    if (!pregunta) continue;
    const idxOriginal = cuadernillo.preguntas.indexOf(pregunta);
    if (r.opcion_elegida_real === pregunta.clave) {
      aciertos[idxOriginal] = 1;
      totalCorrectas++;
    }
  }

  const puntaje = Math.round((totalCorrectas / n) * 100);
  return {
    puntaje,
    nivel: calcularNivel(puntaje),
    aciertos_por_pregunta: aciertos,
    total_correctas: totalCorrectas
  };
}

/**
 * Calcula porcentajes de logro por competencia.
 * @param {number[]} aciertos array binario en orden original
 * @param {Cuadernillo} cuadernillo
 * @returns {Object} { 'a': 65, 'b': 50, 'c': 80 }
 */
export function logroPorCompetencia(aciertos, cuadernillo) {
  const totales = {};
  const correctas = {};
  cuadernillo.preguntas.forEach((p, i) => {
    totales[p.competencia] = (totales[p.competencia] || 0) + 1;
    correctas[p.competencia] = (correctas[p.competencia] || 0) + (aciertos[i] || 0);
  });
  const resultado = {};
  for (const k of Object.keys(totales)) {
    resultado[k] = Math.round((correctas[k] / totales[k]) * 100);
  }
  return resultado;
}

export function logroPorAfirmacion(aciertos, cuadernillo) {
  const totales = {};
  const correctas = {};
  cuadernillo.preguntas.forEach((p, i) => {
    const k = String(p.afirmacion);
    totales[k] = (totales[k] || 0) + 1;
    correctas[k] = (correctas[k] || 0) + (aciertos[i] || 0);
  });
  const r = {};
  for (const k of Object.keys(totales)) r[k] = Math.round((correctas[k] / totales[k]) * 100);
  return r;
}

export function logroPorEvidencia(aciertos, cuadernillo) {
  const totales = {};
  const correctas = {};
  cuadernillo.preguntas.forEach((p, i) => {
    totales[p.evidencia] = (totales[p.evidencia] || 0) + 1;
    correctas[p.evidencia] = (correctas[p.evidencia] || 0) + (aciertos[i] || 0);
  });
  const r = {};
  for (const k of Object.keys(totales)) r[k] = Math.round((correctas[k] / totales[k]) * 100);
  return r;
}

/**
 * Logro por la dimensión secundaria del área (CMC para MAT, componente para CN,
 * nivel_mcer para Inglés, null para LC/SC). Lee el campo correcto desde
 * area-config.js. Compatibilidad: la versión legacy logroPorCMC sigue funcionando
 * leyendo p.cmc directamente.
 */
export function logroPorDimensionSecundaria(aciertos, cuadernillo) {
  // Determinar el campo a leer: cmc, componente o nivel_mcer.
  // Sin import dinámico para no introducir dependencia circular:
  // resolvemos inline con prioridad cmc → componente → nivel_mcer.
  const sample = (cuadernillo.preguntas || []).find(p => p && (p.cmc || p.componente || p.nivel_mcer));
  if (!sample) return {};
  const campo = sample.cmc ? 'cmc' : (sample.componente ? 'componente' : (sample.nivel_mcer ? 'nivel_mcer' : 'cmc'));
  const totales = {};
  const correctas = {};
  cuadernillo.preguntas.forEach((p, i) => {
    const k = p[campo];
    if (!k) return;
    totales[k] = (totales[k] || 0) + 1;
    correctas[k] = (correctas[k] || 0) + (aciertos[i] || 0);
  });
  const r = {};
  for (const k of Object.keys(totales)) r[k] = Math.round((correctas[k] / totales[k]) * 100);
  return r;
}

/**
 * Compatibilidad legacy. Mismo cálculo pero forzando lectura del campo `cmc`.
 * Si una pregunta no tiene `cmc` se usa `componente` como fallback (CN duplica
 * ambos campos con el mismo valor).
 */
export function logroPorCMC(aciertos, cuadernillo) {
  const totales = {};
  const correctas = {};
  cuadernillo.preguntas.forEach((p, i) => {
    const k = p.cmc || p.componente;  // fallback al campo componente
    if (!k) return;
    totales[k] = (totales[k] || 0) + 1;
    correctas[k] = (correctas[k] || 0) + (aciertos[i] || 0);
  });
  const r = {};
  for (const k of Object.keys(totales)) r[k] = Math.round((correctas[k] / totales[k]) * 100);
  return r;
}

/**
 * Promedio del grupo a partir de N aplicaciones.
 */
export function promedioGrupo(aplicaciones) {
  if (!aplicaciones.length) return 0;
  const s = aplicaciones.reduce((acc, a) => acc + (a.puntaje || 0), 0);
  return Math.round(s / aplicaciones.length);
}

/**
 * Total de respuestas correctas por pregunta para el grupo.
 */
export function correctasPorPreguntaGrupo(aplicaciones, cuadernillo) {
  const n = cuadernillo.preguntas.length;
  const t = new Array(n).fill(0);
  for (const a of aplicaciones) {
    if (!a.aciertos_por_pregunta) continue;
    for (let i = 0; i < n; i++) t[i] += (a.aciertos_por_pregunta[i] || 0);
  }
  return t;
}

/**
 * Promedio de logro por competencia/afirmación/evidencia/CMC en un grupo.
 */
export function logroGrupoPor(funcionLogro, aplicaciones, cuadernillo) {
  if (!aplicaciones.length) return {};
  const acumulado = {};
  for (const a of aplicaciones) {
    const r = funcionLogro(a.aciertos_por_pregunta || [], cuadernillo);
    for (const k of Object.keys(r)) {
      acumulado[k] = (acumulado[k] || []).concat(r[k]);
    }
  }
  const out = {};
  for (const k of Object.keys(acumulado)) {
    const arr = acumulado[k];
    out[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

/**
 * Genera 5-8 oraciones de conclusiones automáticas en español natural.
 */
export function generarConclusiones(aplicaciones, cuadernillo) {
  if (!aplicaciones.length) return ['No hay datos suficientes para generar conclusiones.'];

  const oraciones = [];
  const prom = promedioGrupo(aplicaciones);
  const nivelGrupo = calcularNivel(prom);
  oraciones.push(`El grupo obtuvo un puntaje promedio de ${prom} sobre 100, ubicándose en el nivel ${nivelGrupo}.`);

  const logroComp = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  const compKeys = Object.keys(logroComp);
  if (compKeys.length) {
    const maxComp = compKeys.reduce((a, b) => logroComp[a] >= logroComp[b] ? a : b);
    const minComp = compKeys.reduce((a, b) => logroComp[a] <= logroComp[b] ? a : b);
    const nMax = cuadernillo.competencias[maxComp] || maxComp;
    const nMin = cuadernillo.competencias[minComp] || minComp;
    oraciones.push(`La fortaleza más marcada se identifica en la competencia de ${nMax} con un logro del ${logroComp[maxComp]}%.`);
    oraciones.push(`La principal oportunidad de mejora se encuentra en la competencia de ${nMin}, donde el logro alcanzó únicamente el ${logroComp[minComp]}%.`);
  }

  const logroDim2 = logroGrupoPor(logroPorDimensionSecundaria, aplicaciones, cuadernillo);
  const dim2Keys = Object.keys(logroDim2);
  if (dim2Keys.length) {
    const minDim2 = dim2Keys.reduce((a, b) => logroDim2[a] <= logroDim2[b] ? a : b);
    // Etiqueta amigable por área: "contenidos matemáticos curriculares", "componentes
    // temáticos", "niveles MCER" o fallback genérico.
    const area = (cuadernillo.area || '').toLowerCase();
    let etiquetaDim;
    if (area.includes('matemát')) etiquetaDim = 'los contenidos matemáticos curriculares';
    else if (area.includes('ciencias natural')) etiquetaDim = 'los componentes temáticos';
    else if (area.includes('ingl')) etiquetaDim = 'los niveles MCER';
    else etiquetaDim = 'las categorías evaluadas';
    oraciones.push(`En cuanto a ${etiquetaDim}, ${minDim2} presenta el desempeño más bajo con ${logroDim2[minDim2]}% de logro.`);
  }

  const correctas = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const masDificiles = correctas
    .map((c, i) => ({ pregunta: i + 1, correctas: c, evidencia: cuadernillo.preguntas[i].evidencia }))
    .sort((a, b) => a.correctas - b.correctas)
    .slice(0, 3);
  const lista = masDificiles.map(x => `P${x.pregunta} (evidencia ${x.evidencia})`).join(', ');
  oraciones.push(`Las preguntas con mayor dificultad para el grupo fueron ${lista}.`);

  if (aplicaciones.length > 1) {
    const ordenadas = [...aplicaciones].sort((a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin));
    const primera = ordenadas[0].puntaje;
    const ultima = ordenadas[ordenadas.length - 1].puntaje;
    const delta = ultima - primera;
    if (delta > 0) {
      oraciones.push(`Comparado con la primera aplicación, el grupo presenta una mejora de ${delta} puntos en la última aplicación.`);
    } else if (delta < 0) {
      oraciones.push(`Comparado con la primera aplicación, el grupo presenta un retroceso de ${Math.abs(delta)} puntos en la última aplicación.`);
    } else {
      oraciones.push(`El puntaje promedio se ha mantenido estable entre la primera y la última aplicación.`);
    }
  }

  oraciones.push(`Se recomienda focalizar las estrategias didácticas en las evidencias asociadas a las preguntas de mayor dificultad y construir el Plan de Mejora (Fase II) para llevarlo al aula en la Fase III.`);

  // Línea metodológica con fórmula LaTeX
  oraciones.push(`El puntaje individual se calcula como $\\;\\text{puntaje} = \\dfrac{\\text{aciertos}}{${cuadernillo.preguntas.length}} \\times 100\\;$ y el nivel se asigna según los umbrales canónicos del Excel SJB.`);
  return oraciones;
}

/**
 * Devuelve la fórmula LaTeX de la proyección SABER 11 (cálculo del Índice Global ponderado).
 */
export function formulaProyeccionSaber() {
  return {
    indice: '\\text{Índice Global} = \\dfrac{Mat \\cdot 3 + LC \\cdot 3 + Soc \\cdot 3 + CN \\cdot 3 + Ing \\cdot 1}{13}',
    puntaje: '\\text{Puntaje SABER} = \\text{Índice Global} \\times 5'
  };
}

/**
 * Histórico de un estudiante: ordena sus aplicaciones por fecha y devuelve serie temporal.
 */
export function historicoEstudiante(aplicacionesEstudiante) {
  return [...aplicacionesEstudiante]
    .sort((a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin))
    .map((a, i) => ({
      intento: i + 1,
      fecha: a.fecha_fin,
      puntaje: a.puntaje,
      nivel: a.nivel,
      total_correctas: a.total_correctas
    }));
}
