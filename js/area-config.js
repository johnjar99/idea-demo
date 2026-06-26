// area-config.js — Configuración por área del marco evaluativo IDEA.
//
// Cada área (Matemáticas, Lectura Crítica, Sociales y Ciudadanas, Ciencias
// Naturales, Inglés) tiene una arquitectura distinta de competencias, afirmaciones,
// evidencias y "dimensión secundaria" (CMC, componente, nivel MCER, etc.).
// Este módulo concentra esa configuración para que los paneles (docente, directivo,
// resultado, plan-mejora) y los exports (PDF, Excel, Word) NO hardcodeen "CMC" ni
// asuman estructura de Matemáticas.
//
// Llaves canónicas de slug de área:
//   'matemáticas' | 'lectura crítica' | 'sociales y ciudadanas' |
//   'ciencias naturales' | 'inglés'

/** Normaliza el nombre del área a slug canónico. */
export function areaSlug(cuadernillo) {
  const area = (cuadernillo && cuadernillo.area || '').toLowerCase().trim();
  return area;
}

/**
 * Configuración completa por área. Cada entrada documenta:
 *   - dimension_secundaria: { campo, etiqueta, etiqueta_singular, icono, paleta }
 *                           o null si el área no tiene una segunda dimensión
 *                           más allá de competencia/afirmación/evidencia.
 *   - usa_evidencias: boolean. Algunas áreas no aprovechan la granularidad de
 *                     evidencia (LC con 1 competencia las vuelve redundantes).
 *   - dimension_principal_override: opcional. Si una área debe presentar otra
 *                                   dimensión como "principal" en lugar de
 *                                   competencia (ej. Inglés muestra MCER).
 */
// Etiquetas por defecto del marco DCE (aplican a MAT, LC, SC, CN).
// Inglés las sobrescribe con "Partes", "Niveles MCER", "Evidencias por nivel y parte"
// porque no usa DCE oficialmente.
const ETIQUETAS_DCE_DEFAULT = {
  competencia_plural: 'Competencias',
  competencia_singular: 'Competencia',
  competencia_codigo: 'Competencia',  // prefijo "Competencia a." en chips
  afirmacion_plural: 'Afirmaciones',
  afirmacion_singular: 'Afirmación',
  afirmacion_codigo: 'Afirmación',    // prefijo "Afirmación 1:" en chips
  evidencia_plural: 'Evidencias de aprendizaje',
  evidencia_singular: 'Evidencia',
  evidencia_codigo: 'Evidencia',
  icono_competencia: '📘',
  icono_afirmacion: '📗',
  icono_evidencia: '📙'
};

const AREAS = {
  'matemáticas': {
    nombre_display: 'Matemáticas',
    sigla: 'MAT',
    color_chip: '#3B82F6',
    marco_evaluativo: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Estándares Básicos de Competencias en Matemáticas del MEN',
    etiquetas: ETIQUETAS_DCE_DEFAULT,
    dimension_secundaria: {
      campo: 'cmc',
      etiqueta: 'Contenidos Matemáticos Curriculares',
      etiqueta_corta: 'CMC',
      etiqueta_singular: 'contenido curricular',
      icono: '📕',
      paleta: ['#5EEAD4', '#A78BFA', '#FB923C', '#F9A8D4', '#86EFAC', '#FDE68A']
    },
    usa_evidencias: true,
    catalogo_recomendaciones: 'matematicas'  // slug en plan_mejora_plantilla.json
  },
  'lectura crítica': {
    nombre_display: 'Lectura Crítica',
    sigla: 'LC',
    color_chip: '#EF4444',
    marco_evaluativo: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Lineamientos Curriculares de Lengua Castellana del MEN',
    etiquetas: ETIQUETAS_DCE_DEFAULT,
    dimension_secundaria: null,
    usa_evidencias: true,
    // LC ahora usa las 3 COMPETENCIAS oficiales del MBE ICFES (1, 2, 3) en lugar
    // de la antigua competencia única "a". Cada pregunta tiene asignada su
    // competencia (1, 2 o 3) según la afirmación a la que pertenece.
    catalogo_recomendaciones: 'lectura_critica'
  },
  'sociales y ciudadanas': {
    nombre_display: 'Sociales y Ciudadanas',
    sigla: 'SC',
    color_chip: '#B5775E',
    marco_evaluativo: 'Diseño Centrado en Evidencias (DCE) del ICFES, los Estándares de Ciencias Sociales y Competencias Ciudadanas del MEN y la Constitución Política de 1991',
    etiquetas: ETIQUETAS_DCE_DEFAULT,
    dimension_secundaria: null,  // SC no tiene componentes; las 5 afirmaciones son su riqueza
    usa_evidencias: true,
    catalogo_recomendaciones: 'sociales_ciudadanas'
  },
  'ciencias naturales': {
    nombre_display: 'Ciencias Naturales',
    sigla: 'CN',
    color_chip: '#10B981',
    marco_evaluativo: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Estándares Básicos de Competencias en Ciencias Naturales del MEN',
    etiquetas: ETIQUETAS_DCE_DEFAULT,
    dimension_secundaria: {
      campo: 'componente',  // El campo correcto del marco MEN
      etiqueta: 'Componentes temáticos',
      etiqueta_corta: 'Componente',
      etiqueta_singular: 'componente temático',
      icono: '🧬',
      // Paleta TOTALMENTE DISTINTA de la PALETA_AFIR de competencias/afirmaciones/evidencias
      // (que es azul/ámbar/violeta/verde/magenta/cian/lima/coral). Aquí usamos
      // tonos saturados y diferenciados que no se confundan con el marco DCE:
      // turquesa profundo, vino tinto, terracota y mostaza oscuro.
      paleta: ['#0F766E', '#9D174D', '#C2410C', '#854D0E']
    },
    usa_evidencias: true,
    catalogo_recomendaciones: 'ciencias_naturales'
  },
  'inglés': {
    nombre_display: 'Inglés',
    sigla: 'IN',
    color_chip: '#8B5CF6',
    marco_evaluativo: 'Marco Común Europeo de Referencia para las lenguas (MCER) y los Estándares Básicos de Competencias en Lenguas Extranjeras: Inglés del MEN',
    // Estructura OFICIAL ICFES vigente del JSON:
    //   competencias = las 5 Partes del cuadernillo (a..e)
    //   afirmaciones = los 4 niveles MCER (1=Pre A1, 2=A1, 3=A2, 4=B1)
    //   evidencias = combinación nivel.parte
    // Inglés es la ÚNICA área donde ICFES NO usa DCE. Las guías de orientación
    // del ICFES reportan cada pregunta etiquetada SOLO con su nivel MCER como
    // descriptor pedagógico (la Parte es contexto del cuadernillo, no unidad
    // diagnóstica). Para evitar confusiones, en Inglés se muestra ÚNICAMENTE
    // el panel de Niveles MCER. Las Partes se conservan como contexto pero
    // no como bloque diagnóstico independiente.
    etiquetas: {
      competencia_plural: 'Partes del cuadernillo',
      competencia_singular: 'Parte',
      competencia_codigo: 'Parte',
      afirmacion_plural: 'Niveles MCER',
      afirmacion_singular: 'Nivel MCER',
      afirmacion_codigo: 'Nivel',
      evidencia_plural: 'Habilidades por nivel y parte',
      evidencia_singular: 'Habilidad',
      evidencia_codigo: 'Habilidad',
      icono_competencia: '📑',
      icono_afirmacion: '🌐',
      icono_evidencia: '🎯'
    },
    // Solo el panel de Niveles MCER se muestra en la UI. Las Partes y
    // las Habilidades por nivel y parte se ocultan para evitar redundancia
    // con la presentación de la guía oficial ICFES.
    paneles_visibles: {
      competencia: false,
      afirmacion: true,
      evidencia: false,
      dimension_secundaria: false
    },
    // Para el número de afirmación 1-4, la UI debe mostrar el nivel MCER
    // correspondiente como aparece en la guía oficial ICFES.
    codigos_afirmacion: {
      '1': 'Pre A1',
      '2': 'A1',
      '3': 'A2',
      '4': 'B1'
    },
    dimension_secundaria: null,
    // Versión alternativa (adaptación DCE: 3 competencias lingüístico/pragmático/comprensión)
    // preservada en datos/cuadernillo_in_11_p1_2023_v_adaptado_dce.json para uso futuro opcional.
    usa_evidencias: true,
    catalogo_recomendaciones: 'ingles'
  }
};

/** Devuelve la configuración del área. Fallback a Matemáticas si el slug no se conoce. */
export function configArea(cuadernillo) {
  const slug = areaSlug(cuadernillo);
  return AREAS[slug] || AREAS['matemáticas'];
}

/**
 * Devuelve las etiquetas (plural/singular/código + iconos) que debe usar la UI
 * para los tres niveles del marco evaluativo de un área. Para DCE estándar
 * (MAT/LC/SC/CN) son "Competencias / Afirmaciones / Evidencias". Para Inglés
 * son "Partes del cuadernillo / Niveles MCER / Habilidades por nivel y parte".
 */
export function etiquetasMarco(cuadernillo) {
  const cfg = configArea(cuadernillo);
  return cfg.etiquetas || {
    competencia_plural: 'Competencias', competencia_singular: 'Competencia', competencia_codigo: 'Competencia',
    afirmacion_plural: 'Afirmaciones', afirmacion_singular: 'Afirmación', afirmacion_codigo: 'Afirmación',
    evidencia_plural: 'Evidencias de aprendizaje', evidencia_singular: 'Evidencia', evidencia_codigo: 'Evidencia',
    icono_competencia: '📘', icono_afirmacion: '📗', icono_evidencia: '📙'
  };
}

/**
 * Devuelve qué paneles del marco evaluativo debe mostrar la UI para un área.
 * Por defecto los 4 paneles (competencia, afirmación, evidencia, dimensión
 * secundaria) son visibles. Inglés sobreescribe esto para mostrar solo el
 * panel de Niveles MCER (afirmación), siguiendo la presentación oficial ICFES.
 */
export function panelesVisibles(cuadernillo) {
  const cfg = configArea(cuadernillo);
  return cfg.paneles_visibles || {
    competencia: true,
    afirmacion: true,
    evidencia: true,
    dimension_secundaria: true
  };
}

/**
 * Convierte el código numérico de afirmación (1, 2, 3...) al label que la UI
 * debe mostrar. Para áreas DCE estándar devuelve el número tal cual. Para
 * Inglés devuelve el nivel MCER correspondiente: 1→"Pre A1", 2→"A1", 3→"A2",
 * 4→"B1". Esto evita que el docente vea "Nivel 1" cuando la guía ICFES
 * habla de "Nivel Pre A1".
 */
export function codigoAfirmacion(cuadernillo, num) {
  const cfg = configArea(cuadernillo);
  const s = String(num);
  if (cfg.codigos_afirmacion && cfg.codigos_afirmacion[s]) {
    return cfg.codigos_afirmacion[s];
  }
  return s;
}

/**
 * SEMÁFORO EMPÍRICO DE DESEMPEÑO. Único en toda la plataforma.
 * Dado un porcentaje de aciertos del grupo (0-100), devuelve color, label
 * y texto explicativo. Cortes canónicos:
 *   0-35   → ROJO   "Crítico"   (pregunta que el grupo NO domina)
 *   35-65  → AMBAR  "Por mejorar" (dominio parcial)
 *   65-100 → VERDE  "Dominio"   (la mayoría acertó)
 *
 * Estos cortes son INDEPENDIENTES de los niveles de desempeño del estudiante
 * individual (BAJO/BÁSICO/ALTO/SUPERIOR), que tienen otra escala.
 */
export const SEMAFORO_CORTES = { rojo_max: 35, ambar_max: 65 };
export function semaforoDesempeno(porcentaje) {
  const p = Number(porcentaje) || 0;
  if (p < SEMAFORO_CORTES.rojo_max) {
    return {
      color: '#EF4444',
      colorTexto: '#FFFFFF',
      label: 'BAJO',
      labelLargo: 'Bajo — la mayoría no acertó (<35%)',
      rango: '< 35%',
      pct: p
    };
  }
  if (p < SEMAFORO_CORTES.ambar_max) {
    return {
      color: '#F59E0B',
      colorTexto: '#FFFFFF',
      label: 'MEDIO',
      labelLargo: 'Medio — dominio parcial (35-65%)',
      rango: '35–65%',
      pct: p
    };
  }
  return {
    color: '#10B981',
    colorTexto: '#FFFFFF',
    label: 'ALTO',
    labelLargo: 'Alto — la mayoría acertó (≥65%)',
    rango: '≥ 65%',
    pct: p
  };
}

/** ¿El área tiene dimensión secundaria propia (CMC, componente, MCER...)? */
export function tieneDimensionSecundaria(cuadernillo) {
  const cfg = configArea(cuadernillo);
  if (!cfg.dimension_secundaria) return false;
  // Defensivo: confirmar que el cuadernillo tenga categorías declaradas y que
  // las preguntas tengan el campo correspondiente.
  const campo = cfg.dimension_secundaria.campo;
  const tieneCampoEnPreguntas = (cuadernillo.preguntas || []).some(p => p[campo]);
  // Para MAT y CN además se exige array `cmc` (lista de categorías) en el JSON
  const tieneListaCategorias = Array.isArray(cuadernillo.cmc) && cuadernillo.cmc.length > 0;
  // Para Inglés (MCER) NO se exige array `cmc`, basta con que las preguntas
  // tengan el campo `nivel_mcer`.
  return tieneCampoEnPreguntas && (tieneListaCategorias || campo === 'nivel_mcer');
}

/** Devuelve el valor de la dimensión secundaria de una pregunta (cmc/componente/nivel_mcer). */
export function valorDimSecundaria(pregunta, cuadernillo) {
  const cfg = configArea(cuadernillo);
  if (!cfg.dimension_secundaria) return null;
  return pregunta[cfg.dimension_secundaria.campo] || null;
}

/**
 * Para áreas con orden canónico (Inglés MCER Pre A1→A1→A2→B1), devuelve
 * el orden preferido. Para otras, devuelve null y se ordena alfabéticamente.
 */
export function ordenCategoriasDim(cuadernillo) {
  const cfg = configArea(cuadernillo);
  return cfg.dimension_secundaria?.orden_categorias || null;
}

/**
 * Slug del catálogo de recomendaciones a usar en plan-mejora.
 * Mapea al archivo datos/plan_mejora_plantilla.json (sección por área).
 */
export function slugRecomendaciones(cuadernillo) {
  return configArea(cuadernillo).catalogo_recomendaciones;
}
