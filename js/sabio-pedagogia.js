// js/sabio-pedagogia.js — Base de conocimiento PEDAGÓGICA experta de "Sabio IA" (entrenamiento por capas).
//
// Estructura por CAPAS: capa por ÁREA → dentro, capa por BANDA de grado (primaria 3°-5°,
// secundaria 6°-9°, media 10°-11°) → dentro, estrategias didácticas, ejemplos para el aula,
// aprendizaje significativo (Ausubel), resolución de problemas (Polya/ABP) y dificultades +
// remediación. Más una capa TRANSVERSAL (marcos pedagógicos, evaluación formativa, PTA/FI) y
// una capa de ACOMPAÑAMIENTO (cómo Sabio guía al docente que no sabe qué pedir).
//
// Sintetizado a partir de los Estándares Básicos de Competencias (EBC), los DBA, las mallas de
// aprendizaje del MEN, el marco ICFES (competencias, afirmaciones, evidencias), el Programa Todos
// a Aprender (PTA/FI, pruebas EGRA/EGMA) y la literatura didáctica (Ausubel, Polya, Solé, Cassany,
// Krashen, Vygotsky, Bloom, Black & Wiliam, Hattie, CAST/DUA). Determinista: no es un modelo
// externo ni accede a internet; se comporta como un experto entrenado, con límites claros.

function _n(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

// Capa ADITIVA por grado (sincrona, lee del cache que precarga el bootstrap del panel).
// Si hay celda sabio_conocimiento por grado se usa; si no, el fallback por banda de abajo.
import { pedagogiaDeSync } from './pedagogia-grado.js';
// Mapa areaKey corto (mat/lc/cn/sc/in) -> area_slug del JSON por grado.
const _AREAKEY_A_SLUG = { mat: 'matematicas', lc: 'lectura_critica', cn: 'ciencias_naturales', sc: 'sociales_ciudadanas', in: 'ingles' };

// ── Detección de ÁREA (con sinónimos) y BANDA por grado ──────────────────────────────────
const AREA_ALIAS = {
  mat: ['matematica', 'matematicas', 'mate', 'numerico', 'fraccion', 'algebra', 'geometria', 'aritmetica', 'calculo', 'trigonometria', 'estadistica', 'funcion'],
  lc: ['lectura critica', 'lectura', 'lenguaje', 'lengua', 'comprension lectora', 'escritura', 'comprension', 'texto', 'literatura', 'leer', 'escribir', 'redaccion', 'fluidez'],
  cn: ['ciencias naturales', 'ciencias', 'naturales', 'biologia', 'quimica', 'fisica', 'indagacion', 'cn', 'experimento', 'laboratorio'],
  sc: ['sociales', 'ciencias sociales', 'ciudadanas', 'competencias ciudadanas', 'ciudadania', 'historia', 'geografia', 'sc', 'convivencia', 'paz', 'civica'],
  in: ['ingles', 'english', 'lengua extranjera', 'mcer', 'bilingue', 'idioma', 'in']
};
function detectarArea(qn) {
  for (const a of ['mat', 'lc', 'cn', 'sc', 'in']) { if (AREA_ALIAS[a].some(k => qn.includes(_n(k)))) return a; }
  return null;
}
function detectarBanda(qn) {
  const m = qn.match(/\b(transici[oó]n|1[°º]?|2[°º]?|3[°º]?|4[°º]?|5[°º]?|6[°º]?|7[°º]?|8[°º]?|9[°º]?|10[°º]?|11[°º]?|grado\s*\d+)\b/);
  const g = m ? parseInt((m[0].match(/\d+/) || [0])[0], 10) : 0;
  if (g >= 3 && g <= 5) return 'primaria';
  if (g >= 6 && g <= 9) return 'secundaria';
  if (g >= 10 && g <= 11) return 'media';
  if (/primaria|ni[nñ]os|peque[nñ]os|tercero|cuarto|quinto/.test(qn)) return 'primaria';
  if (/secundaria|bachillerato|sexto|septimo|octavo|noveno/.test(qn)) return 'secundaria';
  if (/media|decimo|once|saber\s*11|icfes|preicfes/.test(qn)) return 'media';
  return null;
}

// ── CAPA POR ÁREA Y BANDA ────────────────────────────────────────────────────────────────
// estr: estrategias "Nombre — cómo". ej: actividades listas. sig: aprendizaje significativo.
// prob: resolución de problemas en el área. dif: "dificultad → remediación".
const AREAS = {
  mat: {
    nombre: 'Matemáticas',
    foco: 'La resolución de problemas (Polya) sobre una base de aprendizaje significativo (Ausubel) es el eje articulador; etiqueta cada recomendación con las competencias ICFES (interpretación-representación, formulación-ejecución, argumentación).',
    primaria: {
      comp: 'En 3°-5° se consolida el pensamiento numérico (valor posicional, las cuatro operaciones con sentido) y entran las fracciones en sus cuatro interpretaciones DBA (razón, parte-todo, cociente y operador), junto con medida, datos y patrones.',
      estr: [
        'Resolución de problemas tipo Polya (4 pasos) — comprender (subrayar dato e incógnita), idear plan (dibujo o problema similar), ejecutar y, sobre todo, verificar que la respuesta tenga sentido y unidades.',
        'Secuencia Concreto–Pictórico–Abstracto (CPA) — primero el material (bloques base 10, regletas), luego el dibujo, por último el símbolo; no saltar al algoritmo antes del modelo.',
        'Representaciones múltiples de la fracción — la misma fracción como porción, punto en la recta numérica, parte de una colección y reparto; pedir traducir de una a otra.',
        'Estimación previa y cálculo mental — antes de operar, estimar el orden del resultado; sirve de verificación natural.',
        'El error como recurso — mostrar un procedimiento equivocado anónimo y pedir que detecten dónde y por qué falla.',
        'Modelización de situaciones cotidianas — convertir un reparto, una compra o una medición real en un modelo matemático sencillo.'
      ],
      ej: [
        'La tienda escolar: "Tienes $5.000, una empanada cuesta $1.800 y un jugo $1.200. ¿Te alcanza para dos empanadas y un jugo? ¿Cuánto sobra o falta?" (estimación, suma, resta, argumentación).',
        'Repartir la torta: "Se reparte en partes iguales entre 8 niños; llegan 4 más. ¿Qué fracción le toca ahora a cada uno y por qué es menos que antes?" (fracción parte-todo y cociente).',
        'Encuesta de la fruta favorita: recolectan datos, hacen tabla de frecuencia y gráfico de barras, hallan la moda y deciden "¿qué fruta compraría el restaurante escolar?".',
        'Patrón de baldosas: dado un patrón que crece (1, 3, 5…), predecir cuántas habrá en la figura 10 y describir la regla con palabras (variacional temprano).'
      ],
      sig: 'Ancle el concepto en una pregunta-ancla del contexto del niño ("¿quién ha repartido algo en partes iguales?") y use organizadores previos visibles (una recta numérica grande, un esquema parte-todo) como puente cognitivo. El material debe ser potencialmente significativo: dinero, comida, juego, su barrio.',
      prob: 'Invierta tiempo en la fase de comprensión de Polya: los problemas verbales se atascan en entender el enunciado, no en calcular. Lea el problema completo, identifique dato e incógnita y haga siempre un dibujo.',
      dif: [
        'Valor posicional débil (escribe 305 como 30005) → retomar bloques base 10 y tableros de posición antes del símbolo.',
        'Suma/resta sin sentido de la reagrupación → modelar el canje de 10 unidades por 1 decena con material concreto.',
        'Fracciones como dos números separados (1/2 + 1/3 = 2/5) → volver a la representación de área y a la recta; nunca operar fracciones sin modelo gráfico.',
        'Confundir perímetro con área → experiencia física distinta: rodear con cuerda (perímetro) vs. cubrir con cuadrícula (área).'
      ]
    },
    secundaria: {
      comp: 'En 6°-9° se transita de la aritmética al álgebra (pensamiento variacional): enteros y racionales con signo, razones, proporciones y porcentajes, expresiones algebraicas, ecuaciones, sistemas 2×2 y la noción de función lineal; más Pitágoras, semejanza, estadística y probabilidad simple.',
      estr: [
        'Aprendizaje basado en problemas y proyectos (ABP) — anclar la unidad a un problema real (presupuesto de una rifa, diseño de una huerta) donde el contenido emerge como necesidad.',
        'Representaciones múltiples de la función (regla de cuatro) — la misma relación como tabla, gráfica, expresión algebraica y enunciado verbal; traducir entre las cuatro.',
        'Álgebra con sentido geométrico (modelo de áreas) — representar (x+3)(x+2) como un rectángulo para dar significado a productos notables y factorización, no memoria de fórmulas.',
        'Recta numérica para enteros — sumar/restar enteros como desplazamientos (deudas y ahorros, temperaturas) antes que reglas de signos memorizadas.',
        'Modelización matemática — del fenómeno al modelo y de vuelta a la interpretación: tabla → gráfico → expresión → predicción.',
        'El error como recurso — confrontar el error de distributividad (a+b)² = a²+b² con el contraejemplo numérico y el modelo de áreas.'
      ],
      ej: [
        'El plan de datos del celular: "$15.000 fijos + $50 por minuto. Construye la tabla, la gráfica y la fórmula; ¿cuánto pagas con 120 minutos?" (función lineal; interpretar pendiente e intercepto).',
        'La rifa del curso: "Compramos 100 boletas a $2.000 y vendemos a $5.000; si vendemos el 80%, ¿cuánta ganancia hay?" (proporcionalidad y porcentaje).',
        '¿Quién mide más justo?: con las notas de dos grupos, decidir cuál "va mejor" comparando media, mediana y moda y argumentar por qué la media puede engañar con un dato extremo.',
        'La sombra del árbol: estimar la altura de un poste con su sombra y un objeto de altura conocida (semejanza de triángulos).'
      ],
      sig: 'Ancle "la letra" en algo conocido: la variable como número generalizado (patrones) y como cantidad que varía (proporcionalidad), no como letra misteriosa. Conecte con contextos económicos reales (planes de celular, descuentos, salarios).',
      prob: 'Exija el modelo explícito antes de operar (¿qué relación hay entre las cantidades?) y cierre con la interpretación del resultado en el contexto: no basta "x=5", sino "5 horas, lo cual es razonable".',
      dif: [
        'Reglas de signos memorizadas y mal aplicadas → volver al modelo de recta numérica y de deudas/ahorros.',
        'Distributividad mal generalizada ((a+b)²=a²+b²) → contraejemplo numérico inmediato + modelo de áreas.',
        'Aplicar regla de tres a relaciones que no son proporcionales → discriminar primero si la relación es proporcional (¿el doble produce el doble?).',
        'Sumar términos no semejantes (3x+2=5x) → modelo de cajas y objetos o algebra tiles; verbalizar qué representa x.'
      ]
    },
    media: {
      comp: 'En 10°-11° se profundiza el pensamiento variacional hacia las funciones (cuadrática, exponencial, logarítmica, trigonométricas) y nociones de cálculo (razón de cambio, derivada introductoria), trigonometría, geometría analítica y estadística con dispersión y probabilidad. Es la banda evaluada por Saber 11.',
      estr: [
        'Modelización avanzada (datos reales → función) — ajustar un modelo (lineal, exponencial, cuadrático) a datos reales (población, precios, TRM) e interpretarlo críticamente.',
        'Tecnología y graficadores (GeoGebra, Desmos, hoja de cálculo) — explorar familias de funciones moviendo parámetros (a, b, c de la parábola; frecuencia del seno).',
        'El error como recurso y análisis de distractores Saber — analizar por qué cada opción incorrecta de una pregunta ICFES es plausible y qué error de razonamiento captura.',
        'Argumentación y demostración guiada — identidades, propiedades de funciones, cadenas "porque… entonces…"; es justo lo que mide la competencia de argumentación.',
        'Aprendizaje basado en proyectos — un estudio estadístico completo del propio colegio (pregunta, muestra, análisis, conclusión) o medición indirecta con trigonometría.',
        'Conexión interdisciplinar — la derivada como velocidad (física), la exponencial como interés compuesto (economía).'
      ],
      ej: [
        'La altura del Galeras: "Ves la cima con ángulo de 32°; te alejas 500 m y es de 25°. Estima la altura" (trigonometría, teorema del seno).',
        'CDT vs. ahorros: comparar $1.000.000 a interés simple del 1% mensual contra interés compuesto; graficar ambas funciones y argumentar cuándo conviene cada una (exponencial vs. lineal).',
        'El cohete de agua: modelar la altura en función del tiempo, hallar la altura máxima (vértice) y cuándo cae (raíces) (función cuadrática).',
        'Simulacro Saber comentado: resolver una pregunta liberada y, además de marcar la correcta, escribir por qué cada distractor es falso.'
      ],
      sig: 'Use mapas conceptuales de familias de funciones y conexiones explícitas ("la pendiente, la razón de cambio y la derivada son el mismo concepto en distinto nivel"). Ancle en datos colombianos reales para combatir el "¿esto para qué sirve?".',
      prob: 'Exija el ciclo completo de modelización (situación → modelo → solución → interpretación → validación) y la metacognición de Polya, que es lo que evalúa la argumentación de Saber 11. Entrene con simulacros cronometrados y análisis de distractores.',
      dif: [
        'Función vista como "fórmula para reemplazar", sin idea de dependencia → insistir en lectura de gráficas y la regla de cuatro representaciones.',
        'Trigonometría memorística (SOH-CAH-TOA sin sentido) → anclar en el triángulo y en problemas reales de medición indirecta.',
        'Confundir la pendiente con el valor de y → ejercicios de "¿dónde crece más rápido?" sobre gráficas reales.',
        'Lectura acrítica de estadísticas (correlación = causalidad, media engañosa) → análisis crítico de gráficos de prensa; distinguir descripción de inferencia.'
      ]
    },
    frases: [
      'Se sugiere anclar el nuevo concepto en los conocimientos previos del estudiante, partiendo de una situación significativa de su contexto.',
      'Conviene transitar por la secuencia concreto–pictórico–abstracto, evitando saltar prematuramente al algoritmo.',
      'Resulta clave fortalecer la comprensión del enunciado (fase de comprensión de Polya) antes de iniciar cualquier operación.',
      'Es pertinente diversificar las representaciones (tabular, gráfica, simbólica y verbal) y solicitar la conversión entre ellas.'
    ]
  },
  lc: {
    nombre: 'Lenguaje y Lectura Crítica',
    foco: 'La tríada articuladora es: niveles de lectura literal–inferencial–crítico = tres competencias ICFES (local, global, crítico-reflexiva) = tres lecturas de Cassany (las líneas, entre líneas, detrás de las líneas), con Solé (antes–durante–después) como estructura de toda sesión.',
    primaria: {
      comp: 'En 3°-5° se transita de "aprender a leer" a "leer para aprender": identificar información explícita, reconstruir la secuencia, hacer inferencias sencillas y producir textos cortos con estructura (inicio, desarrollo, cierre).',
      estr: [
        'Las tres fases de Solé — antes (activar saberes, explorar paratextos, fijar propósito y predecir), durante (paradas para preguntar y verificar) y después (recapitular y producir).',
        'Trabajo sistemático de fluidez — lectura repetida del mismo texto, lectura en coro o eco, lectura por parejas y "1 minuto de lectura" con metas personales; ataca el déficit de lectura de palabras (tipo EGRA).',
        'Preguntas literales, inferenciales y críticas graduadas — por cada texto, al menos una de cada nivel.',
        'Modelado metacognitivo (pensar en voz alta) — el docente verbaliza cómo deduce, cómo se devuelve cuando no entiende y cómo predice.',
        'Organizadores gráficos — mapa del cuento (inicio, nudo, desenlace), línea de tiempo, cuadro de personajes, tabla SQA (Sé, Quiero saber, Aprendí).',
        'Escritura por procesos simple — planear con un organizador, escribir borrador, revisar con lista de chequeo (¿tiene inicio?, ¿se entiende?, ¿usé mayúscula y punto?) y pasar a limpio.'
      ],
      ej: [
        'El detective de la fábula: leer "El renacuajo paseador" de Pombo; subrayar lo que el texto dice (literal), anotar lo que deduce que sentía (inferencial) y responder "¿qué enseñanza deja y estás de acuerdo?" (crítico).',
        'Reto de fluidez de un minuto: leer en voz alta un párrafo de ~60 palabras, registrar cuántas leyó, practicar tres veces en la semana y graficar su mejora personal.',
        'Mapa del cuento del Mohán: leer una leyenda colombiana y completar personajes, lugar, problema y solución.',
        'SQA del agua: antes de un texto informativo, llenar "qué Sé" y "qué Quiero saber"; después, "qué Aprendí".'
      ],
      sig: 'Active saberes previos siempre antes de leer y conecte el texto con la experiencia del niño (su campo, su río, su mercado, sus fiestas). El propósito de lectura debe ser explícito y motivador, nunca "lean porque toca".',
      prob: 'Introduzca situaciones comunicativas auténticas: escribir una invitación real, redactar las normas del salón, hacer un afiche para la huerta. El problema retórico es decidir qué decir, a quién y para qué.',
      dif: [
        'Déficit de lectura de palabras y fluidez (silabean, no respetan signos, no comprenden) → trabajo diario y breve de fluidez; nunca abandonar la lectura en voz alta.',
        'Vocabulario pobre → vocabulario en contexto, muros de palabras, lectura abundante.',
        'Dificultad para inferir → modelar en voz alta el proceso inferencial y dar pistas ("¿qué palabra del texto te ayuda a saberlo?").',
        'Escritura como acto único sin revisión → instalar la rutina de borrador y lista de chequeo.'
      ]
    },
    secundaria: {
      comp: 'En 6°-9° se pasa a textos expositivos y argumentativos: distinguir hechos de opiniones, identificar tesis y argumentos, reconocer la intención del autor y producir textos argumentativos con cohesión y conectores.',
      estr: [
        'Secuencias de escritura por procesos — planeación (tesis y esquema), textualización, revisión entre pares con rúbrica, edición y publicación; la argumentación es proceso recursivo.',
        'Lectura crítica de medios (Cassany, detrás de las líneas) — identificar quién escribe, para quién, con qué intención y qué deja por fuera; aplicar a publicidad y titulares.',
        'Debate y argumentación estructurada — tesis polémica, posturas a favor y en contra, tres argumentos con evidencia, contraargumentar y cerrar.',
        'Preguntas de los tres niveles ICFES — local (significado de un conector en contexto), global (cuál es la tesis, función de un párrafo) y crítico (qué intención y qué tan válido es el argumento).',
        'Organizadores gráficos avanzados — mapa argumental (tesis-argumentos-evidencias-contraargumentos), cuadro comparativo de dos textos.',
        'Rutinas de pensamiento — "Antes pensaba / Ahora pienso", "Afirmar, Apoyar, Cuestionar", "Círculo de puntos de vista".'
      ],
      ej: [
        'Detector de tesis: con tres columnas de opinión cortas, subrayar la tesis, listar argumentos y señalar cuál está mejor sustentada y por qué.',
        'Publicidad bajo lupa: analizar un comercial real — ¿qué te quieren vender?, ¿qué emoción usan?, ¿qué no te dicen?',
        'Carta de reclamo real: redactar una carta formal por un problema verídico del entorno, con estructura, tono respetuoso y argumentos.',
        'Dos noticias, un hecho: comparar cómo dos medios cuentan el mismo hecho y notar la postura de cada uno.'
      ],
      sig: 'Conecte los textos con debates que les importan a los adolescentes (identidad, redes, justicia, ambiente) y con la realidad colombiana. Los propósitos deben ser desafiantes: leer para tomar postura, comparar, decidir.',
      prob: 'Plantee problemas retóricos reales: escribir para convencer a una audiencia específica (una propuesta para el gobierno escolar, una campaña, el periódico del colegio). Escribir es resolver el problema de hacerse entender por otro.',
      dif: [
        'Quedarse en lo literal sin inferir la tesis ni la intención → preguntas guiadas de nivel global y crítico, y modelado de cómo se rastrea una tesis.',
        'Escritura con cohesión y coherencia frágiles (ideas sueltas, mal uso de conectores) → trabajo explícito de conectores, esquemas previos y revisión entre pares.',
        'Confundir hechos con opiniones y aceptar acríticamente los medios → análisis sistemático de fuentes e intención.',
        'Rezagos de fluidez arrastrados de primaria → sostener lectura en voz alta y diagnósticos breves.'
      ]
    },
    media: {
      comp: 'En 10°-11° se consolida la lectura crítica en sus tres competencias ICFES plenas: comprender contenidos locales, comprender la articulación global del texto y reflexionar/evaluar (intención del autor, supuestos, validez de argumentos, falacias). Meta: mover a los estudiantes a los niveles 3 y 4.',
      estr: [
        'Entrenamiento explícito en las tres competencias ICFES — enseñar a reconocer qué pide cada pregunta (local, global o crítica) y qué procedimiento mental exige.',
        'Lectura crítica detrás de las líneas (Cassany) como rutina diaria — quién escribe, desde qué posición, para quién, con qué intención, qué silencia.',
        'Análisis de la estructura argumentativa — tesis, argumentos, evidencias, contraargumentos; tipos de argumento y detección de falacias (ad hominem, falsa causa, generalización apresurada).',
        'Ensayo argumentativo por procesos — pregunta problematizadora, tesis, esquema, borrador, revisión con rúbrica, versión final.',
        'Análisis de la intención y el tono — ironía, sarcasmo, registro, modalizadores, para no leer literalmente lo que es figurado.',
        'Simulacros Saber con retroalimentación cualitativa — analizar por qué se eligió el distractor y qué competencia falló.'
      ],
      ej: [
        'Anatomía de una columna: con una columna de un columnista colombiano, identificar tesis, argumentos, supuestos que el autor da por sentados y evaluar si convence y por qué.',
        'Caza de falacias: con fragmentos de discursos reales, identificar la falacia (con su nombre) y reescribir el enunciado de forma válida.',
        'Dos voces, un dilema: leer dos textos con posturas opuestas, reconstruir tesis y argumentos de cada uno, identificar el punto de desacuerdo y redactar la propia postura fundamentada.',
        'Caricatura política bajo análisis: ¿qué hecho representa?, ¿qué postura asume?, ¿qué recursos usa?'
      ],
      sig: 'Vincule la lectura crítica con el proyecto de vida, la ciudadanía y los grandes debates del país, de modo que leer críticamente sea herramienta para decidir, votar y participar. El propósito es siempre evaluativo y deliberativo.',
      prob: 'El problema retórico alcanza su forma exigente en el ensayo: construir una tesis sostenible, anticipar objeciones y convencer a una audiencia crítica. No hay lectura crítica sin comprensión literal e inferencial previas: las tres competencias son acumulativas.',
      dif: [
        'Leer literalmente textos que exigen lectura crítica (no captan ironía ni intención) → análisis explícito de marcas de subjetividad, tono y propósito.',
        'No distinguir un argumento sólido de uno falaz → enseñanza explícita de tipos de argumento y catálogo de falacias.',
        'Perderse en los detalles sin construir el sentido global → esquematizar la macroestructura y preguntar por la función de cada parte.',
        'Ensayo sin tesis clara ni contraargumento → ensayo por procesos con rúbricas de solidez argumentativa.'
      ]
    },
    frases: [
      'Active los saberes previos antes de leer y fije un propósito de lectura explícito; nunca entren fríos al texto.',
      'Gradúe sus preguntas en los tres niveles: literal, inferencial y crítico, y lleve al estudiante a leer las líneas, entre líneas y detrás de las líneas.',
      'La escritura es un proceso recursivo: planear, textualizar, revisar y editar, no un acto de un solo intento.',
      'Ataque la fluidez al servicio de la comprensión: lectura repetida, en coro y en parejas.'
    ]
  },
  cn: {
    nombre: 'Ciencias Naturales',
    foco: 'El patrón que articula EBC, DBA y competencias ICFES (uso comprensivo, explicación de fenómenos, indagación) es: indagación + conflicto cognitivo + argumentación con evidencia. Rastree siempre la idea previa del estudiante antes de enseñar.',
    primaria: {
      comp: 'En 3°-5° el eje es "me aproximo al conocimiento como científico natural": observar, preguntar, conjeturar, registrar y comparar, sobre seres vivos, materia y sus cambios, fuerzas, el agua y el sistema solar.',
      estr: [
        'Indagación guiada de baja estructura — el docente plantea una pregunta investigable cercana ("¿qué seres vivos hay en el jardín?") y guía a observar, registrar y concluir.',
        'Predecir–Observar–Explicar (POE) — antes del experimento el niño predice por escrito, luego observa y confronta predicción contra resultado.',
        'Ciclo 5E simple — Enganchar con un fenómeno sorprendente, Explorar, Explicar con palabras propias, Elaborar, Evaluar.',
        'Bitácora de ciencias — el niño dibuja, rotula y escribe sus observaciones a lo largo del tiempo.',
        'Clasificación con criterios propios — dar hojas, semillas o imágenes de animales y pedir que inventen criterios para agruparlos.',
        'Mini-proyectos de aula — cultivar una planta y llevar registro semanal de crecimiento.'
      ],
      ej: [
        'Germinación de fríjol en algodón húmedo midiendo el crecimiento cada día y registrando en tabla (conecta con la agricultura andina).',
        'Separación de mezclas con materiales de cocina: agua con sal evaporada al sol, agua con arena por filtración con tela, limaduras con un imán.',
        'Cuadrante de un metro cuadrado en el patio: contar y dibujar todos los seres vivos hallados (biodiversidad).',
        'Cadena alimentaria con tarjetas de fauna y flora local (café, ratón, serpiente, gavilán) ordenadas según quién come a quién.'
      ],
      sig: 'Indague ideas previas con preguntas abiertas antes del tema ("¿las plantas comen?", "¿el aire pesa?") y ancle lo nuevo a lo que el niño sabe del campo, la cocina o la lluvia. Genere conflicto cognitivo cuando la predicción falle.',
      prob: 'La indagación parte de preguntas investigables sencillas y verificables con materiales del aula ("¿germina más rápido el fríjol con luz o sin luz?"), con una sola variable a la vez, registro en tabla e interpretación con apoyo.',
      dif: [
        'Creen que las plantas se alimentan por la raíz, ignorando la fotosíntesis → experimento de planta a la luz vs. en oscuridad.',
        'Creen que los seres vivos son solo los que se mueven → revisar criterios de vida (nutrición, crecimiento, reproducción).',
        'Confunden estados de la materia ("el vapor no es nada") → condensación visible en una superficie fría.',
        'Creen que un objeto pesado siempre se hunde → plastilina que se hunde en bola y flota en forma de barco.'
      ]
    },
    secundaria: {
      comp: 'En 6°-9° se sofistica la indagación (hipótesis contrastables, control de variables, gráficas) sobre célula, cuerpo humano, herencia, ecosistemas; estructura de la materia, reacciones, energía, fuerzas, electricidad y ondas.',
      estr: [
        'Indagación estructurada y guiada → abierta — escalar de ejecutar un procedimiento dado a formular la propia pregunta.',
        'Modelización científica — construir y revisar modelos del átomo, la célula, el flujo de energía, explicitando que un modelo es provisional y mejorable.',
        'Argumentación con datos (afirmación–evidencia–razonamiento, CER) — toda conclusión anclada en evidencia.',
        'V de Gowin — organizar la práctica conectando la pregunta central, el lado conceptual y el lado metodológico.',
        'ABP con un problema auténtico — la calidad del agua de la quebrada local resuelta aplicando conceptos de varias clases.',
        'POE con fenómenos contraintuitivos — dilatación, presión, reacciones; el conflicto cognitivo motor del cambio conceptual.'
      ],
      ej: [
        'Extracción de ADN de banano o fresa con sal, jabón lavaplatos y alcohol frío (célula y herencia).',
        'Conservación de la masa pesando vinagre y bicarbonato en una bolsa cerrada antes y después de la reacción.',
        'Indicador ácido-base con repollo morado para clasificar sustancias caseras (limón, jabón, gaseosa, bicarbonato).',
        'Péndulo simple con cuerda y tuerca para investigar de qué depende el periodo (longitud, masa, amplitud): control de variables.'
      ],
      sig: 'Detecte el conocimiento previo con un diagnóstico o lluvia de ideas ("el factor que más influye en el aprendizaje es lo que el alumno ya sabe") y construya organizadores previos antes de introducir modelos abstractos como el átomo o la mol.',
      prob: 'El corazón es la pregunta investigable: contrastable, acotada y medible ("¿cómo afecta la temperatura la rapidez de fermentación de la levadura?"), de la que se derivan hipótesis, variables, datos, gráfica e interpretación.',
      dif: [
        'Creen que la energía "se gasta" o "se acaba" en lugar de transformarse → rastrear transformaciones en cadenas energéticas reales.',
        'Confunden calor con temperatura → medir el equilibrio térmico de objetos a distinta temperatura.',
        'Mantienen que un objeto en movimiento requiere fuerza constante → superficies de baja fricción.',
        'Creen que la masa cambia o algo "desaparece" al disolverse → conservación de la masa en sistema cerrado.'
      ]
    },
    media: {
      comp: 'En 10°-11° el manejo se diferencia en procesos biológicos, físicos y químicos, con diseño experimental autónomo, modelización matemática y tratamiento de error. Banda evaluada por Saber 11 en sus tres competencias.',
      estr: [
        'Indagación abierta por proyectos — el estudiante formula pregunta, hipótesis, diseño, análisis y comunica con formato de informe científico.',
        'Controversias sociocientíficas (CSC/CTSA) — investigar, argumentar y tomar postura sobre dilemas reales (fracking, transgénicos, minería en páramos, vacunación).',
        'Modelización matemática de fenómenos — ajustar datos experimentales a una función y predecir.',
        'Análisis crítico de artículos y noticias científicas — distinguir evidencia de opinión.',
        'Prácticas cuantitativas con tratamiento de error e incertidumbre — distinguir lo que la evidencia permite concluir de lo que no.',
        'Preparación Saber 11 por competencias — trabajar preguntas liberadas por competencia (uso comprensivo, explicación, indagación), no solo por contenido.'
      ],
      ej: [
        'Cinética química: medir el tiempo de reacción de antiácido efervescente a distintas temperaturas y graficar rapidez vs. temperatura.',
        'Caída libre filmando con un celular la caída de un objeto y midiendo posición por cuadros para obtener la aceleración.',
        'Estudio de la calidad del aire o del agua de la región con datos públicos, interpretación estadística y propuesta argumentada de mitigación (CSC).',
        'Modelo de selección natural con fichas de colores sobre fondos de colores, graficando el cambio de frecuencias.'
      ],
      sig: 'Conecte conceptos nuevos (mol, equilibrio, energía libre) con anclajes sólidos y reorganice la red conceptual (diferenciación progresiva y reconciliación integradora). Confronte explícitamente las concepciones alternativas persistentes.',
      prob: 'La indagación llega a su forma plena: pregunta rigurosa, hipótesis operacionalizada, datos cuantitativos con instrumentos, análisis con tratamiento de error e interpretación que distingue lo concluible de lo no concluible. Saber 11 exige transferencia a situaciones nuevas, no memorización.',
      dif: [
        'Visión sustancialista de la materia; creen que en una disolución la sustancia "desaparece" → modelización corpuscular explícita y sistemas cerrados.',
        'Conservan que fuerza implica movimiento y confunden masa con peso → video-análisis y experimentos de baja fricción.',
        'Creen que la evolución es progreso dirigido o responde a la necesidad → simulaciones de selección natural con datos.',
        'Confunden correlación con causalidad y no consideran el error → enseñar lectura crítica de gráficas y alcance de las conclusiones (lo que evalúa indagación en Saber 11).'
      ]
    },
    frases: [
      'Diagnostique las concepciones alternativas antes de planear la unidad y rastree la idea previa del estudiante.',
      'Formule una pregunta investigable contrastable y acotada, y opere las variables: cuál manipula, cuál mide y cuáles controla.',
      'Exija que toda conclusión esté anclada en evidencia, con el esquema afirmación–evidencia–razonamiento.',
      'Promueva el conflicto cognitivo cuando la intuición contradiga la evidencia.'
    ]
  },
  sc: {
    nombre: 'Ciencias Sociales y Ciudadanas',
    foco: 'Articule los tres ejes (histórico-cultural, espacial-ambiental, ético-político) en torno a problemas reales del contexto colombiano, y las competencias ICFES (pensamiento social, interpretación de perspectivas, pensamiento reflexivo y sistémico). La ciudadanía se aprende practicándola, no memorizándola.',
    primaria: {
      comp: 'En 3°-5° se parte de lo cercano (familia, barrio, municipio) hacia el departamento y el país: noción de tiempo, diversidad étnica y cultural, lectura inicial de mapas, derechos del niño y normas.',
      estr: [
        'Línea de tiempo personal y comunitaria — cada niño construye su línea de vida y luego la de la escuela o el barrio con entrevistas a abuelos; combate el presentismo.',
        'Lectura guiada de mapas y planos — empezar por el plano del salón y la escuela, trabajar leyenda y rosa de los vientos; leer el mapa, no calcarlo.',
        'Cartografía social infantil — dibujar el mapa del barrio marcando lo que aman, lo que temen y lo que quieren cambiar.',
        'Análisis de fuentes sencillas — fotografías antiguas vs. actuales, objetos familiares, testimonios; la idea de "evidencia del pasado".',
        'Asamblea de aula y construcción de normas — los estudiantes deliberan y acuerdan las reglas; práctica real de participación.',
        'Juego de roles y dramatización — representar oficios, autoridades o un conflicto para resolverlo; desarrolla toma de perspectiva.'
      ],
      ej: [
        '"Mi barrio cuenta su historia": entrevistar a un adulto mayor sobre cómo era el barrio hace 30 años y construir un mural de "antes y ahora".',
        '"El mapa de los tesoros y los peligros": cartografía del entorno escolar y carta al personero proponiendo una mejora.',
        '"La asamblea del aula": ante un conflicto real (uso de la cancha), montar una asamblea con turnos, propuestas y un acuerdo escrito.',
        '"Colombia es muchas Colombias": con fotos de regiones, reconocer la diversidad y rechazar estereotipos.'
      ],
      sig: 'Parta siempre del entorno inmediato y de los saberes del niño (su familia, su comida, su barrio) como anclaje. El niño debe percibirse como agente que puede transformar su entorno cercano.',
      prob: 'Trabaje problemas concretos y abordables a su escala (la basura del patio, el conflicto del recreo) con el ciclo observar → preguntar → indagar → proponer → actuar.',
      dif: [
        'Presentismo y noción de tiempo difusa → líneas de tiempo físicas y manipulables, uso de generaciones (yo–papá–abuelo).',
        'Lee el mapa como dibujo (no entiende escala ni símbolos) → empezar por planos del entorno real recorrido con el cuerpo.',
        'Egocentrismo / dificultad de toma de perspectiva → juego de roles, "¿cómo se sintió el otro?".',
        'Memorización mecánica de símbolos y fechas patrias → convertir cada efeméride en una pregunta-problema.'
      ]
    },
    secundaria: {
      comp: 'En 6°-9° se pasa de lo local a lo mundial y de describir a explicar: procesos históricos (Conquista, Colonia, Independencia, siglo XX), geografía humana, Constitución de 1991, conflicto armado y mecanismos de participación.',
      estr: [
        'Análisis de fuentes primarias y secundarias con preguntas-guía — preguntar a la fuente: ¿quién la produjo?, ¿para qué?, ¿qué intereses defiende?, ¿qué calla?',
        'Multiperspectividad ("voces del pasado") — estudiar un mismo hecho desde varios actores; combate la versión única.',
        'Líneas de tiempo de causalidad — relaciones causa-consecuencia y simultaneidad, no solo cronología.',
        'Debate y deliberación reglada — posturas asignadas, argumentación con evidencia, turnos y refutación.',
        'Dilemas morales — situaciones sin solución obvia discutidas para desarrollar razonamiento ético-político.',
        'Cartografía social del territorio — mapear el municipio identificando conflictos socioambientales, actores y propuestas.'
      ],
      ej: [
        '"La Conquista en cuatro voces": cuatro grupos narran el "descubrimiento" desde Colón, un cacique muisca, un cronista y un africano esclavizado, y se confrontan.',
        '"Memoria de mi municipio": historia oral entrevistando a tres adultos sobre cómo un hecho social marcó la región, contrastada con fuentes (Cátedra de la Paz).',
        '"¿Qué dicen los datos?": con una pirámide poblacional o un mapa de pobreza, formular hipótesis sobre por qué el territorio se ve así.',
        '"Dilema en el aula": presentar un dilema moral situado y conducir una discusión sin imponer la respuesta correcta.'
      ],
      sig: 'Conecte la experiencia del estudiante y su comunidad con procesos estructurales (el desplazamiento de una familia con el conflicto nacional). Trabaje cuestiones socialmente vivas: temas controvertidos y abiertos que exigen tomar postura argumentada.',
      prob: 'Escale hacia el pensamiento sistémico: ver un problema social como red de causas, actores y consecuencias, y evaluar decisiones por sus efectos en distintos actores y plazos.',
      dif: [
        'Presentismo (juzgar el pasado con valores del presente) → empatía histórica; contextualizar mentalidades de época con fuentes.',
        'Versión única/maniquea (buenos vs. malos) → ejercicios de multiperspectividad; pedir que defiendan la postura contraria.',
        'Lectura superficial de mapas y datos → rutina de describir, relacionar e inferir con gráficos reales.',
        'Monocausalidad → diagramas de causalidad múltiple (estructurales, coyunturales, detonantes).'
      ]
    },
    media: {
      comp: 'En 10°-11° se exige pensamiento crítico autónomo y análisis de sistemas complejos (economía política, geopolítica, Constitución en profundidad, DDHH, proceso de paz), con dominio pleno de las tres competencias ICFES.',
      estr: [
        'Análisis crítico de fuentes y discursos — detectar sesgos, falacias, intereses y framing en prensa, propaganda y redes.',
        'Deliberación y debate académico formal sobre cuestiones socialmente vivas — con investigación previa, evidencia y réplica estructurada.',
        'Estudios de caso complejos — una política pública, un fallo de la Corte Constitucional, un conflicto socioambiental real con marco teórico.',
        'Mapas conceptuales y modelos sistémicos — representar un problema social como sistema de variables, actores y retroalimentaciones.',
        'Aprendizaje-servicio — articular contenido con un servicio real a la comunidad y reflexión sistemática.',
        'Producción argumentativa (ensayo y columna) — tesis, evidencia y contraargumentación sobre una cuestión socialmente viva.'
      ],
      ej: [
        '"El laboratorio de la paz": estudiar el Acuerdo de 2016 y la justicia transicional desde múltiples actores y debatir sobre verdad, justicia y reconciliación.',
        '"Simulacro de la Corte Constitucional": ante un caso real de tutela, asumir roles de magistrados y argumentar un fallo con base en la Constitución.',
        '"Análisis de un discurso político": con dos discursos opuestos, identificar tesis, evidencia, falacias e intereses, y evaluar cuál argumenta mejor.',
        '"¿Desarrollo para quién?": estudiar un conflicto socioambiental modelando actores, beneficios, costos y afectados, y proponer una decisión de política pública.'
      ],
      sig: 'Conecte la biografía y el contexto del joven con su proyecto de vida y su rol ciudadano (su voto, su participación, el posconflicto). Las cuestiones socialmente vivas son el corazón: no buscar la respuesta correcta sino deliberar con evidencia y respeto a la pluralidad.',
      prob: 'Alcance el pensamiento sistémico pleno: modelar problemas complejos, anticipar consecuencias de segundo orden, sopesar dilemas de valor y producir decisiones argumentadas y éticamente fundadas.',
      dif: [
        'Opinión sin evidencia (replican posturas de redes) → exigir tesis + evidencia + contraargumento; análisis de falacias.',
        'Dificultad para la abstracción sistémica (ven hechos sueltos) → modelos conceptuales y diagramas de variables.',
        'Multiperspectividad débil bajo presión emocional (vuelven al maniqueísmo) → principio de caridad: reconstruir la mejor versión del argumento contrario antes de refutarlo.',
        'Confunden legalidad con legitimidad/justicia → dilemas de justicia transicional y ética pública.'
      ]
    },
    frases: [
      'Convirtamos el contenido en una pregunta-problema socialmente relevante, no en un tema para transmitir.',
      'Enseñemos a interrogar la fuente: quién la produjo, con qué intención, qué intereses defiende y qué silencia.',
      'Trabajemos la multiperspectividad y combatamos el presentismo desarrollando empatía histórica.',
      'Promovamos el pensamiento sistémico: el problema social como red de actores, causas y consecuencias interdependientes.'
    ]
  },
  in: {
    nombre: 'Inglés',
    foco: 'Enfoque comunicativo y aprendizaje basado en tareas: que el estudiante use el inglés para lograr algo real. Ofrezca input comprensible (i+1 de Krashen), baje el filtro afectivo y ancle todo en el MCER (meta B1 de salida) y en las partes de Saber 11.',
    primaria: {
      comp: 'En 3°-5° (meta MCER A1) el estudiante comprende instrucciones del aula, reconoce vocabulario familiar (colores, números, familia), se presenta con frases memorizadas y responde preguntas básicas (What\'s your name?).',
      estr: [
        'Total Physical Response (TPR) — dar órdenes en inglés (Stand up, touch your nose) a las que los niños responden con movimiento antes de exigir habla; respeta el periodo silencioso.',
        'Classroom language como rutina — un repertorio fijo en inglés (Good morning; open your books; well done) que vuelve el aula fuente constante de input.',
        'Canciones y chants con gestos — melodías repetitivas (Head, shoulders, knees and toes) fijan pronunciación, ritmo y léxico.',
        'Flashcards y realia — tarjetas con imágenes y objetos reales por asociación directa imagen-palabra, evitando la traducción.',
        'Storytelling con apoyo visual — cuentos cortos, predecibles y repetitivos con láminas, voz y gestos.',
        'Juegos comunicativos simples — Simon Says, Bingo de vocabulario, memoria de pares; bajan el filtro afectivo y multiplican repeticiones.'
      ],
      ej: [
        '"Simon Says" de partes del cuerpo (sin "Simon says" no se obedece): listening y vocabulario sin material.',
        'Rutina diaria de calendario y clima: "What day is it today? What\'s the weather like?" — "It\'s Monday. It\'s sunny."',
        'Monólogo de 4 frases "My favorite…": "My name is Ana. I am ten. My favorite color is blue. I like dogs."',
        'Information gap de colores: A describe ("The house is red") y B colorea según lo que oye; comunicación con propósito.'
      ],
      sig: 'Ancle la lengua a la experiencia inmediata y afectiva del niño (su familia, sus mascotas, su comida) y ofrezca input comprensible i+1 apoyado en gestos e imágenes. Que el niño use el inglés para hacer algo, no solo para repetir.',
      prob: 'Micro-tareas con propósito real: encuestar a tres compañeros sobre su comida favorita y reportar, o clasificar tarjetas ("put the animals that fly here").',
      dif: [
        'Baja exposición fuera del aula → maximizar el classroom language y rutinas diarias en inglés.',
        'Tendencia a traducir todo → enseñar con realia e imágenes y usar gestos en vez de traducir.',
        'Timidez al hablar → priorizar respuestas no verbales (TPR), trabajo en coro y en parejas, celebrar el intento.',
        'Vocabulario que no se retiene → recirculación sistemática del léxico en juegos y canciones (repetición espaciada).'
      ]
    },
    secundaria: {
      comp: 'En 6°-9° (meta A2) comprende mensajes y textos cortos cotidianos, escribe notas y descripciones enlazadas, y se desenvuelve en intercambios sociales breves (pedir direcciones, comprar). Aquí se construye el grueso del uso del lenguaje de Saber 11.',
      estr: [
        'Enfoque comunicativo (CLT) — seleccionar primero las funciones (pedir información, invitar, describir) y luego las estructuras que las realizan; la gramática al servicio de la comunicación.',
        'Aprendizaje basado en tareas (TBL) — organizar la clase en torno a una tarea con resultado comunicativo (planear un viaje, hacer una encuesta) con ciclo pre-task, task y post-task.',
        'Role-plays y diálogos funcionales — dramatizar situaciones reales (en la tienda, pidiendo direcciones) con tarjetas de rol.',
        'Scaffolding del input y del output — modelos, sentence starters y bancos de palabras antes de exigir producción; retirar el apoyo gradualmente.',
        'Lectura graduada y extensiva — textos adaptados al nivel leídos por cantidad y placer; construyen vocabulario y fluidez.',
        'Information gap — cada estudiante posee parte de la información y deben hablar en inglés para completar la tarea.'
      ],
      ej: [
        'Role-play "At the store": "How much is this T-shirt? — It\'s 20,000 pesos. — Can I try it on?" (lengua transaccional).',
        'Encuesta de rutinas: preguntar a tres compañeros "What time do you get up?" y reportar "Carlos gets up at six" (presente simple, 3ª persona).',
        'Tarea TBL "Plan a weekend trip" a un pueblo de Nariño (destino, transporte, presupuesto) y presentarlo en inglés.',
        'Running dictation: en parejas, uno corre, lee y memoriza una frase del muro y la dicta al compañero que la escribe (integra las cuatro habilidades).'
      ],
      sig: 'Conecte la lengua con los intereses adolescentes y el contexto local (música, deportes, su región). Combine input comprensible (i+1) con output significativo (Swain): producir lengua para comunicar algo que importa.',
      prob: 'Tareas comunicativas auténticas: problem-solving en grupo, information gap y proyectos pequeños (un folleto turístico de su municipio, un video de presentación).',
      dif: [
        'Ansiedad lingüística y miedo a hablar → clima seguro, corrección diferida, trabajo previo en parejas, valorar el mensaje sobre la forma.',
        'Interferencia del español y falsos cognados (library no es librería, actually no es actualmente) → enseñarlos explícitamente y trabajar el vocabulario en contexto.',
        'Comprensión auditiva débil → listening graduado con pre-listening y tareas de escucha enfocada.',
        'Gramática descontextualizada que no transfiere → enseñar la forma dentro de la función comunicativa (focus on form).'
      ]
    },
    media: {
      comp: 'En 10°-11° (meta B1) comprende ideas principales de discursos y textos cotidianos, argumenta de forma básica y sostiene opiniones. Banda decisiva para Saber 11 (7 partes; mayor peso en uso del lenguaje, Partes 4 y 7).',
      estr: [
        'Enfoque comunicativo avanzado — equilibrar fluidez (debates) con foco en la forma (focus on form) para pulir precisión sin sacrificar comunicación.',
        'Aprendizaje basado en proyectos — un podcast, un blog, una campaña o un debate formal que integran las cuatro habilidades.',
        'Lectura intensiva estratégica — skimming (idea global), scanning (datos específicos) e inferencia de la intención del autor, alineados a las Partes 5 y 6 de Saber 11.',
        'Escritura por procesos con géneros argumentativos — cartas formales y ensayos cortos con tesis, razones y conectores (however, therefore, in conclusion).',
        'Entrenamiento estratégico para Saber 11 integrado al uso real — collocations, conectores, falsos cognados y pistas de contexto dentro de tareas comunicativas, no test prep mecánico.',
        'Input auténtico — noticias, canciones, videos y entrevistas reales con tareas de comprensión.'
      ],
      ej: [
        'Debate "Should school uniforms be mandatory?": cada lado prepara tres argumentos con conectores ("First, uniforms reduce inequality because…").',
        'Entrenamiento de scanning: "You have 60 seconds to find the date, the price and who the text is for" (lectura rápida tipo ICFES).',
        'Proyecto "My region in English": folleto o video promocionando un lugar de Nariño para turistas, con descripción y recomendaciones.',
        'Mini-simulacro de uso del lenguaje (Parte 4/7): completar un párrafo eligiendo la palabra correcta por gramática y sentido, y discutir en parejas por qué.'
      ],
      sig: 'Que el estudiante use el inglés para pensar, opinar y resolver problemas que le importan (su futuro, su comunidad, temas globales). La preparación para Saber 11 no es memorización mecánica sino transferencia de competencias comunicativas reales.',
      prob: 'Tareas de decisión y proyectos auténticos: distribuir un presupuesto, resolver un dilema ético, planear un proyecto comunitario; el inglés como vehículo de pensamiento crítico.',
      dif: [
        'Fosilización de errores → retroalimentación correctiva focalizada (recast) y autocorrección con rúbricas.',
        'Ansiedad en la producción oral espontánea → ensayo previo, grabaciones privadas, debates con roles asignados.',
        'Vocabulario insuficiente para B1 (collocations, conectores) → enseñanza de bloques léxicos y lectura extensiva sostenida.',
        'Comprensión inferencial débil → enseñar estrategias de inferencia modelando el razonamiento en voz alta (think-aloud).'
      ]
    },
    frases: [
      'Ofrezca input comprensible un paso por encima del nivel actual (i+1 de Krashen), apoyado en imágenes, gestos y contexto.',
      'Diseñe la clase en torno a una tarea comunicativa con propósito real: que el estudiante use el inglés para lograr algo.',
      'Baje el filtro afectivo creando un clima seguro donde el error sea parte natural del aprendizaje.',
      'Trabaje el vocabulario en bloques léxicos (collocations), no en palabras aisladas, y recírculelo de forma sistemática.'
    ]
  }
};

// ── CAPA TRANSVERSAL: marcos pedagógicos, evaluación formativa y PTA/FI ───────────────────
const TRANSVERSAL = {
  significativo: 'Aprendizaje significativo (Ausubel): el conocimiento nuevo se ancla en lo que el estudiante ya sabe (los subsunsores). Pasos para el aula: 1) sondee el anclaje con 2-3 preguntas o una rutina "¿qué sé de esto?" (el diagnóstico por niveles ES esa radiografía); 2) presente un organizador previo (una analogía, un esquema, una pregunta movilizadora); 3) construya el puente cognitivo explícito ("esto se relaciona con lo que ya saben de…"); 4) diferencie progresivamente, de lo general a lo particular; 5) reconcilie integrando con un mapa conceptual o cuadro comparativo; 6) asegure material significativo: ejemplos del contexto y textos al nivel real del lector.',
  polya: 'Resolución de problemas (Polya, 4 fases): 1) Comprender (¿qué se busca?, ¿cuáles son los datos?; reformular, dibujar); 2) Concebir un plan (¿problema parecido?, caso más simple, buscar un patrón, trabajar hacia atrás, hacer una tabla); 3) Ejecutar verificando cada paso; 4) Mirar hacia atrás (¿es razonable?, ¿se comprueba de otro modo?, ¿sirve para otros problemas?) — la fase más descuidada y la que consolida el aprendizaje transferible. Una buena situación-problema parte de un contexto real, admite varias vías, exige varias competencias y tiene un reto ajustado a la zona de desarrollo próximo.',
  abp: 'Aprendizaje basado en problemas/proyectos (ABP): invierte la secuencia tradicional — primero el problema auténtico, después el contenido necesario para resolverlo. Pasos: presentar la situación-problema → los estudiantes activan lo que saben y detectan lo que necesitan → investigan al servicio del problema → construyen una solución o producto → la socializan y reciben retroalimentación → reflexionan. El docente facilita, no expone solo.',
  retro: 'Evaluación formativa y retroalimentación efectiva: evaluar PARA aprender (regular), no solo calificar. La retroalimentación responde tres preguntas (Wiliam): ¿a dónde voy? (metas claras), ¿dónde estoy? (evidencia de la brecha) y ¿cómo cierro la brecha? (el paso siguiente concreto). De alto impacto cuando es oportuna/inmediata, específica (apunta a la evidencia concreta), descriptiva, accionable y centrada en la tarea o el proceso, no en la persona ("eres inteligente" es el feedback menos eficaz). Use rúbricas compartidas antes de la tarea, autoevaluación y coevaluación.',
  plan: 'Del diagnóstico al plan de mejora: 1) lea los resultados como oportunidades (las afirmaciones/evidencias con más estudiantes en BAJO/BÁSICO); 2) priorice 2-3 focos de alto impacto, no todo a la vez; 3) defina metas claras y observables por foco; 4) asigne estrategias didácticas específicas, diferenciadas por nivel; 5) establezca seguimiento (mini-quiz, ticket de salida, registro de fluidez, re-aplicar el cuadernillo); 6) retroalimente inmediato y específico y reajuste. Estructura reutilizable: Oportunidad → Meta → Estrategia → Recurso/diferenciación → Indicador y fecha de seguimiento. En IDEA, "Autocompletar con Sabio IA" arma este plan desde el grupo real.',
  dua: 'Diferenciación y DUA (CAST): diseñe desde el inicio para todos con múltiples formas de REPRESENTACIÓN (varios formatos del contenido), de ACCIÓN Y EXPRESIÓN (varias maneras de demostrar lo aprendido) y de IMPLICACIÓN (enganchar la motivación). Por nivel del diagnóstico: en BAJO, retroceda al subsunsor faltante, material concreto, textos a su nivel, andamiaje fuerte y metas cortas (no es "lo mismo más despacio", es reconstruir el anclaje); en BÁSICO, consolide con práctica variada y retire andamiaje; en ALTO/SUPERIOR, profundice y extienda (problemas abiertos, retos de evaluar y crear, rol de tutor-par), no más cantidad de lo mismo.',
  andamiaje: 'Andamiaje (Vygotsky/ZDP) y taxonomía de Bloom: enseñe en la zona de desarrollo próximo (lo que el estudiante logra con ayuda), con apoyo temporal que se retira al ganar competencia — modelar (el docente piensa en voz alta) → guiar juntos → práctica con pistas → práctica autónoma (fading planeado). Gradúe la demanda cognitiva por Bloom: recordar → comprender → aplicar → analizar → evaluar → crear. Para el grupo en BAJO ancle en recordar/comprender con andamiaje fuerte; para ALTO/SUPERIOR diseñe en analizar/evaluar/crear con andamiaje mínimo.',
  genericas: 'Estrategias didácticas genéricas (sirven en cualquier área): rutinas de pensamiento (Veo-Pienso-Me pregunto), ticket de salida, Think-Pair-Share, aula invertida, gamificación, aprendizaje cooperativo estructurado, modelado metacognitivo (pensar en voz alta), preguntas socráticas, organizadores gráficos, el error como recurso, lectura en voz alta dosificada, lectura repetida, tutoría entre pares, enseñanza recíproca, ABP, estudio de casos, estaciones de aprendizaje, ejemplos resueltos, método Concreto-Pictórico-Abstracto, práctica espaciada y entrelazada, práctica de recuperación, KWL, semáforo de autoevaluación, gallery walk, rompecabezas (jigsaw), diarios de aprendizaje, rúbricas compartidas, preguntas de alto nivel cognitivo, nivelación de textos al lector y "explicar para aprender".',
  pta_lectura: 'Cerrar el déficit de LECTURA (hallazgo PTA/FI con EGRA: el déficit está en la lectura de palabras y la comprensión, no en la fonética): 1) más lectura oral individual dosificada — que CADA estudiante lea en voz alta a diario en tramos breves (lectura repetida, en pareja, coral, "1 minuto de lectura"); 2) retroalimentación inmediata y específica sobre el error concreto ("dijiste casa donde dice caza"), no diferida ni genérica; 3) nivele el texto al lector real, no al grado nominal, subiendo la complejidad de forma graduada; 4) tutoría integrada y sistemática (rutina permanente, no eventos esporádicos); 5) monitoree la fluidez (palabras correctas por minuto y comprensión) y muestre el progreso al estudiante; 6) enseñe la comprensión explícitamente (predecir, preguntar, aclarar, resumir; inferencias guiadas; vocabulario en contexto).',
  pta_mate: 'Cerrar el déficit de MATEMÁTICAS (hallazgo PTA/FI con EGMA: el déficit está en números faltantes y resolución de problemas, no en el cálculo de sumas y restas): 1) sentido numérico — relaciones parte-todo, valor posicional, magnitud relativa, estimación y cálculo mental, composición/descomposición; 2) patrones y números faltantes — secuencias, completar el término faltante, descubrir la regla (conecta con álgebra temprana); 3) resolución de problemas tipo Polya explícita (las 4 fases), priorizando problemas con contexto sobre ejercicios mecánicos y modelando el razonamiento en voz alta; 4) método Concreto-Pictórico-Abstracto, especialmente con estudiantes en BAJO; 5) retroalimentación inmediata y monitoreo del progreso también en matemáticas.'
};

// ── CAPA DE ACOMPAÑAMIENTO: guiar al docente que no sabe qué pedir ────────────────────────
export const PRESENTACION_SABIO = 'Hola, soy Sabio, tu acompañante pedagógico. Te ayudo a convertir los resultados de la evaluación diagnóstica en mejores clases, sin tecnicismos y sin que lo hagas solo. Puedo darte estrategias didácticas por área y grado, ejemplos listos para el aula, organizadores previos y situaciones-problema, enseñarte a trabajar el aprendizaje significativo y la resolución de problemas paso a paso, y diseñar planes de mejora desde tu diagnóstico (tomo las afirmaciones donde tu grupo quedó bajo y te propongo metas, estrategias y seguimiento). No necesitas saber cómo se llama lo que buscas: cuéntame qué área enseñas, en qué grado y qué te preocupa de tu grupo (por ejemplo "no entienden los problemas de matemáticas" o "leen pero no comprenden") y yo lo traduzco en acciones concretas. Si no sabes por dónde empezar, dime "no sé qué pedir" y te muestro opciones.';

export const PETICIONES_EJEMPLO = [
  'Dame estrategias para enseñar fracciones en 5°',
  '¿Cómo mejoro la comprensión lectora de mi grupo de 7°?',
  'Propón un plan de mejora para los que quedaron en nivel bajo',
  'Tengo el grupo disparejo: ¿qué hago con los rezagados y los avanzados?',
  'Explícame el método de Polya para un problema de 6°',
  'Necesito una situación-problema de ciencias para trabajar por proyectos',
  '¿Cómo doy retroalimentación que de verdad sirva?',
  'Dame un organizador previo para empezar el tema de la célula',
  '¿Qué actividades suben la fluidez lectora leyendo en voz alta?',
  'Mis estudiantes resuelven sumas pero no entienden los problemas, ¿qué hago?',
  'Dame estrategias de inglés para 10° con miras a Saber 11',
  '¿Cómo trabajo números faltantes y patrones en 3°?'
];

/**
 * Peticiones-ejemplo PERSONALIZADAS por rol y, para el docente, por área y grado actuales.
 * @param {string} rol  estudiante | docente | directivo | funcionario | manager
 * @param {{area?:string, grado?:number|string}} ctx  contexto del docente (materia y grado en pantalla)
 */
export function peticionesPara(rol, ctx = {}) {
  const r = (rol || '').toLowerCase();
  if (r === 'estudiante') return [
    '¿Qué significa mi nivel (bajo, básico, alto, superior)?',
    '¿En qué áreas debo mejorar?',
    'Dame consejos para estudiar mejor',
    '¿Cómo me preparo para la prueba Saber 11?',
    '¿Cómo presento la prueba?',
    '¿Qué es la proyección a Saber 11?'
  ];
  if (r === 'directivo' || r === 'funcionario') return [
    '¿Cómo leo el consolidado institucional?',
    '¿Qué significan los niveles y el semáforo?',
    '¿Cómo comparo grupos y materias?',
    '¿Cómo priorizo la mejora a nivel institucional?',
    '¿Cómo acompaño a los docentes desde los resultados?',
    '¿Qué es la proyección a Saber 11?'
  ];
  if (r === 'manager') return [
    '¿Cómo asigno docentes a grupos?',
    '¿Cómo gestiono reintentos?',
    '¿Cómo reinicio los datos de demostración?',
    '¿Cómo funciona el panel del manager?'
  ];
  if (r === 'docente') {
    const ak = ctx && ctx.area ? detectarArea(_n(String(ctx.area))) : null;
    const g = ctx && ctx.grado ? parseInt(ctx.grado, 10) : null;
    if (ak && g) {
      const nom = AREAS[ak].nombre;
      // Habilidad nuclear PROPIA de cada área (no "resolución de problemas" para todas:
      // eso es de Matemáticas; Lectura Crítica trabaja comprensión, etc.).
      const HABILIDAD_NUCLEAR = {
        mat: 'la resolución de problemas',
        lc: 'la comprensión e interpretación de textos',
        sc: 'el análisis de fuentes y el pensamiento social',
        cn: 'la indagación y la explicación científica',
        in: 'la comprensión de lectura en inglés'
      };
      const hab = HABILIDAD_NUCLEAR[ak] || 'las competencias del área';
      return [
        `Dame estrategias para enseñar ${nom} en ${g}°`,
        `Ejemplos para el aula de ${nom} en ${g}°`,
        `¿Cómo fortalezco ${hab} en ${g}°?`,
        `Dificultades comunes en ${nom} de ${g}° y cómo remediarlas`,
        `Un organizador previo para ${nom} en ${g}°`,
        'Propón un plan de mejora para los de nivel bajo'
      ];
    }
    return [
      'Dame estrategias para mi área y grado',
      '¿Cómo interpreto el radar y las barras?',
      'Propón un plan de mejora para los de nivel bajo',
      '¿Cómo doy retroalimentación que de verdad sirva?',
      '¿Qué hago con los rezagados y los avanzados?',
      'No sé qué pedir'
    ];
  }
  return PETICIONES_EJEMPLO.slice(0, 6);
}

// ── RECUPERACIÓN: arma una respuesta experta según área + grado + intención ───────────────
function nombreBanda(b) { return b === 'primaria' ? 'primaria (3°-5°)' : b === 'secundaria' ? 'secundaria (6°-9°)' : 'media (10°-11°)'; }

/**
 * Devuelve estrategias y ejemplos de un área y grado, para enriquecer el plan de mejora.
 * @returns {{area:string, banda:string, estrategias:string[], ejemplos:string[], significativo:string, dificultades:string[]}|null}
 */
export function estrategiasPedagogicas(areaKey, grado, opts = {}) {
  const a = AREAS[areaKey]; if (!a) return null;
  const g = parseInt(grado, 10);
  // Banda por grado de escolaridad; grado ausente/fuera de rango => sin enriquecimiento
  // (NO colapsar silenciosamente a "media").
  const banda = (g >= 3 && g <= 5) ? 'primaria' : (g >= 6 && g <= 9) ? 'secundaria' : (g >= 10 && g <= 11) ? 'media' : null;
  if (!banda) return null;
  const b = a[banda];
  // Capa POR GRADO (aditiva): si hay celda sabio_conocimiento para este grado, sus campos
  // presentes ganan sobre los de la banda; los ausentes heredan del fallback por banda.
  const slug = _AREAKEY_A_SLUG[areaKey];
  let sc = null;
  if (slug) { try { sc = pedagogiaDeSync(slug, grado, 'sabio_conocimiento'); } catch { sc = null; } }
  if (sc && typeof sc === 'object') {
    return {
      area: a.nombre, banda: nombreBanda(banda),
      estrategias: (sc.estr && sc.estr.length) ? sc.estr : b.estr,
      ejemplos: (sc.ej && sc.ej.length) ? sc.ej : b.ej,
      significativo: sc.sig || b.sig,
      problemas: sc.prob || b.prob,
      dificultades: (sc.dif && sc.dif.length) ? sc.dif : b.dif,
      frases: (sc.frases && sc.frases.length) ? sc.frases : a.frases
    };
  }
  // FALLBACK: contenido por banda (intacto).
  return { area: a.nombre, banda: nombreBanda(banda), estrategias: b.estr, ejemplos: b.ej, significativo: b.sig, problemas: b.prob, dificultades: b.dif, frases: a.frases };
}

/**
 * Responde una petición pedagógica del docente. Devuelve { texto } si tiene una respuesta
 * experta pertinente, o null si la pregunta no es de este dominio (para que el chat siga con
 * su base general de uso de la plataforma).
 */
export function responderPedagogia(pregunta, ctx) {
  const qn = _n(pregunta);

  // Guía al docente que no sabe qué pedir.
  if (/no se que pedir|no se que preguntar|que puedes hacer|en que me ayudas|que sabes hacer|ayudame a empezar|por donde empiezo|opciones|ejemplos de preguntas/.test(qn)) {
    return { texto: PRESENTACION_SABIO + '\n\nAlgunas cosas que puedes pedirme:\n• ' + PETICIONES_EJEMPLO.slice(0, 8).join('\n• ') };
  }

  // Estudiante: en qué debo mejorar.
  if (/en que (areas?|competencias?|temas?)? ?(debo|puedo|tengo que) mejorar|como mejoro mis|mejorar mis resultados|en que estoy (bajo|mal|flojo|fallando)|que debo reforzar/.test(qn)) {
    return { texto: 'Revisa tu reporte: las áreas y competencias con menor porcentaje y con nivel BAJO o BÁSICO son las que más conviene reforzar. Empieza por la más baja, porque subir lo que está flojo es lo que más mejora tu resultado global. Repasa esos temas, practica con ejercicios y problemas (no solo teoría), y pídele a tu docente material o una tutoría sobre ese punto. Avanzar un poco cada semana rinde más que estudiar todo de un solo golpe.' };
  }

  // Consejos de estudio (orientados al estudiante).
  if (/consejos para estudiar|como estudio|tips de estudio|como aprendo mejor|tecnicas de estudio|estudiar mejor|como me preparo|preparo para (la prueba|saber)/.test(qn)) {
    return { texto: 'Consejos para estudiar mejor: 1) repasa recordando sin mirar (hazte preguntas y respóndelas de memoria) en vez de solo releer; 2) distribuye el estudio en sesiones cortas a lo largo de la semana, no todo la víspera; 3) explícale el tema a alguien o en voz alta: si puedes explicarlo, lo entendiste; 4) practica con ejercicios y problemas, no solo teoría; 5) conecta lo nuevo con lo que ya sabes y con ejemplos de tu vida; 6) descansa y duerme bien antes de la prueba. La constancia diaria rinde mucho más que la víspera.' };
  }

  const intencion = {
    estrategias: /estrategia|como ense[nñ]|como trabaj|metodolog|didactic|como abord|como ense/.test(qn),
    ejemplos: /ejemplo|actividad|actividades|que actividad|para el aula|consigna|experimento|dinamica|llevar al aula/.test(qn),
    significativo: /significativ|ausubel|saberes previos|conocimientos previos|organizador previo|puente cognitiv|anclar|motiv|sentido/.test(qn),
    problemas: /resolucion de problema|resolver problema|polya|situacion problema|abp|por proyecto|basado en problema|no entienden los problema|razonar/.test(qn),
    dificultades: /dificultad|dificultades|error|errores|concepcion|se equivoca|les cuesta|no entienden|no comprenden|fallan|debilidad/.test(qn),
    retro: /retroalimentacion|feedback|evaluacion formativa|evaluar para|como evaluo|rubrica|coevaluacion|autoevaluacion/.test(qn),
    plan: /plan de mejora|plan de aula|que hago con (el|los|mi)|como mejoro|nivelar|que sigue|como intervengo/.test(qn),
    diferenciar: /rezagad|avanzad|disparej|diferenciar|diferenciacion|dua|atender a todos|nivel bajo|los que quedaron|los buenos|los que van adelante|inclusion/.test(qn),
    bloom: /bloom|andamiaje|zona de desarrollo|demanda cognitiv|retar|preguntas de alto nivel/.test(qn),
    fluidez: /fluidez|lectura en voz alta|leen pero no comprenden|comprension lectora|lectura de palabras|leer rapido|velocidad lectora/.test(qn),
    numeros: /numeros faltantes|sentido numerico|patrones|resuelven sumas pero|no entienden los problemas de mate/.test(qn)
  };

  // Si la pregunta no menciona área/grado, usar el CONTEXTO de la plataforma (grupo abierto:
  // window.SABIO_CTX = {area, grado}) en vez de pedir datos que la app ya conoce.
  const area = detectarArea(qn) || (ctx && ctx.area ? detectarArea(_n(ctx.area)) : null);
  const banda = detectarBanda(qn) || (ctx && ctx.grado ? detectarBanda(String(ctx.grado) + '°') : null);

  // Intenciones transversales (no requieren área).
  if (intencion.fluidez && !area) return { texto: 'Comprensión y fluidez lectora — ' + TRANSVERSAL.pta_lectura };
  if (intencion.numeros && !area) return { texto: 'Sentido numérico y resolución de problemas — ' + TRANSVERSAL.pta_mate };
  if (intencion.retro) return { texto: TRANSVERSAL.retro };
  if (intencion.diferenciar) return { texto: TRANSVERSAL.dua };
  if (intencion.bloom) return { texto: TRANSVERSAL.andamiaje };
  if (intencion.plan && !area) return { texto: TRANSVERSAL.plan };
  if (intencion.significativo && !area) return { texto: TRANSVERSAL.significativo };
  if (intencion.problemas && !area) return { texto: TRANSVERSAL.polya + '\n\n' + TRANSVERSAL.abp };

  // Si hay ÁREA, arma respuesta por capa área × banda.
  if (area) {
    const a = AREAS[area];
    // Si no se detectó grado, pide precisar pero adelanta el enfoque del área.
    if (!banda) {
      return { texto: `En ${a.nombre}: ${a.foco}\n\n¿Para qué grado lo necesitas? Dime el grado (3° a 11°) y te doy estrategias, ejemplos y dificultades específicas de esa banda. ` };
    }
    // Celda efectiva: por grado (aditiva) si el contexto trae un grado con celda poblada;
    // si no, la celda por banda (fallback intacto).
    let b = a[banda];
    const _gradoCtx = (ctx && ctx.grado != null) ? ctx.grado : null;
    const _slug = _AREAKEY_A_SLUG[area];
    if (_gradoCtx != null && _slug) {
      let _sc = null; try { _sc = pedagogiaDeSync(_slug, _gradoCtx, 'sabio_conocimiento'); } catch { _sc = null; }
      if (_sc && typeof _sc === 'object') {
        b = {
          comp: _sc.comp || b.comp,
          estr: (_sc.estr && _sc.estr.length) ? _sc.estr : b.estr,
          ej: (_sc.ej && _sc.ej.length) ? _sc.ej : b.ej,
          sig: _sc.sig || b.sig,
          prob: _sc.prob || b.prob,
          dif: (_sc.dif && _sc.dif.length) ? _sc.dif : b.dif
        };
      }
    }
    let partes = [`${a.nombre} — ${nombreBanda(banda)}. ${b.comp}`];
    if (intencion.dificultades) { partes.push('Dificultades frecuentes y cómo remediarlas:\n• ' + b.dif.join('\n• ')); }
    else if (intencion.ejemplos) { partes.push('Actividades listas para el aula:\n• ' + b.ej.join('\n• ')); }
    else if (intencion.significativo) { partes.push('Aprendizaje significativo: ' + b.sig); }
    else if (intencion.problemas) { partes.push('Resolución de problemas: ' + b.prob); }
    else { // por defecto: estrategias + un par de ejemplos
      partes.push('Estrategias didácticas:\n• ' + b.estr.slice(0, 5).join('\n• '));
      partes.push('Dos ejemplos para el aula:\n• ' + b.ej.slice(0, 2).join('\n• '));
    }
    return { texto: partes.join('\n\n') };
  }

  // Intenciones generales sin área detectada.
  if (intencion.estrategias || intencion.ejemplos || intencion.problemas || intencion.significativo) {
    return { texto: 'Con gusto. Para darte estrategias y ejemplos a la medida, dime el ÁREA (Matemáticas, Lectura Crítica/Lenguaje, Ciencias Naturales, Sociales y Ciudadanas o Inglés) y el GRADO. Por ejemplo: "estrategias para fracciones en 5°" o "comprensión lectora en 9°".' };
  }
  return null; // no es del dominio pedagógico: el chat sigue con su base de uso de la plataforma.
}
