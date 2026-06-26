// v9 final 2: Sistema de guía interactiva con Sabio + Driver.js.
// Resalta elementos reales en la página explicando para qué sirve cada uno.
// Coexiste con el botón "?" tradicional de tour.js (que muestra un tour más breve).
import { sabioSVG } from './sabio.js';
import { responderSabioIA } from './sabio-conocimiento.js';
import { peticionesPara } from './sabio-pedagogia.js';

// Cada paso puede tener:
//   element  → selector CSS del elemento a resaltar (opcional)
//   titulo   → título del popover
//   texto    → cuerpo descriptivo
//   expr     → expresión de Sabio (saludando, animando, leyendo, etc.)
//   side     → posición del popover (top, bottom, left, right) opcional
const GUIA_CONTENIDOS = {
  index: [
    { titulo: '¡Hola! Soy Sabio IA', texto: 'Soy el asistente del Instrumento IDEA y te acompaño en cada panel. Te cuento de qué trata esta página.', expr: 'saludando' },
    { titulo: 'Del dato a la acción pedagógica', texto: 'IDEA articula la evaluación diagnóstica, el análisis pedagógico y la mejora institucional en un solo ciclo, convirtiendo cada resultado en decisiones concretas para el aula.', expr: 'animando' },
    { titulo: 'El ciclo de tres fases', texto: 'Fase I: el estudiante aplica el cuadernillo. Fase II: el docente analiza y planea. Fase III: se implementa el plan de mejora en el aula. Baja en la página para verlas.', expr: 'leyendo' },
    { titulo: 'Cómo entrar', texto: 'Pulsa "Iniciar sesión" e ingresa con el usuario y la contraseña de tu rol: estudiante para presentar la prueba, docente para analizar, directivo para el consolidado institucional.', expr: 'celebrando' }
  ],
  estudiante: [
    { titulo: 'Tu panel de estudiante', texto: 'Voy a mostrarte cada parte de tu panel.', expr: 'saludando' },
    { element: '#cta-cuadernillo, .idea-card', titulo: 'Tu cuadernillo asignado', texto: 'Aquí ves los cuadernillos disponibles para tu grado. Haz click en "Presentar" sobre el que tienes asignado. Cada uno corresponde a un área y un período.', expr: 'animando' },
    { element: '#nombre-usuario', titulo: 'Tu usuario', texto: 'Arriba a la derecha ves tu nombre. Si necesitas cerrar sesión, usa el botón Salir.', expr: 'leyendo', side: 'bottom' },
    { titulo: '¡Mucho éxito!', texto: 'Cuando presentes la prueba, te explicaré cada pregunta. ¡Cada esfuerzo cuenta para tu aprendizaje!', expr: 'celebrando' }
  ],
  cuadernillo: [
    { titulo: 'Cuadernillo de evaluación', texto: 'Te muestro cómo navegar este cuadernillo paso a paso.', expr: 'leyendo' },
    { element: '#enunciado, .enunciado', titulo: 'Enunciado de la pregunta', texto: 'Aquí está el texto de la pregunta. Lee con calma, observa figuras o tablas cuando aparezcan. Las fórmulas matemáticas se renderizan automáticamente.', expr: 'leyendo' },
    { element: '#opciones, [id*=opcion]', titulo: 'Opciones de respuesta', texto: 'Marca la opción que consideres correcta. Algunas preguntas tienen 3 opciones y otras 4. Puedes cambiar tu respuesta en cualquier momento antes de enviar.', expr: 'animando' },
    { element: '.mapa-preguntas, #mapa-preguntas', titulo: 'Mapa de preguntas', texto: 'A la izquierda ves el mapa de las 20 preguntas. Verde = respondida, amarillo = saltada, rojo = actual. Click en cualquier número para ir a esa pregunta.', expr: 'pensativo' },
    { element: '#cronometro, .cronometro', titulo: 'Cronómetro', texto: 'Aquí ves el tiempo transcurrido. No hay límite estricto, pero administra bien tu tiempo para responder todas con calma.', expr: 'pensativo', side: 'bottom' },
    { element: '#btn-enviar, [id*=enviar]', titulo: 'Enviar la prueba', texto: 'Cuando termines todas las preguntas, haz click aquí. Verás un resumen y luego tu puntaje. Una vez enviada NO podrás modificar respuestas.', expr: 'feliz' }
  ],
  docente: [
    { titulo: 'Panel del docente', texto: 'Soy Sabio. Te voy a guiar por cada zona de tu panel de análisis para que sepas exactamente qué hace cada parte y cómo proceder.', expr: 'saludando' },
    { element: '.panel-hero-doc', titulo: 'Tu panel en una pantalla', texto: 'Arriba ves tu saludo y tres indicadores: cursos, áreas evaluadas y pruebas presentadas. Todo el control del docente vive en esta misma pantalla, sin menús ocultos.', expr: 'animando', side: 'bottom' },
    { element: '#card-mis-grupos', titulo: 'Tus grupos', texto: 'Cada curso es un acordeón y sus materias aparecen como tarjetas de colores. Haz clic en una materia para abrir su análisis completo en una vista dedicada.', expr: 'leyendo', side: 'bottom' },
    { element: '.doc-acciones-grid', titulo: 'Acciones y herramientas', texto: 'Siempre disponibles: Crear Plan de Mejora, exportar Excel y PDF, descargar el cuadernillo, gestionar permisos de reintento y respaldar o restaurar los datos.', expr: 'animando', side: 'top' },
    { titulo: 'El análisis de cada materia', texto: 'Al abrir una materia entras a su vista completa: indicadores del grupo, distribución por niveles, gráficos por pregunta y competencia, tabla de aciertos y recomendaciones articuladas al marco DCE.', expr: 'celebrando' },
    { titulo: 'Al terminar el análisis', texto: 'Al final de cada materia tienes botones grandes para volver al panel, continuar con otra materia y descargar lo de esa materia en Excel, PDF y cuadernillo, además de Crear el Plan de Mejora.', expr: 'feliz' },
    { titulo: '¡Ya conoces tu panel!', texto: 'Recuerda: el botón "?" arriba tiene un tour rápido y el botón 📖 abajo a la izquierda relanza esta guía completa cuando quieras.', expr: 'celebrando' }
  ],
  directivo: [
    { titulo: 'Panel del directivo', texto: 'Soy Sabio. Te explico la vista institucional consolidada.', expr: 'saludando' },
    { element: '.panel-tabs', titulo: 'Pestañas de la vista institucional', texto: 'Cambia entre Consolidado, Ranking de estudiantes (por promedio general), Comparativo entre grupos por materia y Análisis por grupo. Cada pestaña te da una mirada distinta de tu institución.', expr: 'animando', side: 'bottom' },
    { element: '#kpis-globales, [id*=kpi]', titulo: 'KPIs institucionales', texto: 'Indicadores clave de tu institución: total de aplicaciones, promedio global de todas las presentaciones, estudiantes en riesgo y estudiantes sobre nivel básico. Es tu lectura estratégica.', expr: 'leyendo' },
    { element: '#btn-ir-plan-mejora, [id*=plan-mejora]', titulo: 'Planes de Mejora', texto: 'Acompaña a tus docentes en la Fase II — Análisis y Planeación: ellos construyen aquí la estrategia y luego la llevan a la Fase III en aula.', expr: 'celebrando' }
  ],
  'plan-mejora': [
    { titulo: 'Constructor del Plan de Mejora', texto: 'Vamos a recorrer juntos las 5 etapas del wizard. Te muestro cada parte y te digo qué hacer.', expr: 'saludando' },
    { element: '#wizard-progress, [class*=progress]', titulo: 'Barra de progreso', texto: 'Esta barra de 5 píldoras te indica en qué paso estás. La activa va en rojo IDEA, las completadas en verde con check, las siguientes en gris.', expr: 'leyendo', side: 'bottom' },
    { element: '#asesoria-sabio', titulo: 'Mensaje de Sabio', texto: 'En cada paso veo tu progreso y te doy un consejo contextual. Léeme antes de avanzar — te ahorra dudas.', expr: 'animando' },
    { element: '[data-paso="1"]', titulo: 'Paso 1 - Diagnóstico', texto: 'Te muestro automáticamente el promedio, los estudiantes en riesgo y la competencia más débil. Eso será el foco de tu plan. Agrega observaciones cualitativas si quieres.', expr: 'leyendo' },
    { element: '[data-nav-next="2"]', titulo: 'Avanzar al siguiente paso', texto: 'Click en este botón para confirmar el diagnóstico y pasar al Paso 2 (Prioridades). Siempre puedes retroceder con el botón Atrás.', expr: 'animando' },
    { titulo: 'Paso 2 - Prioridades', texto: 'Las competencias con menos del 70% de logro vienen pre-marcadas. Desmarca las que ya trabajas por otra vía o marca otras prioridades.', expr: 'pensativo' },
    { titulo: 'Paso 3 - Catálogo de acciones', texto: 'Encuentras 12-15 recomendaciones expertas articuladas a evidencias. Cada card muestra esfuerzo e impacto. Selecciona entre 3 y 8 balanceando.', expr: 'celebrando' },
    { titulo: 'Paso 4 - Cronograma', texto: 'Cada acción seleccionada se vuelve fila editable. Asigna semana inicio, responsable real e indicador de seguimiento medible.', expr: 'animando' },
    { titulo: 'Paso 5 - Descargar', texto: 'Tu plan está listo. Descárgalo en PDF profesional (7 secciones expertas + anexo rúbricas) o en Word editable. Guárdalo en plataforma para seguimiento.', expr: 'feliz' }
  ],
  resultado: [
    { titulo: 'Tu resultado', texto: 'Te explico cómo leer tu resultado.', expr: 'saludando' },
    { element: '#puntaje, [id*=puntaje]', titulo: 'Tu puntaje', texto: 'Aquí ves tu puntaje sobre 100. Junto al puntaje aparece tu nivel: BAJO, BÁSICO, ALTO o SUPERIOR.', expr: 'leyendo' },
    { element: '#mensaje-sabio, [id*=sabio]', titulo: 'Mensaje personalizado', texto: 'Te doy un mensaje según tu nivel: si estás en BAJO o BÁSICO te animo a reforzar; si estás en ALTO o SUPERIOR te felicito y reto a ayudar a otros.', expr: 'feliz' },
    { titulo: '¡Excelente esfuerzo!', texto: 'Recuerda que cada prueba es una oportunidad para identificar lo que ya dominas y lo que puedes mejorar. ¡Sigue adelante!', expr: 'celebrando' }
  ],
  manager: [
    { titulo: '¡Hola! Soy Sabio, tu copiloto', texto: 'Bienvenido al Panel del Manager, tu centro de control para preparar la plataforma antes de que entren docentes, directivos y estudiantes. Te muestro cada parte.', expr: 'saludando' },
    { element: '.panel-tabs', titulo: 'Tus tareas en pestañas', texto: 'Desde estas pestañas cambias entre tus funciones: asignar grupos a docentes, asignar directivos a su institución, gestionar reintentos y el mantenimiento de la demostración.', expr: 'animando', side: 'bottom' },
    { element: '#lista-docentes', titulo: 'Grupos → Docentes', texto: 'Marca qué grupos puede ver cada docente y pulsa Guardar. Si no marcas ninguno, ese docente verá todos los grupos de su institución. Así decides el alcance de cada profesor.', expr: 'leyendo', side: 'top' },
    { element: '[data-vista="directivos"]', titulo: 'Directivos → Institución', texto: 'Esta pestaña asigna a cada directivo la institución que va a supervisar. El directivo verá el consolidado y todos los grupos de esa IE.', expr: 'pensativo', side: 'bottom' },
    { element: '[data-vista="reintentos"]', titulo: 'Reintentos', texto: 'Esta pestaña habilita que un estudiante vuelva a presentar un cuadernillo que ya envió, y también permite revocar permisos vigentes.', expr: 'animando', side: 'bottom' },
    { titulo: '¡Listo para la demostración!', texto: 'Cuando quieras, el botón 📖 de abajo relanza esta guía completa y el botón ? trae un tour rápido. ¡A explorar!', expr: 'celebrando' }
  ]
};

function getDriverFactory() {
  return window.driver?.js?.driver || window.driver?.driver || null;
}

let _btnGuiaInit = false;

export function iniciarGuiaSabio(pagina = 'index') {
  const pasos = GUIA_CONTENIDOS[pagina] || GUIA_CONTENIDOS.index;
  const factory = getDriverFactory();
  if (!factory) {
    console.warn('Driver.js no cargado. Esperando 200ms para reintento...');
    setTimeout(() => iniciarGuiaSabio(pagina), 200);
    return;
  }

  // Construir steps de Driver.js. Para cada paso, popover incluye Sabio SVG + texto formateado.
  const steps = pasos.filter(p => !p.element || document.querySelector(p.element)).map(p => {
    const sabioMascot = sabioSVG(p.expr || 'saludando', 70);
    const descripcionHTML = `
      <div style="display:flex; gap:14px; align-items:flex-start; padding-top:6px;">
        <div style="flex-shrink:0;">${sabioMascot}</div>
        <div style="flex:1; font-size:14px; line-height:1.55; color:#1F1F23;">${p.texto}</div>
      </div>
    `;
    const step = {
      popover: {
        title: p.titulo,
        description: descripcionHTML,
        side: p.side || 'auto',
        align: 'center'
      }
    };
    if (p.element) step.element = p.element;
    return step;
  });

  const tour = factory({
    showProgress: true,
    popoverClass: 'idea-guia-sabio',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo! ✓',
    progressText: 'Paso {{current}} de {{total}}',
    overlayColor: '#0F0F12',
    overlayOpacity: 0.62,
    showButtons: ['next', 'previous', 'close'],
    steps
  });
  tour.drive();
}

// Ícono compacto de Sabio (cabeza-robot con birrete), pensado para tamaños pequeños sin
// recortes. IDs únicos por instancia para poder pintarlo varias veces en la misma página.
let _iconSeq = 0;
function iconoSabio(size = 44) {
  const u = '_si' + (++_iconSeq); const w = Math.round(size * 48 / 52);
  return `<svg width="${w}" height="${size}" viewBox="0 0 48 52" aria-hidden="true">
    <defs>
      <linearGradient id="h${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B86F0"/><stop offset="1" stop-color="#352F8C"/></linearGradient>
      <radialGradient id="e${u}" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="#ECFEFF"/><stop offset="0.5" stop-color="#67E8F9"/><stop offset="1" stop-color="#06B6D4"/></radialGradient>
    </defs>
    <polygon points="24,7 37,12 24,17 11,12" fill="#2A2660"/>
    <line x1="37" y1="12" x2="37" y2="20" stroke="#FBBF24" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="37" cy="20.6" r="1.6" fill="#FBBF24"/><circle cx="24" cy="12" r="1.7" fill="#FBBF24"/>
    <rect x="9" y="15" width="30" height="29" rx="13" fill="url(#h${u})"/>
    <rect x="13.5" y="21" width="21" height="15" rx="7.5" fill="#0A1024"/>
    <circle cx="19.6" cy="28.4" r="2.5" fill="url(#e${u})"/><circle cx="18.7" cy="27.4" r="0.9" fill="#fff"/>
    <circle cx="28.4" cy="28.4" r="2.5" fill="url(#e${u})"/><circle cx="27.5" cy="27.4" r="0.9" fill="#fff"/>
    <path d="M20.6 40.6 Q24 43 27.4 40.6" stroke="#CFE9F2" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`;
}
// Resalta (y desplaza hacia) un elemento real de la página. Robusto: si no existe, no hace nada.
function resaltarElemento(sel) {
  let el = null; try { el = sel && document.querySelector(sel); } catch { el = null; }
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('sia-foco');
  setTimeout(() => el.classList.remove('sia-foco'), 2800);
  return true;
}

// Asistente "Sabio IA": panel desplegable e INTERACTIVO. Explica la página, resalta los
// elementos cuando tocas una tarjeta, y responde preguntas. Cabecera con la franja oscura
// de los paneles para una transición visual natural. Es el modo del botón de ayuda en TODOS
// los paneles. Toggle: abre/cierra.
export function abrirAsistenteSabioIA(pagina = 'index') {
  const previo = document.getElementById('sabio-ia-panel');
  if (previo) { previo.remove(); return; }
  const pasos = GUIA_CONTENIDOS[pagina] || GUIA_CONTENIDOS.index;
  const tarjetas = pasos.map((p, i) => {
    const tieneEl = !!(p.element && document.querySelector(p.element));
    return `<div class="sia-msg${tieneEl ? ' sia-msg--link' : ''}"${tieneEl ? ` data-el="${p.element}"` : ''} style="animation-delay:${(i * 0.06).toFixed(2)}s">
      ${p.titulo ? `<b>${p.titulo}</b>` : ''}${p.texto || ''}${tieneEl ? '<span class="sia-ver">📍 Muéstrame dónde</span>' : ''}
    </div>`;
  }).join('');
  const panel = document.createElement('div');
  panel.id = 'sabio-ia-panel';
  panel.className = 'sabio-ia-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Asistente Sabio IA');
  panel.innerHTML = `
    <div class="sia-head">
      <div class="sia-head-av">${iconoSabio(34)}</div>
      <div class="sia-head-txt"><b>Sabio IA</b><span>Tu asistente · toca una tarjeta o pregúntame</span></div>
      <button class="sia-close" aria-label="Cerrar asistente">&times;</button>
    </div>
    <div class="sia-body" id="sia-body">${(() => {
      // Sugerencias PERSONALIZADAS por rol (la página indica el rol) y, para el docente,
      // por el área y grado del grupo abierto (window.SABIO_CTX, fijado al seleccionar grupo).
      const rol = { estudiante: 'estudiante', docente: 'docente', directivo: 'directivo', manager: 'manager' }[pagina] || '';
      const chips = peticionesPara(rol, (window.SABIO_CTX || {}));
      if (!chips || !chips.length) return '';
      return `<div class="sia-sugerencias"><div class="sia-sug-t">💡 ¿No sabes qué pedir? Toca una idea:</div>${chips.map(p => `<button type="button" class="sia-sug">${p}</button>`).join('')}</div>`;
    })()}${tarjetas}</div>
    <form class="sia-chat" id="sia-chat" autocomplete="off">
      <input type="text" id="sia-input" placeholder="Pregúntame sobre esta página…" aria-label="Escribe tu pregunta">
      <button type="submit" aria-label="Enviar pregunta">➤</button>
    </form>`;
  document.body.appendChild(panel);
  const body = panel.querySelector('#sia-body');
  panel.querySelector('.sia-close').addEventListener('click', () => panel.remove());
  document.addEventListener('keydown', function _esc(e) { if (e.key === 'Escape') { panel.remove(); document.removeEventListener('keydown', _esc); } });
  body.addEventListener('click', e => {
    const sug = e.target.closest('.sia-sug');
    if (sug) { const inp = panel.querySelector('#sia-input'); inp.value = sug.textContent; panel.querySelector('#sia-chat').dispatchEvent(new Event('submit', { cancelable: true })); return; }
    const card = e.target.closest('.sia-msg--link');
    if (card && card.dataset.el) {
      if (!resaltarElemento(card.dataset.el)) card.querySelector('.sia-ver') && (card.querySelector('.sia-ver').textContent = 'No está visible aquí');
    }
  });
  const esc = s => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  panel.querySelector('#sia-chat').addEventListener('submit', e => {
    e.preventDefault();
    const input = panel.querySelector('#sia-input');
    const q = input.value.trim(); if (!q) return;
    input.value = '';
    body.insertAdjacentHTML('beforeend', `<div class="sia-q">${esc(q)}</div>`);
    const r = responderSabioIA(q, pasos, window.SABIO_CTX);
    const tieneEl = !!(r.element && document.querySelector(r.element));
    body.insertAdjacentHTML('beforeend', `<div class="sia-msg sia-msg--a${tieneEl ? ' sia-msg--link' : ''}"${tieneEl ? ` data-el="${r.element}"` : ''}><b>Sabio IA</b>${r.texto.replace(/\n/g, '<br>')}${tieneEl ? '<span class="sia-ver">📍 Muéstrame dónde</span>' : ''}</div>`);
    body.scrollTop = body.scrollHeight;
  });
}

function montarBotonGuia() {
  if (_btnGuiaInit) return;
  _btnGuiaInit = true;

  // Detectar página por URL
  const path = window.location.pathname.toLowerCase();
  let pagina = 'index';
  if (path.includes('estudiante')) pagina = 'estudiante';
  else if (path.includes('cuadernillo')) pagina = 'cuadernillo';
  else if (path.includes('docente')) pagina = 'docente';
  else if (path.includes('directivo')) pagina = 'directivo';
  else if (path.includes('manager')) pagina = 'manager';
  else if (path.includes('plan-mejora')) pagina = 'plan-mejora';
  else if (path.includes('resultado')) pagina = 'resultado';
  else if (path.includes('manager')) pagina = 'manager';

  // Boton flotante dorado (a la IZQUIERDA del boton ? tradicional para coexistir)
  const btn = document.createElement('button');
  btn.id = 'btn-guia-sabio';
  btn.setAttribute('aria-label', 'Abrir guía completa de Sabio');
  // El botón de ayuda ES Sabio (la IA viviendo en toda la plataforma). Ícono limpio y
  // compacto (cabeza-robot con birrete) diseñado para leerse bien a tamaño pequeño.
  btn.innerHTML = `${iconoSabio(44)}<span class="btn-guia-tooltip">Sabio IA · Ayuda</span>`;
  btn.style.cssText = `
    position: fixed; bottom: 22px; right: 22px; z-index: 50;
    width: 62px; height: 62px; border-radius: 50%; overflow: hidden;
    background: radial-gradient(circle at 50% 30%, #FFFFFF, #FFF1EA);
    border: 1px solid #F0D9CE; cursor: pointer; padding: 0;
    box-shadow: 0 16px 34px -12px rgba(194,65,12,0.32), 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 260ms cubic-bezier(.2,.7,.2,1), box-shadow 260ms;
    display: grid; place-items: center;
  `;
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.08)'; btn.style.boxShadow = '0 22px 42px -14px rgba(194,65,12,0.42), 0 0 0 4px rgba(194,65,12,0.14)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 16px 34px -12px rgba(194,65,12,0.32), 0 2px 8px rgba(0,0,0,0.1)'; });
  btn.addEventListener('click', () => abrirAsistenteSabioIA(pagina));
  document.body.appendChild(btn);

  // CSS encapsulado: tooltip + estilo del popover Driver.js
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Panel del asistente Sabio IA (desplegable desde el botón de ayuda) */
    .sabio-ia-panel{position:fixed;right:22px;bottom:96px;z-index:51;width:min(372px,calc(100vw - 32px));max-height:74vh;display:flex;flex-direction:column;background:#fff;border:1px solid #ECEAF3;border-radius:18px;box-shadow:0 30px 72px -24px rgba(20,15,25,.5);overflow:hidden;animation:siaIn .32s cubic-bezier(.2,.7,.2,1) both;font-family:'Inter',system-ui,sans-serif}
    @keyframes siaIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
    .sabio-ia-panel .sia-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(120deg,#7E1D33,#C2410C);color:#fff}
    .sabio-ia-panel .sia-head-av{flex-shrink:0;width:34px;display:grid;place-items:center}
    .sabio-ia-panel .sia-head-txt{flex:1;line-height:1.25}
    .sabio-ia-panel .sia-head-txt b{display:block;font-size:15px;font-weight:800}
    .sabio-ia-panel .sia-head-txt span{font-size:11px;opacity:.78}
    .sabio-ia-panel .sia-close{background:rgba(255,255,255,.14);border:none;color:#fff;width:28px;height:28px;border-radius:8px;font-size:20px;line-height:1;cursor:pointer}
    .sabio-ia-panel .sia-close:hover{background:rgba(255,255,255,.28)}
    .sabio-ia-panel .sia-body{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:#FBFAFD}
    .sabio-ia-panel .sia-msg{background:#fff;border:1px solid #ECEAF3;border-left:3px solid #C2410C;border-radius:6px 14px 14px 6px;padding:10px 13px;font-size:13px;line-height:1.55;color:#33303B;animation:siaMsg .42s ease both}
    .sabio-ia-panel .sia-msg b{display:block;color:#7E1D33;font-weight:700;margin-bottom:2px}
    .sabio-ia-panel .sia-msg--link{cursor:pointer;transition:box-shadow .16s,transform .12s}
    .sabio-ia-panel .sia-msg--link:hover{box-shadow:0 8px 22px -12px rgba(194,65,12,.55);transform:translateX(2px)}
    .sabio-ia-panel .sia-msg--a{border-left-color:#0E0E12}
    .sabio-ia-panel .sia-ver{display:inline-block;margin-top:7px;font-size:11px;font-weight:700;color:#C2410C}
    .sabio-ia-panel .sia-q{align-self:flex-end;max-width:86%;background:#241B33;color:#fff;border-radius:14px 14px 4px 14px;padding:8px 12px;font-size:13px;line-height:1.5;animation:siaMsg .3s ease both}
    @keyframes siaMsg{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .sabio-ia-panel .sia-chat{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #F0EEF5;background:#fff}
    .sabio-ia-panel .sia-chat input{flex:1;border:1.5px solid #ECEAF3;border-radius:10px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;color:#33303B}
    .sabio-ia-panel .sia-chat input:focus{border-color:#C2410C;box-shadow:0 0 0 3px rgba(194,65,12,.12)}
    .sabio-ia-panel .sia-chat button{flex-shrink:0;width:40px;border:none;border-radius:10px;background:linear-gradient(118deg,#7E1D33,#C2410C);color:#fff;font-size:15px;cursor:pointer}
    .sabio-ia-panel .sia-sugerencias{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;margin-bottom:4px;background:linear-gradient(180deg,#FFF7F2,#FFFDFC);border:1px solid #F3E3DA;border-radius:14px}
    .sabio-ia-panel .sia-sug-t{width:100%;font-size:11.5px;font-weight:700;color:#9A3412;margin-bottom:2px}
    .sabio-ia-panel .sia-sug{border:1px solid #EAD7CD;background:#fff;color:#7E1D33;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;transition:transform .15s,box-shadow .15s,background .15s}
    .sabio-ia-panel .sia-sug:hover{background:#FFF1EA;box-shadow:0 6px 16px -8px rgba(194,65,12,.45);transform:translateY(-1px)}
    .sia-foco{outline:3px solid #C2410C !important;outline-offset:3px;border-radius:10px;box-shadow:0 0 0 6px rgba(194,65,12,.18) !important;animation:siaFoco 1.2s ease 0s 2;position:relative;z-index:40}
    @keyframes siaFoco{0%,100%{box-shadow:0 0 0 6px rgba(194,65,12,.18)}50%{box-shadow:0 0 0 11px rgba(194,65,12,.30)}}
    @media (max-width:640px){.sabio-ia-panel{right:12px;left:12px;bottom:90px;width:auto}}

    @keyframes btnGuiaPulse {
      0%, 100% { box-shadow: 0 10px 30px rgba(251,191,36,0.5), 0 0 0 0 rgba(251,191,36,0.4); }
      50% { box-shadow: 0 10px 30px rgba(251,191,36,0.6), 0 0 0 14px rgba(251,191,36,0); }
    }
    #btn-guia-sabio .btn-guia-tooltip {
      position: absolute; bottom: 72px; right: 0;
      background: #1F1F23; color: #FBBF24; padding: 8px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 200ms;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    #btn-guia-sabio:hover .btn-guia-tooltip { opacity: 1; }
    #btn-guia-sabio .btn-guia-tooltip::after {
      content: ''; position: absolute; bottom: -6px; right: 20px;
      border: 6px solid transparent; border-top-color: #1F1F23;
    }
    /* Estilo del popover Driver.js para la guia Sabio */
    .driver-popover.idea-guia-sabio {
      background: linear-gradient(180deg, #FFFFFF 0%, #FEF9F3 100%) !important;
      border-radius: 18px !important;
      box-shadow: 0 25px 80px rgba(0,0,0,0.4), 0 0 0 3px rgba(251,191,36,0.4) !important;
      padding: 16px !important;
      max-width: 480px !important;
      animation: guiaSabioAparecer 280ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes guiaSabioAparecer {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
    .driver-popover.idea-guia-sabio .driver-popover-title {
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-weight: 700 !important;
      font-size: 17px !important;
      color: #E11D48 !important;
      margin: 0 0 10px 0 !important;
      padding: 0 0 8px 0 !important;
      border-bottom: 1px solid #FEF3C7 !important;
    }
    .driver-popover.idea-guia-sabio .driver-popover-description {
      padding: 0 !important;
      color: #1F1F23 !important;
    }
    .driver-popover.idea-guia-sabio .driver-popover-progress-text {
      font-size: 11px !important;
      color: #94A3B8 !important;
      font-weight: 600 !important;
    }
    .driver-popover.idea-guia-sabio button.driver-popover-next-btn,
    .driver-popover.idea-guia-sabio button.driver-popover-prev-btn,
    .driver-popover.idea-guia-sabio button.driver-popover-close-btn {
      background: linear-gradient(135deg, #E11D48, #9F1239) !important;
      color: white !important;
      padding: 8px 18px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      border: none !important;
      text-shadow: none !important;
    }
    .driver-popover.idea-guia-sabio button.driver-popover-prev-btn {
      background: #F1F5F9 !important;
      color: #475569 !important;
    }
    .driver-popover.idea-guia-sabio button.driver-popover-close-btn {
      background: transparent !important;
      color: #94A3B8 !important;
      font-size: 18px !important;
      padding: 4px 10px !important;
    }
    /* Halo del elemento resaltado: que se vea bonito */
    .driver-active-element {
      outline: 4px solid #FBBF24 !important;
      outline-offset: 4px !important;
      border-radius: 8px;
      transition: outline 200ms;
    }
  `;
  document.head.appendChild(styleEl);
}

// Auto-init si se importa en navegador
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarBotonGuia, { once: true });
  } else {
    montarBotonGuia();
  }
}

export function autoIniciarGuia() {
  // Helper público por compatibilidad con la versión anterior
  montarBotonGuia();
}
