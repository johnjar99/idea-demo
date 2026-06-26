// analisis.js — Estadística avanzada y narrativa pedagógica profunda para el dashboard docente.
//
// Cubre lo que el Bloque 4 del prompt v2 exige:
//   - KPIs avanzados: mediana, desviación estándar, cuartiles
//   - Histograma de puntajes
//   - Heatmap estudiantes × preguntas
//   - Análisis por competencia con recomendaciones específicas
//   - Estudiantes en riesgo
//   - Proyección SABER 11 (parcial Mat)
//   - 4 bloques narrativos de conclusiones

import {
  promedioGrupo, correctasPorPreguntaGrupo,
  logroPorCompetencia, logroPorAfirmacion, logroPorEvidencia, logroPorCMC, logroPorDimensionSecundaria,
  calcularNivel, logroGrupoPor
} from './calculo.js';
import { configArea, tieneDimensionSecundaria, ordenCategoriasDim } from './area-config.js';
// Capa ADITIVA por grado: lectura SINCRONA desde cache (el bootstrap precarga el JSON).
// Si no hay celda por grado, estas lecturas devuelven null y se usa el contenido por area
// de abajo (fallback). Importacion estatica: el cache vacio => todo se comporta como hoy.
import { pedagogiaDeSync, areaSlugDeCuadernillo, esVivoProtegido } from './pedagogia-grado.js';

// === Estrategias pedagógicas por ÁREA y por competencia ============================
// Cada cuadernillo (área) tiene su propio set de estrategias, alineado con la guía
// de orientación ICFES de esa área. Nunca debe aparecer una recomendación de
// Matemáticas en un informe de Lectura Crítica (ni viceversa).
const ESTRATEGIAS_POR_AREA = {
  'matemáticas': {
    competencia: {
      a: [ // Comunicación, representación y modelación
        'Trabajar talleres semanales de lectura crítica de gráficas, tablas y esquemas con preguntas orientadoras.',
        'Implementar rutinas "Veo–Pienso–Pregunto" aplicadas a representaciones cuantitativas reales (datos del entorno).',
        'Diseñar ejercicios de transformación entre registros: tabla → gráfica → expresión algebraica → texto descriptivo.'
      ],
      b: [ // Planteamiento y resolución de problemas
        'Aplicar la metodología de Pólya: comprender, planear, ejecutar y verificar la solución.',
        'Resolver problemas contextualizados con datos del entorno escolar y comunitario.',
        'Promover el trabajo colaborativo en pequeños grupos sobre situaciones-problema abiertas.'
      ],
      c: [ // Razonamiento y argumentación
        'Implementar debates matemáticos donde los estudiantes deban justificar oralmente sus respuestas.',
        'Usar la estrategia "Mi respuesta es… porque…" en todas las evaluaciones formativas.',
        'Diseñar ejercicios donde los estudiantes evalúen y critiquen soluciones propuestas por otros.'
      ]
    },
    cmc: {
      'Estadística': [
        'Proyectos de aula con recolección, sistematización y análisis de datos reales.',
        'Uso de GeoGebra Estadística o Google Sheets para visualizar distribuciones.'
      ],
      'Geometría': [
        'Software dinámico (GeoGebra) para explorar transformaciones, lugares geométricos y cónicas.',
        'Modelaje geométrico de situaciones del contexto (planos, mapas, construcciones).'
      ],
      'Álgebra y Cálculo': [
        'Reforzar conceptos de función, dominio y rango con tablas, gráficas y expresiones algebraicas.',
        'Trabajar progresivamente con tasas de cambio, derivadas y aplicaciones contextualizadas.'
      ]
    }
  },
  'lectura crítica': {
    competencia: {
      // Lectura Crítica tiene UNA sola competencia oficial: la a). Las
      // estrategias se concentran ahí; la riqueza diagnóstica está en las
      // afirmaciones (clave `afirmacion` abajo).
      a: [
        'Implementar talleres semanales de lectura con tres niveles de análisis: literal, inferencial y crítico.',
        'Construir glosarios contextualizados antes y durante la lectura para fortalecer el léxico disciplinar.',
        'Usar la rutina "subrayar–anotar al margen–parafrasear" en textos de diversa tipología (expositivos, argumentativos, narrativos, infográficos).'
      ]
    },
    afirmacion: {
      '1': [ // Identifica y entiende contenidos locales
        'Reforzar identificación de eventos explícitos, personajes y descripciones en textos breves.',
        'Construir glosarios contextualizados antes y durante la lectura para fortalecer el léxico disciplinar.'
      ],
      '2': [ // Comprende cómo se articulan las partes para un sentido global
        'Trabajar con esquemas argumentativos: identificar tesis, argumentos, ejemplos y contraargumentos en columnas de opinión.',
        'Diseñar actividades de reorganización textual: cambiar el orden de párrafos y pedir reconstrucción de la secuencia coherente.',
        'Comparar dos textos sobre el mismo tema y mapear relaciones causa-consecuencia, contraste y similitud entre sus ideas.'
      ],
      '3': [ // Reflexiona y evalúa el contenido del texto
        'Promover debates en clase donde los estudiantes confronten posturas frente a textos polémicos (anuncios, columnas, manifiestos).',
        'Enseñar a identificar recursos persuasivos: apelaciones emocionales, falacias, estadísticas descontextualizadas y dilución de fuentes.',
        'Implementar la rutina "estoy de acuerdo / en desacuerdo / depende" justificando con evidencia textual y conocimiento previo.'
      ]
    },
    cmc: {}
  },
  'sociales y ciudadanas': {
    competencia: {
      a: [ // Pensamiento social
        'Trabajar con fuentes primarias y secundarias para reconstruir contextos históricos, sociales y políticos colombianos.',
        'Promover el análisis de cartografías, líneas de tiempo y mapas conceptuales sobre coyunturas nacionales y latinoamericanas.',
        'Articular el aula con la Cátedra de Paz: estudio de casos sobre memoria histórica, reconciliación y conflictos territoriales.'
      ],
      b: [ // Interpretación y análisis de perspectivas
        'Confrontar relatos de distintos actores (víctimas, gobierno, sociedad civil) frente a un mismo hecho social.',
        'Analizar caricatura política, columnas de opinión y discursos públicos identificando intencionalidad y posicionamiento.',
        'Diseñar mesas de discusión donde los estudiantes asuman roles de diferentes actores sociales y argumenten desde esa perspectiva.'
      ],
      c: [ // Pensamiento reflexivo y sistémico
        'Plantear dilemas éticos y políticos del contexto colombiano (acuerdos de paz, derechos humanos, participación) para construir argumentación sustentada.',
        'Trabajar con la Constitución de 1991 como insumo para evaluar normas, derechos y mecanismos de participación ciudadana.',
        'Promover proyectos de aula sobre problemáticas locales que integren análisis económico, ambiental y cultural.'
      ]
    },
    // SC tiene 5 afirmaciones que son la riqueza diagnóstica del área.
    afirmacion: {
      '1': [ // Modelos conceptuales
        'Reforzar la apropiación del modelo de Estado Social de Derecho aplicado en Colombia.',
        'Trabajar la organización del Estado (ramas del poder) y mecanismos de participación democrática.'
      ],
      '2': [ // Dimensiones espaciales y temporales
        'Articular líneas de tiempo con cartografías para situar eventos históricos en contexto espacial.',
        'Localizar eventos en mapas regionales y nacionales conectándolos con problemáticas actuales.'
      ],
      '3': [ // Contextualizar y evaluar fuentes
        'Trabajar evaluación crítica de fuentes: posibilidades, limitaciones y propósito.',
        'Inscribir fuentes primarias en su contexto económico, político y cultural de producción.'
      ],
      '4': [ // Comprende perspectivas
        'Comparar perspectivas de distintos actores ante un mismo hecho social.',
        'Reconocer cómo cosmovisiones, ideologías y roles influyen en las decisiones colectivas.'
      ],
      '5': [ // Problemas multidimensionales
        'Análisis multidimensional (económica, ambiental, cultural) de problemáticas locales.',
        'Evaluar efectos previstos y no previstos de una intervención posible sobre distintas dimensiones.'
      ]
    },
    cmc: {}
  },
  'ciencias naturales': {
    competencia: {
      a: [ // Explicación de fenómenos
        'Promover el uso de simuladores PhET para visualizar fenómenos físicos, químicos y biológicos antes de explicarlos por escrito.',
        'Usar la rutina "observo–describo–explico–predigo" frente a experiencias demostrativas en aula.',
        'Diseñar evaluaciones donde el estudiante deba justificar por qué ocurre un fenómeno, no solo describirlo.'
      ],
      b: [ // Uso comprensivo del conocimiento científico
        'Diseñar talleres semanales de lectura comprensiva de textos científicos breves (artículos divulgativos, infografías de ciencia).',
        'Trabajar con preguntas orientadoras tipo "qué dice / qué significa / qué implica" para textos y datos científicos.',
        'Implementar mapas conceptuales colaborativos sobre los modelos científicos clave del nivel (célula, materia, energía, fuerzas).'
      ],
      c: [ // Indagación
        'Implementar mini-proyectos de investigación de aula con planteamiento de hipótesis, diseño experimental, recolección de datos y conclusiones.',
        'Trabajar control de variables con experimentos sencillos del entorno (germinación, soluciones, péndulos).',
        'Promover el uso de cuadernos de campo y bitácoras científicas como evidencia del proceso de indagación.'
      ]
    },
    cmc: {
      'Procesos vivos': [
        'Articular salidas pedagógicas a ecosistemas locales con guías de observación e identificación de especies.',
        'Trabajar prácticas de laboratorio sencillas con microscopio o lupas para observar estructuras celulares y tejidos.'
      ],
      'Procesos físicos': [
        'Diseñar montajes experimentales caseros (péndulos, planos inclinados, circuitos simples) para entender los principios básicos.',
        'Usar simuladores PhET de mecánica, ondas y electromagnetismo para construir modelos antes de formalizarlos.'
      ],
      'Procesos químicos': [
        'Implementar prácticas con materiales seguros del entorno (vinagre, bicarbonato, indicadores naturales) para evidenciar cambios químicos.',
        'Articular el lenguaje simbólico (fórmulas, ecuaciones) con representaciones de partículas y modelos moleculares.'
      ],
      'Ciencia, tecnología y sociedad': [
        'Estudiar casos colombianos de impacto socioambiental (minería, deforestación, vacunas) y construir posturas argumentadas.',
        'Promover proyectos STEM articulados con problemáticas comunitarias.'
      ]
    }
  },
  'inglés': {
    // Estructura OFICIAL ICFES: las 5 "competencias" son las 5 Partes del cuadernillo.
    // Las afirmaciones son los 4 niveles MCER (Pre A1, A1, A2, B1).
    competencia: {
      a: [ // Parte 1 — Matching de vocabulario
        'Trabajar matching de vocabulario por campo semántico (salud, viajes, escuela) con bancos de 8-10 palabras.',
        'Construir glosarios temáticos semanales con apoyo visual fuerte y ejemplos en contexto real.',
        'Usar tarjetas de memoria (Quizlet, Anki) con palabras de alta frecuencia organizadas por categoría.'
      ],
      b: [ // Parte 2 — Conocimiento pragmático (diálogos)
        'Trabajar con diálogos modelo en distintos registros (formal/informal) para identificar funciones comunicativas.',
        'Diseñar role-plays sobre situaciones cotidianas: pedir información, dar indicaciones, expresar opiniones.',
        'Analizar videos cortos de BBC Learning English / British Council por su intención comunicativa y tono.'
      ],
      c: [ // Parte 3 — Comprensión literal
        'Implementar scanning para localizar información explícita (quién, qué, cuándo, dónde, cuánto) en textos breves.',
        'Practicar lectura literal con preguntas factuales después de cada párrafo de textos informativos cortos.',
        'Trabajar comprensión auditiva con audios de ESL Lab y BBC Learning English seguidos de preguntas factuales.'
      ],
      d: [ // Parte 4 — Comprensión inferencial
        'Trabajar inferencias con textos breves: predicción del título, intención del autor, conclusión implícita.',
        'Usar skimming para captar la idea global y luego inferir el propósito comunicativo del texto.',
        'Practicar lectura crítica con anuncios, correos y fragmentos narrativos nivel A2-B1.'
      ],
      e: [ // Parte 5 — Léxico-gramatical (cloze)
        'Practicar cloze tests con texto narrativo o expositivo, integrando vocabulario y gramática en contexto.',
        'Trabajar transformación de frases (tiempos verbales, voz activa/pasiva, conectores).',
        'Articular el repaso de gramática con vocabulario temático en contextos auténticos.'
      ]
    },
    // Afirmaciones = niveles MCER oficiales
    afirmacion: {
      '1': [ // Pre A1
        'Trabajar reconocimiento de palabras de altísima frecuencia con apoyo visual fuerte (flashcards con imágenes).',
        'Practicar comprensión auditiva muy básica con audios cortos sobre saludos, números y vocabulario del entorno escolar.'
      ],
      '2': [ // A1
        'Reforzar estructuras básicas con verbo to be, presente simple y vocabulario de rutinas y familia.',
        'Trabajar lectura de textos muy cortos (avisos, etiquetas, descripciones simples).'
      ],
      '3': [ // A2
        'Trabajar diálogos de funciones comunicativas A2 (saludar, pedir, opinar brevemente, narrar pasado simple).',
        'Practicar lectura de párrafos cortos con preguntas literales sobre quién, qué, cuándo, dónde.'
      ],
      '4': [ // B1
        'Implementar lectura de textos más extensos con preguntas inferenciales y de propósito comunicativo.',
        'Practicar cloze tests con texto narrativo o expositivo nivel B1 y comprensión auditiva con monólogos cortos.'
      ]
    },
    cmc: {}
  }
};

// Resolvers ---------------------------------------------------------------------------
function _areaSlug(cuadernillo) {
  return (cuadernillo && cuadernillo.area || '').toLowerCase();
}
// Resuelve area_slug (matematicas, lectura_critica, ...) y grado del cuadernillo para
// consultar la capa por grado. Tolerante: si falta algo, devuelve null y NO se consulta.
// Los 5 vivos (11° P1) quedan EXENTOS del override por grado (esVivoProtegido) para producir
// EXACTAMENTE la salida validada, aunque la celda [area][11] este poblada por el P2 de 11°.
function _slugYGrado(cuadernillo) {
  if (!cuadernillo) return { slug: null, grado: null };
  if (esVivoProtegido(cuadernillo)) return { slug: null, grado: null };
  return { slug: areaSlugDeCuadernillo(cuadernillo), grado: cuadernillo.grado };
}
function estrategiasPorCompetencia(cuadernillo, comp) {
  // 1) Capa POR GRADO (aditiva). Si hay celda, manda.
  const { slug, grado } = _slugYGrado(cuadernillo);
  if (slug) {
    const porGrado = pedagogiaDeSync(slug, grado, 'estrategias_por_competencia');
    if (porGrado && porGrado[comp] && porGrado[comp].length) return porGrado[comp];
  }
  // 2) FALLBACK: contenido por area actual (intacto).
  const set = ESTRATEGIAS_POR_AREA[_areaSlug(cuadernillo)] || ESTRATEGIAS_POR_AREA['matemáticas'];
  return (set.competencia && set.competencia[comp]) || [];
}
function estrategiasPorCMC(cuadernillo, cmc) {
  const { slug, grado } = _slugYGrado(cuadernillo);
  if (slug) {
    const porGrado = pedagogiaDeSync(slug, grado, 'estrategias_por_cmc');
    if (porGrado && porGrado[cmc] && porGrado[cmc].length) return porGrado[cmc];
  }
  const set = ESTRATEGIAS_POR_AREA[_areaSlug(cuadernillo)] || ESTRATEGIAS_POR_AREA['matemáticas'];
  return (set.cmc && set.cmc[cmc]) || [];
}
function estrategiasPorAfirmacion(cuadernillo, afirmacion) {
  const { slug, grado } = _slugYGrado(cuadernillo);
  if (slug) {
    const porGrado = pedagogiaDeSync(slug, grado, 'estrategias_por_afirmacion');
    if (porGrado && porGrado[String(afirmacion)] && porGrado[String(afirmacion)].length) return porGrado[String(afirmacion)];
  }
  const set = ESTRATEGIAS_POR_AREA[_areaSlug(cuadernillo)] || ESTRATEGIAS_POR_AREA['matemáticas'];
  return (set.afirmacion && set.afirmacion[String(afirmacion)]) || [];
}
// Compatibilidad legacy con código que aún importa estos nombres
const ESTRATEGIAS_POR_COMPETENCIA = ESTRATEGIAS_POR_AREA['matemáticas'].competencia;
const ESTRATEGIAS_POR_CMC = ESTRATEGIAS_POR_AREA['matemáticas'].cmc;

// === Fraseología experta por área para la narrativa pedagógica ====================
// Cada área aporta sus referentes propios (marco evaluativo, lenguaje técnico,
// instrumentos didácticos canónicos). El docente debe leer un informe escrito
// "como un experto del área", no un informe genérico.
const NARRATIVA_POR_AREA = {
  'matemáticas': {
    marco: 'Diseño Centrado en Evidencias (DCE) del ICFES',
    nombre_contenido: 'Contenidos Matemáticos Curriculares',
    nombre_contenido_singular: 'contenido curricular',
    enfasis_intervencion: 'secuencias didácticas que articulen registro de representación (verbal, tabular, gráfico, algebraico) con resolución de problemas en contexto',
    palanca: 'la modelación matemática y el razonamiento argumentado',
    referente_externo: 'los Estándares Básicos de Competencias en Matemáticas del MEN y los Derechos Básicos de Aprendizaje (DBA)',
    instrumentos: 'GeoGebra, hojas de cálculo y rúbricas de proceso',
    saber: 'la prueba de Matemáticas de SABER 11°',
    practica_destacada: 'la metodología de Pólya (comprender — planear — ejecutar — verificar) y los problemas abiertos del entorno escolar'
  },
  'lectura crítica': {
    marco: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Estándares de Lenguaje',
    nombre_contenido: '',
    nombre_contenido_singular: '',
    enfasis_intervencion: 'talleres semanales de comprensión lectora en sus tres niveles (literal, inferencial y crítico) con textos de tipología variada',
    palanca: 'la lectura inferencial y la evaluación crítica del discurso',
    referente_externo: 'los Lineamientos Curriculares de Lengua Castellana del MEN y los Derechos Básicos de Aprendizaje (DBA) de Lenguaje',
    instrumentos: 'glosarios contextualizados, rutinas "Veo–Pienso–Pregunto" y mapas de argumentación',
    saber: 'la prueba de Lectura Crítica de SABER 11°',
    practica_destacada: 'la rutina "subrayar — anotar al margen — parafrasear" aplicada a textos expositivos, argumentativos y discontinuos'
  },
  'sociales y ciudadanas': {
    marco: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Estándares de Ciencias Sociales',
    nombre_contenido: '',
    nombre_contenido_singular: '',
    enfasis_intervencion: 'análisis de fuentes primarias y secundarias articulado con la Cátedra de Paz y el estudio de problemáticas locales',
    palanca: 'el pensamiento social y la argumentación ciudadana sustentada en evidencia',
    referente_externo: 'la Constitución Política de 1991, los Estándares de Ciencias Sociales del MEN y la Cátedra de Paz (Ley 1732 de 2014)',
    instrumentos: 'líneas de tiempo, mapas conceptuales, análisis de caricatura política y debates dirigidos',
    saber: 'la prueba de Sociales y Ciudadanas de SABER 11°',
    practica_destacada: 'el estudio de casos sobre dilemas éticos y políticos del contexto colombiano (memoria histórica, derechos humanos, participación)'
  },
  'ciencias naturales': {
    marco: 'Diseño Centrado en Evidencias (DCE) del ICFES y los Estándares de Ciencias Naturales',
    nombre_contenido: 'Componentes temáticos (Procesos vivos, físicos, químicos y Ciencia–Tecnología–Sociedad)',
    nombre_contenido_singular: 'componente temático',
    enfasis_intervencion: 'secuencias indagatorias de tipo "observo — describo — explico — predigo" articuladas con simulaciones PhET y prácticas de laboratorio en aula',
    palanca: 'la indagación científica y la construcción de explicaciones a partir de modelos',
    referente_externo: 'los Estándares Básicos de Competencias en Ciencias Naturales del MEN y los Derechos Básicos de Aprendizaje (DBA) de Ciencias',
    instrumentos: 'simuladores PhET, cuadernos de campo, bitácoras científicas y prácticas de laboratorio con materiales del entorno',
    saber: 'la prueba de Ciencias Naturales de SABER 11°',
    practica_destacada: 'el control de variables y la construcción guiada de modelos explicativos a partir de datos empíricos'
  },
  'inglés': {
    marco: 'Marco Común Europeo de Referencia para las lenguas (MCER) y el Diseño Centrado en Evidencias del ICFES',
    nombre_contenido: '',
    nombre_contenido_singular: '',
    enfasis_intervencion: 'andamiaje (scaffolding) progresivo en los cuatro niveles del MCER (Pre-A1 → A1 → A2 → B1) con input comprensible y output guiado',
    palanca: 'la comprensión lectora literal e inferencial y la apropiación del léxico de alta frecuencia',
    referente_externo: 'la política de bilingüismo del MEN (Programa Nacional de Bilingüismo) y los Derechos Básicos de Aprendizaje (DBA) de Inglés',
    instrumentos: 'lectura graduada por nivel MCER, audios de British Council/BBC Learning English y tarjetas de léxico contextualizado',
    saber: 'la prueba de Inglés de SABER 11°',
    practica_destacada: 'la lectura extensiva graduada y el uso de input auténtico (videos, podcasts, textos breves) con tareas de comprensión escalonada'
  }
};
function narrativaArea(cuadernillo) {
  // FALLBACK: fraseologia experta por area (intacta).
  const base = NARRATIVA_POR_AREA[_areaSlug(cuadernillo)] || NARRATIVA_POR_AREA['matemáticas'];
  // Capa POR GRADO (aditiva): solo SOBREESCRIBE las claves presentes en el override;
  // el resto hereda de la narrativa por area. Si no hay override, devuelve la base tal cual.
  const { slug, grado } = _slugYGrado(cuadernillo);
  if (slug) {
    const over = pedagogiaDeSync(slug, grado, 'narrativa');
    if (over && typeof over === 'object') return Object.assign({}, base, over);
  }
  return base;
}

// === Estadísticos ===

export function mediana(arr) {
  const a = [...arr].filter(Number.isFinite).sort((x, y) => x - y);
  if (a.length === 0) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function desviacionEstandar(arr) {
  const a = arr.filter(Number.isFinite);
  if (a.length < 2) return 0;
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  const varianza = a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
  return Math.sqrt(varianza);
}

export function cuartiles(arr) {
  const a = [...arr].filter(Number.isFinite).sort((x, y) => x - y);
  if (a.length === 0) return { q1: 0, q2: 0, q3: 0 };
  return {
    q1: a[Math.floor(a.length * 0.25)],
    q2: mediana(a),
    q3: a[Math.floor(a.length * 0.75)]
  };
}

/**
 * Histograma de puntajes en bins de 10 (0-10, 11-20, ..., 91-100).
 */
export function histogramaPuntajes(aplicaciones) {
  const bins = new Array(10).fill(0);
  for (const a of aplicaciones) {
    const p = a.puntaje || 0;
    const idx = Math.min(9, Math.floor(p / 10));
    bins[idx]++;
  }
  return bins;
}

/**
 * Matriz de aciertos estudiantes × preguntas para heatmap.
 * Devuelve { etiquetas_estudiantes, etiquetas_preguntas, matriz: [[1,0,1,...], ...], detalles }
 * detalles[i][j] = { acertada, elegida, correcta } para tooltip on hover.
 */
export function matrizHeatmap(aplicaciones, cuadernillo) {
  const n = cuadernillo.preguntas.length;
  const filas = [...aplicaciones].sort((a, b) => a.estudiante_nombre.localeCompare(b.estudiante_nombre));
  const matriz = filas.map(a => (a.aciertos_por_pregunta || new Array(n).fill(0)).slice(0, n));
  const detalles = filas.map(a => {
    return cuadernillo.preguntas.map(p => {
      const resp = (a.respuestas || []).find(r => r.pregunta_id === p.id);
      const elegida = resp?.opcion_elegida_real || null;
      const correcta = p.clave;
      return {
        acertada: elegida === correcta,
        respondida: !!elegida,
        elegida: elegida || '—',
        correcta
      };
    });
  });
  return {
    estudiantes: filas.map(a => a.estudiante_nombre),
    preguntas: cuadernillo.preguntas.map(p => `P${p.numero}`),
    matriz,
    detalles
  };
}

/**
 * Estudiantes en riesgo (BAJO) con su competencia más débil
 * y TRES sugerencias diferenciadas según la competencia identificada.
 */
export function estudiantesEnRiesgo(aplicaciones, cuadernillo) {
  return aplicaciones
    .filter(a => a.nivel === 'BAJO')
    .map(a => {
      const log = logroPorCompetencia(a.aciertos_por_pregunta || [], cuadernillo);
      const minComp = Object.keys(log).reduce((acc, k) => log[k] <= log[acc] ? k : acc, Object.keys(log)[0]);
      const nombreComp = cuadernillo.competencias[minComp] || minComp;
      let estrategias = estrategiasPorCompetencia(cuadernillo, minComp);
      if (!estrategias.length) estrategias = estrategiasPorCompetencia(cuadernillo, 'b');
      // Construir 3 recomendaciones específicas
      const recs = [
        `Tutoría focalizada (1 hora/semana) trabajando ${nombreComp.toLowerCase()}. Comenzar por las evidencias con menor logro.`,
        estrategias[0],
        estrategias[Math.min(1, estrategias.length - 1)]
      ];
      return {
        estudiante: a.estudiante_nombre,
        puntaje: a.puntaje,
        competencia_debil: minComp,
        nombre_competencia: nombreComp,
        logro_competencia: log[minComp],
        sugerencias: recs,
        // Compat con render anterior
        sugerencia: recs[0]
      };
    })
    .sort((a, b) => a.puntaje - b.puntaje);
}

/**
 * Proyección parcial SABER 11 con TRES escenarios:
 *   - PESIMISTA: las áreas restantes rinden 10 puntos por debajo de Matemáticas
 *   - REALISTA:  las áreas restantes rinden igual que Matemáticas
 *   - OPTIMISTA: las áreas restantes rinden 10 puntos por encima de Matemáticas
 * Fórmula: Índice Global = (Mat·3 + LC·3 + Soc·3 + CN·3 + Ing·1) / 13
 * Puntaje SABER = Índice Global · 5 (escala 0–500)
 */
export function proyeccionSaber11Parcial(puntajeMat) {
  const calcular = (otrasAreas) => {
    const idx = (puntajeMat * 3 + otrasAreas * 3 * 3 + otrasAreas * 1) / 13;
    return {
      indice: Math.round(idx),
      puntaje_global: Math.round(idx * 5)
    };
  };
  const otraPesimista = Math.max(0, puntajeMat - 10);
  const otraOptimista = Math.min(100, puntajeMat + 10);
  return {
    // Compat con render anterior (escenario realista)
    indice: puntajeMat,
    puntaje_global: Math.round(puntajeMat * 5),
    pesimista: calcular(otraPesimista),
    realista: calcular(puntajeMat),
    optimista: calcular(otraOptimista)
  };
}

/**
 * Comparativo individual: delta de cada competencia y CMC del estudiante
 * respecto al promedio del grupo (en puntos porcentuales).
 */
export function comparativoIndividual(aplicacionEstudiante, aplicacionesGrupo, cuadernillo) {
  const grupoLogComp = logroGrupoPor(logroPorCompetencia, aplicacionesGrupo, cuadernillo);
  // Dimensión secundaria: si el área la tiene (MAT=CMC, CN=Componente, IN=MCER) usa
  // logroPorDimensionSecundaria; si no (LC, SC) cae a un objeto vacío.
  const _hayDim2Cmp = tieneDimensionSecundaria(cuadernillo);
  const grupoLogDim2 = _hayDim2Cmp ? logroGrupoPor(logroPorDimensionSecundaria, aplicacionesGrupo, cuadernillo) : {};
  const indLogComp = logroPorCompetencia(aplicacionEstudiante.aciertos_por_pregunta || [], cuadernillo);
  const indLogDim2 = _hayDim2Cmp ? logroPorDimensionSecundaria(aplicacionEstudiante.aciertos_por_pregunta || [], cuadernillo) : {};
  const delta = (ind, grp) => {
    const out = {};
    for (const k of Object.keys(grp)) {
      out[k] = {
        individual: ind[k] ?? 0,
        grupo: grp[k] ?? 0,
        delta: Math.round((ind[k] ?? 0) - (grp[k] ?? 0))
      };
    }
    return out;
  };
  return {
    competencias: delta(indLogComp, grupoLogComp),
    // Se mantiene el campo `cmc` por compatibilidad con el HTML que lo lee.
    // El contenido es la dimensión secundaria del área (CMC, componente, MCER…).
    cmc: delta(indLogDim2, grupoLogDim2),
    puntaje_estudiante: aplicacionEstudiante.puntaje,
    promedio_grupo: promedioGrupo(aplicacionesGrupo),
    delta_puntaje: aplicacionEstudiante.puntaje - promedioGrupo(aplicacionesGrupo)
  };
}

/**
 * Conclusiones pedagógicas profundas en 4 bloques narrativos.
 */
export function conclusionesProfundas(aplicaciones, cuadernillo) {
  if (!aplicaciones.length) {
    return { diagnostico: 'Sin datos para diagnosticar.', fortalezas: '', oportunidades: '', recomendaciones: '', proyeccion: '' };
  }
  const N = narrativaArea(cuadernillo);
  const area = cuadernillo.area || 'el área';
  // Dimensión secundaria del área: CMC (MAT), Componente (CN), MCER (Inglés). LC y SC NO la tienen.
  const tieneDim2 = tieneDimensionSecundaria(cuadernillo);
  // Mantengo la variable tieneCMC por retrocompatibilidad interna en el bloque.
  const tieneCMC = tieneDim2;
  const prom = promedioGrupo(aplicaciones);
  const nivelGrupo = calcularNivel(prom);
  const med = mediana(aplicaciones.map(a => a.puntaje));
  const stdev = desviacionEstandar(aplicaciones.map(a => a.puntaje));

  // === 1. Diagnóstico ===
  const niveles = { BAJO: 0, 'BÁSICO': 0, ALTO: 0, SUPERIOR: 0 };
  aplicaciones.forEach(a => { niveles[a.nivel] = (niveles[a.nivel] || 0) + 1; });
  const total = aplicaciones.length;
  const pctBajo = Math.round((niveles.BAJO / total) * 100);
  const pctAvanzado = Math.round(((niveles.ALTO + niveles.SUPERIOR) / total) * 100);

  const sk = asimetria(aplicaciones);
  const diagnostico =
    `<p>Los resultados de la aplicación del instrumento IDEA en el área de <strong>${area}</strong> evidencian que el grupo, conformado por ${total} estudiantes evaluados, ` +
    `se ubica en el nivel <strong>${nivelGrupo}</strong> de desempeño, con un puntaje promedio de ${prom} puntos sobre una escala de 0 a 100 y una mediana de ${med} puntos. ` +
    `La dispersión observada (desviación estándar de ${stdev.toFixed(1)} puntos) configura una distribución ${stdev > 18 ? 'heterogénea' : 'relativamente homogénea'} ` +
    `con asimetría ${sk > 0.3 ? 'positiva, lo que sugiere concentración en niveles BAJO y BÁSICO' : (sk < -0.3 ? 'negativa, indicando concentración en niveles ALTO y SUPERIOR' : 'aproximadamente simétrica')}.</p>` +
    `<p>El análisis de la composición por niveles revela que el ${pctBajo}% de los estudiantes se encuentra en nivel BAJO, ` +
    `mientras que el ${pctAvanzado}% alcanza los niveles ALTO o SUPERIOR. Este hallazgo, leído desde ${N.marco}, ` +
    `configura un escenario que demanda una intervención pedagógica diferenciada en ${area.toLowerCase()}: atender de manera focalizada al grupo en riesgo ` +
    `mediante estrategias de refuerzo individualizado, sin desatender el potencial de los estudiantes destacados, ` +
    `quienes pueden constituirse en monitores de aprendizaje entre pares.</p>`;

  // === 2. Fortalezas ===
  const logComp = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  const compKeys = Object.keys(logComp);
  const maxComp = compKeys.reduce((a, b) => logComp[a] >= logComp[b] ? a : b);
  const correctas = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const masFaciles = correctas
    .map((c, i) => ({ p: i + 1, pct: Math.round((c / total) * 100), comp: cuadernillo.preguntas[i].competencia, ev: cuadernillo.preguntas[i].evidencia }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  const destacados = aplicaciones
    .filter(a => ['ALTO', 'SUPERIOR'].includes(a.nivel))
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 3);

  const fortalezas =
    `<p>El análisis comparativo por competencias en el área de <strong>${area}</strong> evidencia que <strong>${cuadernillo.competencias[maxComp]}</strong> ` +
    `constituye la fortaleza más consolidada del grupo, con un logro promedio del ${logComp[maxComp]}%. ` +
    `Este resultado sugiere que los estudiantes han internalizado satisfactoriamente las evidencias asociadas a esta competencia, ` +
    `y abre la posibilidad de capitalizarla como palanca pedagógica para abordar competencias menos desarrolladas mediante andamiaje progresivo, ` +
    `articulado con ${N.referente_externo}.</p>` +
    `<p>A nivel de ítems específicos, las preguntas ${masFaciles.map(x => `P${x.p} (${x.pct}% de acierto)`).join(', ')} ` +
    `presentaron el mejor desempeño grupal. Las evidencias de aprendizaje asociadas a estos ítems (${masFaciles.map(x => x.ev).filter((v,i,a) => a.indexOf(v)===i).join(', ')}) ` +
    `pueden constituirse en base para escalar hacia desempeños de mayor complejidad cognitiva, apoyándose en ${N.instrumentos}.</p>` +
    (destacados.length
      ? `<p>Se identifican ${destacados.length} estudiantes con desempeño destacado: ${destacados.map(d => d.estudiante_nombre).join(', ')}. ` +
        `Se recomienda incorporarlos en estrategias de aprendizaje colaborativo entre pares (<em>peer tutoring</em>), aprovechando su consolidación conceptual ` +
        `para fortalecer la dinámica del aula sin sobrecargar al docente. En ${area.toLowerCase()}, esta estrategia es particularmente potente cuando se enmarca en ${N.practica_destacada}.</p>`
      : '');

  // === 3. Oportunidades de mejora ===
  const minComp = compKeys.reduce((a, b) => logComp[a] <= logComp[b] ? a : b);
  // Dimensión secundaria (CMC/componente/MCER) — solo si el área la tiene
  const logDim2 = tieneDim2 ? logroGrupoPor(logroPorDimensionSecundaria, aplicaciones, cuadernillo) : {};
  const dim2Keys = Object.keys(logDim2);
  const minCmc = dim2Keys.length ? dim2Keys.reduce((a, b) => logDim2[a] <= logDim2[b] ? a : b) : null;
  // Afirmación más débil — para áreas sin dim secundaria (LC, SC) es el diagnóstico principal
  const logAfir = logroGrupoPor(logroPorAfirmacion, aplicaciones, cuadernillo);
  const afirKeys = Object.keys(logAfir);
  const minAfir = afirKeys.length ? afirKeys.reduce((a, b) => logAfir[a] <= logAfir[b] ? a : b) : null;
  const masDificiles = correctas
    .map((c, i) => ({ p: i + 1, pct: Math.round((c / total) * 100), ev: cuadernillo.preguntas[i].evidencia }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);
  const enRiesgo = aplicaciones.filter(a => a.nivel === 'BAJO');

  const criticas = masDificiles.filter(x => x.pct < 25);
  // Bloque de dim secundaria: si el área la tiene, usa ese nombre; si no, narra por afirmación.
  let cmcPara = '';
  if (tieneDim2 && minCmc) {
    cmcPara = `<p>En el ámbito de ${N.nombre_contenido || 'los contenidos curriculares'}, <strong>${minCmc}</strong> presenta el desempeño más bajo (${logDim2[minCmc]}%), ` +
      `lo que sugiere la necesidad de revisar la dosificación temática y las estrategias didácticas asociadas a este ${N.nombre_contenido_singular || 'contenido'}. </p>`;
  } else if (minAfir && cuadernillo.afirmaciones?.[minAfir]) {
    // Para LC y SC, la afirmación es la unidad diagnóstica más fina
    cmcPara = `<p>Dentro del marco evaluativo del área, la <strong>afirmación ${minAfir}</strong> (${cuadernillo.afirmaciones[minAfir]}) presenta el desempeño más bajo (${logAfir[minAfir]}%), ` +
      `lo que orienta la intervención hacia los procesos cognitivos específicos que esta afirmación articula.</p>`;
  }
  const cmcDificultades = (criticas.length
    ? `<p>Los ítems con menor acierto (${criticas.map(x => `P${x.p} con ${x.pct}%`).join(', ')}) ` +
      `evidencian dificultades específicas en las evidencias ${criticas.map(x => x.ev).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}, ` +
      `que deben ser abordadas con ${N.enfasis_intervencion}, retroalimentación inmediata y oportunidades de práctica progresiva.</p>`
    : '<p>No se registran ítems con acierto crítico (&lt;25%), lo que indica que el grupo mantiene un piso mínimo de comprensión en la totalidad del instrumento.</p>');
  const oportunidades =
    `<p>La principal oportunidad de fortalecimiento se localiza en la competencia <strong>${cuadernillo.competencias[minComp]}</strong>, ` +
    `cuyo logro promedio alcanza apenas el ${logComp[minComp]}%, ubicándose por debajo del promedio general del grupo. ` +
    `Este hallazgo, lejos de constituir un déficit aislado, debe leerse como una oportunidad pedagógica para focalizar la intervención ` +
    `en ${N.palanca}, articulada con ${N.marco} y con las trayectorias de aprendizaje propias del grado.</p>` +
    cmcPara +
    cmcDificultades +
    (enRiesgo.length
      ? `<p>Adicionalmente, ${enRiesgo.length} estudiantes se ubican en nivel BAJO y requieren atención prioritaria mediante un plan de intervención individualizado: ` +
        `${enRiesgo.slice(0, 5).map(e => e.estudiante_nombre).join(', ')}${enRiesgo.length > 5 ? ', entre otros' : ''}. ` +
        `Se sugiere desplegar tutorías focalizadas en ${area.toLowerCase()} (1 hora semanal mínimo), apoyadas en ${N.instrumentos}, ` +
        `y monitorear el avance mediante indicadores de desempeño específicos por evidencia.</p>`
      : '');

  // === 4. Recomendaciones ===
  const estComp = estrategiasPorCompetencia(cuadernillo, minComp);
  // Tercera acción: si hay dim secundaria, usa estrategiasPorCMC; si no, usa estrategiasPorAfirmacion
  // (LC y SC tienen ahora estrategias por afirmación en ESTRATEGIAS_POR_AREA).
  const estCmc = (tieneDim2 && minCmc) ? estrategiasPorCMC(cuadernillo, minCmc) : [];
  const estAfir = (!tieneDim2 && minAfir) ? estrategiasPorAfirmacion(cuadernillo, minAfir) : [];
  let accionCMC = '';
  if (tieneDim2 && estCmc.length) {
    accionCMC = `<p><strong>(3)</strong> ${estCmc[0]} ` +
      `Esta intervención específica busca subsanar la brecha identificada en <strong>${minCmc}</strong>, integrando ${N.nombre_contenido_singular || 'el contenido curricular'} con las competencias evaluadas.</p>`;
  } else if (estAfir.length && minAfir) {
    accionCMC = `<p><strong>(3)</strong> ${estAfir[0]} ` +
      `Esta intervención específica busca fortalecer la <strong>afirmación ${minAfir}</strong> del marco DCE del área, donde se identificó el desempeño más bajo del grupo.</p>`;
  }
  const _hayAccion3 = !!accionCMC;
  const recomendaciones =
    `<p>A partir del diagnóstico y de las oportunidades identificadas en el área de <strong>${area}</strong>, se proponen las siguientes acciones pedagógicas focalizadas para el próximo período académico, ` +
    `articuladas con ${N.marco} y orientadas a consolidar las trayectorias de aprendizaje del grupo:</p>` +
    `<p><strong>(1)</strong> ${estComp[0] || 'Implementar estrategias didácticas específicas para la competencia priorizada.'} ` +
    `Esta acción se articula directamente con la competencia <strong>${minComp}. ${cuadernillo.competencias[minComp]}</strong> y debe desplegarse en sesiones semanales de 90 minutos durante al menos cuatro semanas, ` +
    `con retroalimentación inmediata y rúbricas explícitas de evaluación formativa.</p>` +
    `<p><strong>(2)</strong> ${estComp[1] || 'Complementar con metodologías activas centradas en el estudiante.'} ` +
    `El propósito es consolidar las evidencias asociadas a través de ${N.enfasis_intervencion}.</p>` +
    accionCMC +
    `<p><strong>(${_hayAccion3 ? 4 : 3})</strong> Articular la planeación con el Sistema Institucional de Evaluación de los Estudiantes (SIEE): incorporar criterios formativos que valoren el proceso pedagógico, ` +
    `no exclusivamente el producto. Definir rúbricas analíticas por evidencia de aprendizaje, con descriptores de desempeño explícitos para cada nivel, alineados con ${N.referente_externo}.</p>` +
    `<p><strong>(${_hayAccion3 ? 5 : 4})</strong> Vincular esta planeación con el Proyecto Educativo Institucional (PEI), asegurando coherencia entre la mejora del aula de ${area.toLowerCase()} y el horizonte institucional. ` +
    `El plan de mejora resultante debe documentarse en el acta del consejo académico y socializarse con el equipo docente del área para garantizar continuidad pedagógica.</p>`;

  // === 5. Proyección y seguimiento ===
  const proy = proyeccionSaber11Parcial(prom);
  const proyeccion =
    `<p>Aplicando los resultados obtenidos al modelo de proyección parcial de las pruebas SABER 11°, ` +
    `el grupo se ubicaría en un puntaje aproximado de <strong>${proy.realista.puntaje_global} puntos</strong> en el escenario realista, ` +
    `asumiendo desempeño análogo en las áreas restantes (en ${area} y las cuatro áreas complementarias del examen). ` +
    `En un escenario optimista, donde las áreas complementarias rinden 10 puntos por encima del puntaje observado en ${area.toLowerCase()}, ` +
    `el puntaje proyectado sería de ${proy.optimista.puntaje_global}; en un escenario pesimista (10 puntos por debajo), ${proy.pesimista.puntaje_global} puntos.</p>` +
    `<p>Se recomienda monitorear el avance del grupo mediante una segunda aplicación del instrumento IDEA al cierre del próximo período académico, ` +
    `manteniendo las mismas condiciones de aplicación para garantizar la comparabilidad longitudinal. ` +
    `El seguimiento individualizado de los ${enRiesgo.length} estudiantes en riesgo debe documentarse mediante un plan de mejora explícito por estudiante, ` +
    `con indicadores de desempeño por evidencia y fechas de verificación intermedia. En el caso particular de ${area.toLowerCase()}, ` +
    `el seguimiento debe incorporar ${N.practica_destacada} como rúbrica cualitativa de avance.</p>` +
    `<p>Como complemento al monitoreo cuantitativo, se sugiere implementar un proceso de evaluación cualitativa mediante observación de aula, ` +
    `revisión de portafolios y entrevistas semiestructuradas con los estudiantes en riesgo, con el fin de identificar factores asociados al desempeño ` +
    `que el instrumento estandarizado no captura por completo. Esta triangulación metodológica fortalece la validez del diagnóstico ` +
    `y orienta de manera más certera las decisiones pedagógicas. La fórmula utilizada para la proyección agregada es: ` +
    `$\\text{Índice Global} = \\dfrac{Mat\\cdot 3 + LC\\cdot 3 + Soc\\cdot 3 + CN\\cdot 3 + Ing\\cdot 1}{13} \\Rightarrow \\text{Puntaje SABER} = \\text{Índice Global}\\times 5$.</p>`;

  // === Capa POR GRADO (aditiva): interpretaciones especificas del grado ===
  // Si existe pedagogia[area_slug][grado].interpretaciones, sus textos *_extra se
  // ANEXAN al bloque correspondiente (no reemplazan). Sin celda => salida identica a hoy.
  let _out = { diagnostico, fortalezas, oportunidades, recomendaciones, proyeccion };
  const { slug: _slugC, grado: _gradoC } = _slugYGrado(cuadernillo);
  if (_slugC) {
    const _itp = pedagogiaDeSync(_slugC, _gradoC, 'interpretaciones');
    if (_itp && typeof _itp === 'object') {
      if (_itp.diagnostico_extra) _out.diagnostico += _itp.diagnostico_extra;
      if (_itp.fortalezas_extra) _out.fortalezas += _itp.fortalezas_extra;
      if (_itp.oportunidades_extra) _out.oportunidades += _itp.oportunidades_extra;
      if (_itp.recomendaciones_extra) _out.recomendaciones += _itp.recomendaciones_extra;
      if (_itp.proyeccion_extra) _out.proyeccion += _itp.proyeccion_extra;
    }
  }
  return _out;
}

/**
 * KPI bundle para el hero del grupo.
 */
export function kpiGrupo(aplicaciones) {
  if (!aplicaciones.length) return null;
  const puntajes = aplicaciones.map(a => a.puntaje);
  const niveles = { BAJO: 0, 'BÁSICO': 0, ALTO: 0, SUPERIOR: 0 };
  aplicaciones.forEach(a => { niveles[a.nivel] = (niveles[a.nivel] || 0) + 1; });
  return {
    total: aplicaciones.length,
    promedio: Math.round(puntajes.reduce((s, v) => s + v, 0) / puntajes.length),
    mediana: Math.round(mediana(puntajes)),
    desviacion: Math.round(desviacionEstandar(puntajes) * 10) / 10,
    en_bajo: niveles.BAJO,
    sobre_basico: (niveles['BÁSICO'] || 0) + (niveles.ALTO || 0) + (niveles.SUPERIOR || 0),
    en_alto_o_superior: (niveles.ALTO || 0) + (niveles.SUPERIOR || 0)
  };
}

export { ESTRATEGIAS_POR_COMPETENCIA, ESTRATEGIAS_POR_CMC, ESTRATEGIAS_POR_AREA, estrategiasPorCompetencia, estrategiasPorCMC, estrategiasPorAfirmacion };

// === v4: Estadísticos adicionales ===

export function coefVariacion(aplicaciones) {
  if (!aplicaciones.length) return 0;
  const ps = aplicaciones.map(a => a.puntaje);
  const m = ps.reduce((s, v) => s + v, 0) / ps.length;
  if (m === 0) return 0;
  const sd = desviacionEstandar(ps);
  return Math.round((sd / m) * 100 * 10) / 10;
}

export function asimetria(aplicaciones) {
  const ps = aplicaciones.map(a => a.puntaje);
  if (ps.length < 3) return 0;
  const n = ps.length;
  const m = ps.reduce((s, v) => s + v, 0) / n;
  const sd = desviacionEstandar(ps);
  if (sd === 0) return 0;
  const cubico = ps.reduce((s, v) => s + Math.pow((v - m) / sd, 3), 0);
  return Math.round(((n / ((n - 1) * (n - 2))) * cubico) * 100) / 100;
}

export function tasaPorDificultad(aplicaciones, cuadernillo) {
  const out = { BAJA: { aciertos: 0, total: 0 }, MEDIA: { aciertos: 0, total: 0 }, ALTA: { aciertos: 0, total: 0 } };
  for (const p of cuadernillo.preguntas) {
    const dif = p.dificultad || 'MEDIA';
    if (!out[dif]) out[dif] = { aciertos: 0, total: 0 };
    for (const a of aplicaciones) {
      const idx = cuadernillo.preguntas.indexOf(p);
      out[dif].total++;
      if ((a.aciertos_por_pregunta || [])[idx] === 1) out[dif].aciertos++;
    }
  }
  const r = {};
  for (const k of Object.keys(out)) {
    r[k] = out[k].total > 0 ? Math.round((out[k].aciertos / out[k].total) * 100) : 0;
  }
  return r;
}

export function tiempoPromedio(aplicaciones) {
  if (!aplicaciones.length) return { promedio: 0, desviacion: 0 };
  const tiempos = aplicaciones.map(a => a.duracion_segundos || 0).filter(t => t > 0);
  if (!tiempos.length) return { promedio: 0, desviacion: 0 };
  const m = tiempos.reduce((s, v) => s + v, 0) / tiempos.length;
  return { promedio: Math.round(m), desviacion: Math.round(desviacionEstandar(tiempos)) };
}

export function discriminacionPorPregunta(aplicaciones, cuadernillo) {
  // Index discrimination: (% aciertos tercio superior) - (% aciertos tercio inferior)
  if (aplicaciones.length < 6) return cuadernillo.preguntas.map(() => 0);
  const ordenadas = [...aplicaciones].sort((a, b) => b.puntaje - a.puntaje);
  const n = ordenadas.length;
  const t = Math.floor(n / 3);
  const sup = ordenadas.slice(0, t);
  const inf = ordenadas.slice(-t);
  return cuadernillo.preguntas.map((p, idx) => {
    const aSup = sup.filter(a => (a.aciertos_por_pregunta || [])[idx] === 1).length;
    const aInf = inf.filter(a => (a.aciertos_por_pregunta || [])[idx] === 1).length;
    return Math.round(((aSup - aInf) / t) * 100);
  });
}

// === v4: Datos para gráficos extendidos ===

export function datosBoxPlot(aplicaciones) {
  const ps = aplicaciones.map(a => a.puntaje).sort((a, b) => a - b);
  if (!ps.length) return null;
  const c = cuartiles(ps);
  return {
    min: ps[0],
    q1: c.q1,
    mediana: c.q2,
    q3: c.q3,
    max: ps[ps.length - 1]
  };
}

export function datosScatter(aplicaciones) {
  return aplicaciones.map(a => ({
    x: Math.round((a.duracion_segundos || 0) / 60),  // minutos
    y: a.puntaje,
    nombre: a.estudiante_nombre,
    nivel: a.nivel
  }));
}

export function datosRadar(aplicaciones, cuadernillo) {
  const log = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  // Baseline simulado (referencia nacional) por POSICIÓN, no por clave fija a/b/c:
  // así funciona igual para LC (1/2/3), Inglés (a–e) o cualquier estructura.
  const REF = [65, 68, 62, 66, 64, 67, 63];
  return {
    competencias: Object.keys(log).map(k => `${k}. ${(cuadernillo.competencias[k] || '').slice(0, 30)}`),
    grupo: Object.keys(log).map(k => log[k]),
    baseline: Object.keys(log).map((k, i) => REF[i % REF.length])
  };
}

// === v7: Estadísticos psicométricos avanzados ===

/**
 * Índice de dificultad por pregunta (p-value): proporción de aciertos del grupo.
 * Valor típico: 0.2 a 0.8 ideal. Menor a 0.2 = muy difícil. Mayor a 0.8 = muy fácil.
 */
export function indiceDificultadPorPregunta(aplicaciones, cuadernillo) {
  const n = aplicaciones.length;
  if (!n) return cuadernillo.preguntas.map(() => 0);
  return cuadernillo.preguntas.map((p, idx) => {
    const aciertos = aplicaciones.filter(a => (a.aciertos_por_pregunta || [])[idx] === 1).length;
    return Math.round((aciertos / n) * 100) / 100;
  });
}

/**
 * Correlación punto-biserial item-test (simplificado).
 * Mide cuánto correlaciona acertar la pregunta con el puntaje total.
 * Valor entre -1 y 1. > 0.3 = buena discriminación; < 0.1 = pregunta problemática.
 */
export function correlacionPuntoBiserial(aplicaciones, cuadernillo) {
  const n = aplicaciones.length;
  if (n < 5) return cuadernillo.preguntas.map(() => 0);
  const puntajesTotal = aplicaciones.map(a => a.puntaje || 0);
  const m = puntajesTotal.reduce((s, v) => s + v, 0) / n;
  const sd = desviacionEstandar(puntajesTotal);
  if (sd === 0) return cuadernillo.preguntas.map(() => 0);
  return cuadernillo.preguntas.map((p, idx) => {
    const acertados = aplicaciones.filter(a => (a.aciertos_por_pregunta || [])[idx] === 1);
    const no_acertados = aplicaciones.filter(a => (a.aciertos_por_pregunta || [])[idx] !== 1);
    if (!acertados.length || !no_acertados.length) return 0;
    const mA = acertados.reduce((s, a) => s + (a.puntaje || 0), 0) / acertados.length;
    const p_val = acertados.length / n;
    const q_val = 1 - p_val;
    const rpb = ((mA - m) / sd) * Math.sqrt(p_val / q_val);
    return Math.round(rpb * 100) / 100;
  });
}

/**
 * KR-20 (Kuder-Richardson 20): confiabilidad del instrumento.
 * Valor entre 0 y 1. > 0.7 aceptable, > 0.8 bueno.
 */
export function kr20(aplicaciones, cuadernillo) {
  const k = cuadernillo.preguntas.length;
  const n = aplicaciones.length;
  if (n < 5 || k < 2) return 0;
  const dif = indiceDificultadPorPregunta(aplicaciones, cuadernillo);
  const sumaPQ = dif.reduce((s, p) => s + p * (1 - p), 0);
  const puntajes = aplicaciones.map(a => a.total_correctas || 0);
  const varTotal = puntajes.length > 1 ? Math.pow(desviacionEstandar(puntajes), 2) : 0;
  if (varTotal === 0) return 0;
  const r = (k / (k - 1)) * (1 - sumaPQ / varTotal);
  return Math.round(Math.max(0, Math.min(1, r)) * 1000) / 1000;
}

/**
 * Análisis de distractores: para cada pregunta, % de elecciones por opción.
 */
export function analisisDistractores(aplicaciones, cuadernillo) {
  return cuadernillo.preguntas.map(p => {
    const opciones = { A: 0, B: 0, C: 0, D: 0, '—': 0 };
    aplicaciones.forEach(a => {
      const r = (a.respuestas || []).find(r => r.pregunta_id === p.id);
      const elegida = r?.opcion_elegida_real || '—';
      opciones[elegida] = (opciones[elegida] || 0) + 1;
    });
    const n = aplicaciones.length || 1;
    return {
      pregunta: p.numero,
      clave: p.clave,
      distribucion: Object.fromEntries(Object.entries(opciones).map(([k, v]) => [k, Math.round((v / n) * 100)]))
    };
  });
}

/**
 * Error estándar de medida (SEM) basado en KR-20.
 * SEM = SD * sqrt(1 - KR20).
 */
export function errorEstandarMedida(aplicaciones, cuadernillo) {
  const r = kr20(aplicaciones, cuadernillo);
  const puntajes = aplicaciones.map(a => a.puntaje || 0);
  const sd = desviacionEstandar(puntajes);
  return Math.round(sd * Math.sqrt(Math.max(0, 1 - r)) * 10) / 10;
}

/**
 * Insights pedagógicos automatizados (3-5 hallazgos).
 */
export function insightsAutomaticos(aplicaciones, cuadernillo) {
  if (!aplicaciones.length) return [];
  const out = [];
  const puntajes = aplicaciones.map(a => a.puntaje);
  const m = puntajes.reduce((s, v) => s + v, 0) / puntajes.length;
  const sk = asimetria(aplicaciones);
  const ordenadas = [...aplicaciones].sort((a, b) => b.puntaje - a.puntaje);
  const t = Math.floor(aplicaciones.length / 3);
  if (t >= 2) {
    const sup = ordenadas.slice(0, t).reduce((s, a) => s + a.puntaje, 0) / t;
    const inf = ordenadas.slice(-t).reduce((s, a) => s + a.puntaje, 0) / t;
    const brecha = Math.round(sup - inf);
    if (brecha >= 30) out.push(`Brecha significativa entre el tercio superior y el inferior (Δ=${brecha} puntos), lo que evidencia una distribución dispersa que demanda intervenciones diferenciadas.`);
  }
  const disc = discriminacionPorPregunta(aplicaciones, cuadernillo);
  const itemsBajaDisc = disc.map((d, i) => ({ p: cuadernillo.preguntas[i].numero, d })).filter(x => x.d < 20);
  if (itemsBajaDisc.length > 0) {
    out.push(`Las preguntas ${itemsBajaDisc.slice(0, 3).map(x => 'P' + x.p).join(', ')} presentan índice de discriminación bajo (<0.2), por lo que se recomienda revisar su formulación o distractores.`);
  }
  if (Math.abs(sk) > 0.5) {
    out.push(`La distribución muestra asimetría ${sk > 0 ? 'positiva' : 'negativa'} (sk=${sk}), lo cual indica concentración hacia niveles ${sk > 0 ? 'BAJO/BÁSICO' : 'ALTO/SUPERIOR'} y una oportunidad de ${sk > 0 ? 'fortalecer la base del grupo' : 'consolidar el avance del grupo'}.`);
  }
  const conf = kr20(aplicaciones, cuadernillo);
  if (conf > 0) {
    const interp = conf > 0.8 ? 'alta' : (conf > 0.7 ? 'aceptable' : 'baja');
    out.push(`La confiabilidad del instrumento (KR-20 = ${conf}) es ${interp}, lo que indica que las puntuaciones obtenidas son ${interp === 'baja' ? 'menos consistentes y deberían interpretarse con cautela' : 'estables y reflejan adecuadamente el constructo evaluado'}.`);
  }
  const logComp = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  const minComp = Object.keys(logComp).reduce((a, b) => logComp[a] <= logComp[b] ? a : b);
  out.push(`La competencia ${minComp}. ${cuadernillo.competencias[minComp] || ''} presenta el menor logro (${logComp[minComp]}%), constituyéndose en la oportunidad prioritaria de intervención pedagógica del próximo período.`);
  return out;
}

// === v4: Recomendaciones personalizables con articulación a afirmación/evidencia ===

export function generarRecomendacionesPersonalizables(aplicaciones, cuadernillo) {
  if (!aplicaciones.length) return [];
  const total = aplicaciones.length;
  const _cfgRec = configArea(cuadernillo);
  const _hayDim2Rec = tieneDimensionSecundaria(cuadernillo);
  const logComp = logroGrupoPor(logroPorCompetencia, aplicaciones, cuadernillo);
  // Dim secundaria del área (MAT=CMC, CN=Componente, IN=MCER, LC/SC=ninguna)
  const logCmc = _hayDim2Rec ? logroGrupoPor(logroPorDimensionSecundaria, aplicaciones, cuadernillo) : {};
  const logAfir = logroGrupoPor(logroPorAfirmacion, aplicaciones, cuadernillo);
  const compKeys = Object.keys(logComp);
  const minComp = compKeys.reduce((a, b) => logComp[a] <= logComp[b] ? a : b);
  const cmcKeys = Object.keys(logCmc);
  const minCmc = cmcKeys.length ? cmcKeys.reduce((a, b) => logCmc[a] <= logCmc[b] ? a : b) : null;
  const afirKeys = Object.keys(logAfir);
  const minAfir = afirKeys.length ? afirKeys.reduce((a, b) => logAfir[a] <= logAfir[b] ? a : b) : null;
  const enBajo = aplicaciones.filter(a => a.nivel === 'BAJO').length;

  // Identificar las 3 preguntas con menor porcentaje de aciertos
  const correctas = correctasPorPreguntaGrupo(aplicaciones, cuadernillo);
  const criticas = correctas
    .map((c, i) => ({ p: cuadernillo.preguntas[i], pct: Math.round((c / total) * 100) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  const recs = [];
  let idCount = 1;
  const mkId = () => `rec-${idCount++}`;

  // Por competencia débil (3 recomendaciones) — específicas por área del cuadernillo
  estrategiasPorCompetencia(cuadernillo, minComp).forEach((estr, i) => {
    recs.push({
      id: mkId(),
      titulo: `Refuerzo ${cuadernillo.competencias[minComp]} #${i + 1}`,
      accion_detallada: estr,
      articula_con: { competencia: minComp, afirmacion: null, evidencia: null, cmc: null },
      esfuerzo: i === 0 ? 'medio' : (i === 1 ? 'bajo' : 'alto'),
      impacto: 'alto',
      duracion: i === 0 ? 'una semana' : (i === 1 ? 'una clase' : 'un mes')
    });
  });

  // Por dimensión secundaria débil: si el área la tiene (MAT, CN, Inglés) se generan
  // recomendaciones por CMC / Componente / MCER. Si no (LC, SC) se generan por afirmación más débil.
  if (_hayDim2Rec && minCmc) {
    const _etDim = _cfgRec.dimension_secundaria?.etiqueta_singular || 'contenido curricular';
    estrategiasPorCMC(cuadernillo, minCmc).forEach((estr, i) => {
      recs.push({
        id: mkId(),
        titulo: `${_etDim.charAt(0).toUpperCase() + _etDim.slice(1)}: ${minCmc} (estrategia ${i + 1})`,
        accion_detallada: estr,
        articula_con: { competencia: null, afirmacion: null, evidencia: null, cmc: minCmc },
        esfuerzo: 'medio',
        impacto: 'medio',
        duracion: 'un mes'
      });
    });
  } else if (minAfir) {
    // LC y SC: estrategias por afirmación más débil
    estrategiasPorAfirmacion(cuadernillo, minAfir).forEach((estr, i) => {
      const nomAfir = cuadernillo.afirmaciones?.[minAfir] || `Afirmación ${minAfir}`;
      recs.push({
        id: mkId(),
        titulo: `Afirmación ${minAfir}: ${nomAfir.slice(0, 50)}${nomAfir.length > 50 ? '…' : ''} (estrategia ${i + 1})`,
        accion_detallada: estr,
        articula_con: { competencia: null, afirmacion: minAfir, evidencia: null, cmc: null },
        esfuerzo: 'medio',
        impacto: 'alto',
        duracion: 'un mes'
      });
    });
  }

  // Por preguntas críticas (focalizado a evidencia específica). El campo `cmc`
  // del articula_con guarda la categoría de la dim secundaria del área (CMC,
  // componente o MCER) — leído dinámicamente vía valorDimSecundaria.
  for (const cr of criticas) {
    const _valDim2Cr = cr.p.cmc || cr.p.componente || cr.p.nivel_mcer || null;
    recs.push({
      id: mkId(),
      titulo: `Foco en pregunta P${cr.p.numero} (${cr.pct}% acertaron)`,
      accion_detallada: `Diseñar 3 actividades del estilo de la pregunta P${cr.p.numero} para reforzar la evidencia ${cr.p.evidencia} de la afirmación ${cr.p.afirmacion}. Una para introducción, otra para práctica guiada y otra para evaluación formativa.`,
      articula_con: { competencia: cr.p.competencia, afirmacion: cr.p.afirmacion, evidencia: cr.p.evidencia, cmc: _valDim2Cr },
      esfuerzo: 'bajo',
      impacto: 'alto',
      duracion: 'una clase'
    });
  }

  // Institucionales (siempre)
  recs.push({
    id: mkId(),
    titulo: 'Articulación con SIEE',
    accion_detallada: 'Incorporar criterios formativos en el SIEE que valoren el proceso, no solo el producto. Documentar los avances de evidencia.',
    articula_con: { competencia: null, afirmacion: null, evidencia: null, cmc: null },
    esfuerzo: 'alto',
    impacto: 'medio',
    duracion: 'un mes'
  });

  recs.push({
    id: mkId(),
    titulo: 'Vinculación al PEI',
    accion_detallada: 'Alinear el plan de mejora con el horizonte institucional del PEI, asegurando coherencia entre la mejora de aula y los objetivos institucionales.',
    articula_con: { competencia: null, afirmacion: null, evidencia: null, cmc: null },
    esfuerzo: 'medio',
    impacto: 'medio',
    duracion: 'un mes'
  });

  if (enBajo > 0) {
    recs.push({
      id: mkId(),
      titulo: `Tutoría focalizada para ${enBajo} estudiante(s) en BAJO`,
      accion_detallada: `Organizar tutorías semanales individuales o en parejas para los ${enBajo} estudiantes en nivel BAJO. Priorizar las evidencias con menor logro.`,
      articula_con: { competencia: minComp, afirmacion: null, evidencia: null, cmc: null },
      esfuerzo: 'alto',
      impacto: 'alto',
      duracion: 'un mes'
    });
  }

  return recs;
}
