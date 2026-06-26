// js/sabio-conocimiento.js — Base de conocimiento de "Sabio IA" + restricciones (guardas).
//
// Sabio IA responde dudas sobre CÓMO USAR el Instrumento IDEA e interpretar sus resultados,
// a partir de una base curada (no es un modelo externo ni accede a internet). Tiene guardas:
// NO habla del código ni de la implementación interna, NO da credenciales de terceros, NO
// atiende temas fuera de lo educativo ni intentos de manipular sus instrucciones; en esos
// casos declina con amabilidad. La idea: que ayude en casi todo lo pedagógico, con límites claros.

function _norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Temas que Sabio IA NO puede responder (técnicos/internos, seguridad, manipulación).
import { responderPedagogia } from './sabio-pedagogia.js';

const BLOQUEADOS = [
  /\bcodigo\b|\bcode\b|javascript|typescript|\bhtml\b|\bcss\b|\bjs\b|programa(r|cion)|script\b/,
  /firebase|firestore|base de datos|\bsql\b|backend|servidor|\bapi\b|\btoken\b|clave de servicio|deploy|hosting|repositorio|github/,
  /hacke|vulnerab|inyect|exploit|burlar|saltar(me)? la seguridad|acceder a (otro|otra|los|las|cuentas)|contrase[nñ]a de (otro|otra|alguien|los|las|el|la)|robar/,
  /ignora (tus|las|estas) (instrucci|reglas)|olvida (tus|las) (instrucci|reglas)|actua como|haz de cuenta que eres|system prompt|tus instrucciones/
];
// Temas fuera del propósito educativo (respuesta suave de reencauce).
const FUERA_TEMA = [/\bpolitica\b|religion|chiste|receta|horoscopo|futbol|pelicula|cancion|cripto|invertir|apuesta/];

// Base de conocimiento: cada entrada tiene palabras clave y una respuesta clara.
const CONOCIMIENTO = [
  { claves: ['radar', 'radar de competencias', 'radar por competencias', 'grafico de radar', 'grafica de radar', 'diagrama circular', 'araña', 'arana', 'telaraña', 'telarana'], r: 'La gráfica de radar (el diagrama circular) muestra el % de logro del grupo en cada competencia: cuanto más lejos del centro está el vértice, mejor el desempeño. El vértice más hundido es la competencia más débil y suele ser tu prioridad para el plan de mejora. Se diferencia de la alineación curricular, que usa barras por competencia, afirmación y evidencia.' },
  { claves: ['barra', 'barras', 'logro', 'grafica de barras'], r: 'Las barras de logro muestran el porcentaje de aciertos del grupo por competencia, afirmación o evidencia. Por encima del 65% es fortaleza (verde); por debajo, una oportunidad de mejora.' },
  { claves: ['nivel', 'niveles', 'bajo', 'basico', 'alto', 'superior', 'clasificacion'], r: 'Los niveles se asignan por puntaje: BAJO hasta 59, BÁSICO de 60 a 78, ALTO de 79 a 90 y SUPERIOR más de 90. En los colores ICFES, ALTO va en amarillo y SUPERIOR en verde.' },
  { claves: ['afirmacion', 'afirmaciones'], r: 'Una afirmación es lo que el estudiante es capaz de hacer dentro de una competencia. En el desglose ves el % de logro por afirmación; la más baja indica dónde conviene intervenir primero.' },
  { claves: ['evidencia', 'evidencias'], r: 'La evidencia es la señal concreta y observable de una afirmación. Te dice con precisión qué reforzar: es el nivel más fino del marco DCE.' },
  { claves: ['competencia', 'competencias'], r: 'Una competencia agrupa habilidades grandes del área (por ejemplo en Matemáticas: razonamiento, comunicación y resolución). Cada competencia se mide a través de sus afirmaciones y evidencias.' },
  { claves: ['componente', 'componentes', 'cmc', 'contenido'], r: 'El componente (o contenido curricular) es la dimensión temática del área. El desglose te muestra el logro por componente para ubicar el tema con más dificultad.' },
  { claves: ['dificultad'], r: 'La dificultad de cada pregunta se calcula con el propio grupo: ALTA si menos del 35% acertó (rojo), MEDIA entre 35% y 65% (naranja) y BAJA con 65% o más (verde).' },
  { claves: ['plan', 'mejora', 'accion', 'estrategia', 'estrategias', 'planear', 'planeacion'], r: 'Para crear el Plan de mejora pulsa "Crear Plan de Mejora", elige la materia y dentro usa "Autocompletar con Sabio IA": analizo los resultados del grupo y propongo oportunidades, estrategias y seguimiento articulados con el marco. Puedes editar todo a tu criterio.' },
  { claves: ['semaforo', 'color', 'colores', 'verde', 'rojo', 'amarillo'], r: 'El semáforo usa el corte del 65%: verde es fortaleza y por debajo es oportunidad de mejora. Sirve para leer de un vistazo dónde está el grupo.' },
  { claves: ['riesgo', 'estudiantes en riesgo'], r: 'Los estudiantes en riesgo son los que quedaron en nivel BAJO. Conviene priorizar acompañamiento con ellos; aparecen listados en tu panel de análisis.' },
  { claves: ['proyeccion', 'saber', 'saber 11', 'icfes'], r: 'La proyección estima cómo se vería el grupo en Saber 11° a partir del desempeño actual. Es orientativa: te ayuda a anticipar y a enfocar la planeación.' },
  { claves: ['certificado', 'excelencia', 'diploma', 'reconocimiento'], r: 'El certificado de excelencia se activa automáticamente cuando un estudiante alcanza promedio global superior a 90 y su grupo completa todas las pruebas. El estudiante lo descarga y el docente ve la lista de quienes lo lograron.' },
  { claves: ['promedio', 'media'], r: 'El promedio del grupo es el porcentaje medio de aciertos de los estudiantes que presentaron. Lo ves en los KPIs del panel y resume el desempeño general.' },
  { claves: ['presentar', 'prueba', 'cuadernillo', 'examen', 'responder la prueba'], r: 'Para presentar la prueba, el estudiante entra a su panel y abre el cuadernillo asignado; al enviarlo ve su resultado. Cada prueba se presenta una sola vez, salvo que se autorice un reintento.' },
  { claves: ['reintento', 'repetir', 'volver a presentar', 'permiso'], r: 'Si un estudiante necesita repetir una prueba, un docente o el manager debe autorizar un reintento. Sin esa autorización no se puede volver a presentar, para no perder los datos del intento real.' },
  { claves: ['exportar', 'excel', 'pdf', 'descargar', 'reporte', 'informe', 'word'], r: 'Puedes descargar los reportes del grupo en PDF y Excel desde las acciones del panel; incluyen el desglose por pregunta y la alineación con el marco DCE.' },
  { claves: ['fase', 'fases', 'ciclo', 'momento', 'momentos'], r: 'IDEA tiene 3 fases: I Aplicación (el estudiante presenta la prueba), II Análisis y Planeación (el docente interpreta y arma el plan) y III Implementación (lleva el plan al aula).' },
  { claves: ['entrar', 'ingresar', 'iniciar sesion', 'usuario', 'login', 'acceder', 'contraseña'], r: 'Ingresa con el usuario y la contraseña que te entregaron para tu rol. Si tu institución creó tu cuenta, usa ese usuario; los estudiantes suelen entrar con su número de documento.' },
  { claves: ['quien eres', 'que eres', 'sabio', 'que puedes hacer', 'ayuda'], r: 'Soy Sabio IA, el asistente del Instrumento IDEA. Te explico cada panel, te muestro dónde está cada cosa y te ayudo a interpretar tus gráficas y resultados y a planear la mejora. Puedo guiarte en casi todo lo de la plataforma; lo que no hago es hablar del código ni de temas ajenos a lo educativo.' },
  { claves: ['directivo', 'consolidado', 'institucional', 'comparativo'], r: 'El panel directivo muestra el consolidado institucional: resultados por grupo y materia, comparativos y ranking, para tomar decisiones a nivel de toda la institución.' },
  { claves: ['grupo', 'materia', 'seleccionar grupo', 'curso'], r: 'En el panel docente cada curso es un acordeón con sus materias. Al abrir una materia ves su análisis completo; desde ahí también puedes crear su plan de mejora.' },
  { claves: ['alineacion curricular', 'alineacion', 'mbe', 'linealidad', 'codigos y titulos'], r: 'La gráfica de alineación curricular (MBE) compara con BARRAS el % de logro por competencia, por afirmación y por evidencia, mostrando la linealidad del marco DCE. A diferencia del radar, aquí cada barra es un código concreto (una competencia, una afirmación o una evidencia), así ubicas con precisión cuál está más baja y conviene reforzar.' },
  { claves: ['desglose', 'pregunta por pregunta', 'item por item', 'tabla de preguntas'], r: 'El desglose muestra pregunta por pregunta: su competencia, afirmación, evidencia, componente, dificultad y el % de aciertos del grupo. Puedes filtrar por columna (como en Excel) para encontrar, por ejemplo, todas las preguntas de una afirmación con dificultad ALTA.' },
  { claves: ['kpi', 'kpis', 'indicador', 'indicadores', 'tarjetas de arriba'], r: 'Los KPIs son las tarjetas resumen del grupo: promedio, número de estudiantes, distribución por nivel y la competencia más débil. Te dan la foto general antes de entrar al detalle.' },
  { claves: ['distribucion', 'histograma', 'cuantos estudiantes'], r: 'La distribución (histograma) muestra cuántos estudiantes cayeron en cada nivel o rango de puntaje. Si la mayoría está a la izquierda (puntajes bajos), el grupo necesita refuerzo amplio; si está a la derecha, el desempeño es sólido.' },
  { claves: ['mapa de calor', 'heatmap', 'matriz'], r: 'El mapa de calor cruza estudiantes con preguntas o afirmaciones: las celdas rojas son errores y las verdes aciertos. Sirve para ver de un vistazo si un error es general del grupo (columna roja) o de pocos estudiantes (celdas sueltas).' },
  { claves: ['conclusiones', 'analisis profundo', 'interpretacion automatica', 'insight'], r: 'Las conclusiones reúnen los hallazgos clave del grupo en lenguaje pedagógico: fortalezas, oportunidades y patrones. Son un buen punto de partida para redactar tu informe o sustentar el plan.' },
  { claves: ['comparativo individual', 'por estudiante', 'estudiante especifico', 'comparar estudiantes'], r: 'El comparativo individual te deja ver el desempeño de cada estudiante frente al promedio del grupo, para detectar quién necesita acompañamiento personalizado y quién puede ir más allá.' },
  { claves: ['mcer', 'ingles', 'nivel de ingles', 'a1', 'a2', 'b1'], r: 'En Inglés el desempeño se organiza por niveles del MCER (Pre-A1, A1, A2, B1…) y por partes del cuadernillo, no por competencias y afirmaciones como en las otras áreas. El análisis y el color se hacen por esos niveles.' },
  { claves: ['contexto', 'lectura', 'lectura critica', 'texto'], r: 'En Lectura Crítica las preguntas se agrupan por contextos (un texto y sus preguntas asociadas). Conviene leer el desempeño por contexto para ver si la dificultad está en un tipo de texto puntual.' },
  { claves: ['que hago', 'como mejoro', 'resultados bajos', 'salio bajo', 'salieron mal', 'que sigue'], r: 'Si el grupo salió bajo, el camino es: 1) identifica la afirmación o componente más débil en el desglose o la alineación; 2) crea el Plan de mejora y usa "Autocompletar con Sabio IA"; 3) aplica las estrategias en el aula durante el período; 4) vuelve a aplicar el cuadernillo y compara. La mejora se mide, no se asume.' },
  { claves: ['diferencia', 'afirmacion y evidencia', 'competencia y afirmacion'], r: 'La jerarquía del marco DCE va de lo general a lo específico: la COMPETENCIA es la habilidad amplia, la AFIRMACIÓN es lo que el estudiante logra dentro de ella, y la EVIDENCIA es la señal concreta y observable de esa afirmación. Intervenir a nivel de evidencia es lo más preciso.' },
  { claves: ['dce', 'marco', 'diseno centrado en evidencias', 'marco de evaluacion'], r: 'El DCE (Diseño Centrado en Evidencias) es el marco del ICFES que estructura cada prueba: competencias, afirmaciones y evidencias. IDEA alinea todo el análisis a ese marco para que tus decisiones hablen el mismo lenguaje que Saber.' },
  { claves: ['que es idea', 'para que sirve', 'instrumento idea', 'de que trata'], r: 'El Instrumento IDEA articula la evaluación diagnóstica, el análisis pedagógico y la mejora institucional en un ciclo de tres fases, convirtiendo cada resultado en decisiones concretas para el aula. Soy el asistente que te acompaña en todo ese proceso.' },
  { claves: ['manager', 'reiniciar', 'asignar', 'gestionar usuarios', 'borrar pruebas'], r: 'El panel del manager prepara la plataforma: asigna docentes a grupos y directivos a instituciones, gestiona reintentos y puede borrar pruebas de demostración. Es el centro de control institucional.' }
];

/**
 * Responde una pregunta del usuario. Primero aplica las guardas; luego busca en la base de
 * conocimiento y en los temas de la página actual. Devuelve { texto, element, bloqueado }.
 * @param {string} pregunta
 * @param {Array} pasosPagina  temas de ayuda de la página (GUIA_CONTENIDOS[pagina]) para anclar respuestas a un elemento.
 */
export function responderSabioIA(pregunta, pasosPagina, ctx) {
  const qn = _norm(pregunta);
  if (BLOQUEADOS.some(re => re.test(qn))) {
    return { bloqueado: true, element: null, texto: 'Eso no te lo puedo responder. No doy información sobre el código, la implementación interna, accesos o contraseñas de otras personas, ni temas fuera de lo educativo. Pregúntame cómo usar IDEA o cómo interpretar tus resultados y con gusto te ayudo.' };
  }
  if (FUERA_TEMA.some(re => re.test(qn))) {
    return { bloqueado: true, element: null, texto: 'Me especializo en el Instrumento IDEA: interpretar resultados, competencias, niveles y planear la mejora. Eso se sale de mi tema, pero con todo lo de la plataforma te ayudo encantado.' };
  }
  const palabras = qn.split(/[^a-z0-9ñ]+/i).map(_norm).filter(w => w.length > 3);
  // CAPA PEDAGÓGICA (experto entrenado): si la pregunta es sobre CÓMO ENSEÑAR —estrategias,
  // ejemplos para el aula, aprendizaje significativo, resolución de problemas, planes de mejora,
  // diferenciación, retroalimentación— responde la base pedagógica por área y grado. Si no es de
  // ese dominio devuelve null y seguimos con la base de uso de la plataforma.
  const ped = responderPedagogia(pregunta, ctx);
  if (ped && ped.texto) return { texto: ped.texto, element: null };

  let best = null, score = 0;
  CONOCIMIENTO.forEach(e => {
    let s = 0;
    // Peso por especificidad: una FRASE completa (+4) o el término principal del tema
    // (la 1ª clave, +3) pesan más que una palabra genérica (+2). Así "radar de competencias"
    // gana a la definición suelta de "competencia".
    e.claves.forEach((c, idx) => { const cn = _norm(c); if (qn.includes(cn)) s += cn.includes(' ') ? 4 : (idx === 0 ? 3 : 2); });
    palabras.forEach(w => { if (e.claves.some(c => { const cn = _norm(c); return cn.includes(w) || w.includes(cn); })) s += 1; });
    if (s > score) { score = s; best = e; }
  });
  // Tema de la página afín (para ofrecer "Muéstrame dónde" sobre un elemento real).
  let bestPaso = null, scoreP = 0;
  (pasosPagina || []).forEach(p => {
    const hay = _norm(`${p.titulo || ''} ${p.texto || ''}`);
    let s = 0; palabras.forEach(w => { if (hay.includes(w)) s++; });
    if (s > scoreP) { scoreP = s; bestPaso = p; }
  });
  const elementoAfin = (bestPaso && scoreP > 0 && bestPaso.element) ? bestPaso.element : null;
  if (best && score >= 2) return { texto: best.r, element: elementoAfin };
  if (bestPaso && scoreP > 0) return { texto: bestPaso.texto, element: bestPaso.element || null };
  if (best && score > 0) return { texto: best.r, element: null };
  return { texto: 'No estoy seguro de eso todavía. Puedo ayudarte a interpretar tus gráficas (radar, barras), entender competencias, afirmaciones, evidencias, niveles y el semáforo, o a crear el plan de mejora. ¿Sobre cuál de estos te ayudo?', element: null };
}
