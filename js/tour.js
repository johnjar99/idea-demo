// tour.js — Onboarding interactivo usando Driver.js cargado via CDN.
//
// API:
//   iniciarTour(rol) → arranca el tour específico del rol
//   botonAyudaFlotante(rol) → inyecta un botón "?" flotante que dispara el tour
//   debeAutoIniciar(rol) → true si es la primera visita del rol
//   marcarTourCompleto(rol)
//
// Driver.js se carga global como `window.driver.js.driver` (función fábrica).

const LS_PREFIX = 'idea_tour_completado_';

function getDriverFactory() {
  return window.driver?.js?.driver || window.driver?.driver || null;
}

const TOURS = {
  estudiante: [
    {
      element: '#cta-cuadernillo',
      popover: {
        title: '👋 Te damos la bienvenida',
        description: 'Aquí encontrarás los cuadernillos que tu docente ha dispuesto para ti. Cada cuadernillo tiene su botón rojo para iniciar cuando estés listo.'
      }
    },
    {
      element: '.idea-card:nth-of-type(2)',
      popover: {
        title: 'Tu progreso',
        description: 'Aquí verás cuántas pruebas has presentado y tu mejor puntaje. Solo se cuentan las pruebas que envíes formalmente.'
      }
    },
    {
      popover: {
        title: '💡 Consejo de Sabio',
        description: 'Antes de iniciar la prueba, asegúrate de tener tiempo suficiente (1 hora) y de estar en un espacio tranquilo. Una vez envíes tu prueba, no podrás modificarla.'
      }
    }
  ],
  docente: [
    {
      element: '.panel-hero-doc',
      popover: {
        title: '🧑‍🏫 Panel del Docente',
        description: 'Tu centro de control en una sola pantalla: aquí ves tus grupos, exportas reportes, gestionas permisos y creas Planes de Mejora.'
      }
    },
    {
      element: '#lista-grupos',
      popover: {
        title: 'Tus grupos',
        description: 'Aparecen aquí los grupos con aplicaciones enviadas. Haz clic en uno para ver su análisis completo.'
      }
    },
    {
      element: '#btn-panel-permisos',
      popover: {
        title: '🔑 Permisos de reintento',
        description: 'Si un estudiante necesita presentar de nuevo (problema técnico, ausencia, etc.) le habilitas un nuevo intento desde aquí.'
      }
    },
    {
      element: '#btn-plan-mejora',
      popover: {
        title: '📋 Plan de Mejora',
        description: 'Fase II — Análisis y Planeación. Aquí construyes el plan articulado al marco DCE; la Fase III (implementación) la llevas tú a tu aula.'
      }
    }
  ],
  directivo: [
    {
      element: '.panel-tabs',
      popover: {
        title: '🏛 Panel Directivo',
        description: 'Vista institucional completa. Aquí puedes consolidar resultados de toda la institución y exportar reportes oficiales.'
      }
    },
    {
      element: '#kpis-globales',
      popover: {
        title: 'KPIs globales',
        description: 'Indicadores clave de tu institución: total de aplicaciones, promedio, estudiantes en riesgo y estudiantes sobre nivel básico.'
      }
    },
    {
      element: '#btn-ir-plan-mejora',
      popover: {
        title: 'Planes de Mejora institucionales',
        description: 'Acompaña a tus docentes en la Fase II — Análisis y Planeación. Ellos construyen aquí la estrategia para luego implementarla en aula (Fase III).'
      }
    }
  ],
  manager: [
    {
      element: '.panel-tabs',
      popover: {
        title: '🛠 Panel del Manager',
        description: 'Tu centro de control: asignas grupos a docentes, directivos a su institución y gestionas reintentos de estudiantes.'
      }
    },
    {
      element: '#lista-docentes',
      popover: {
        title: 'Grupos → Docentes',
        description: 'Marca los grupos de cada docente y pulsa Guardar. Sin marcar ninguno, el docente ve todos los grupos de su institución.'
      }
    },
    {
      element: '[data-vista="reintentos"]',
      popover: {
        title: '🔑 Reintentos',
        description: 'Habilita que un estudiante vuelva a presentar un cuadernillo que ya envió, o revoca permisos vigentes.'
      }
    }
  ],
  funcionario: [
    {
      popover: {
        title: '🎯 Panel Funcionario',
        description: 'Vista departamental. Puedes comparar instituciones, generar reportes consolidados de la SED y monitorear el ciclo IDEA en todas las IE.'
      }
    }
  ]
};

/**
 * Inicia el tour correspondiente al rol.
 * Si Driver.js aún no cargó, reintenta hasta 3 segundos.
 */
export function iniciarTour(rol) {
  const factory = getDriverFactory();
  if (!factory) {
    if (!iniciarTour._reintentos) iniciarTour._reintentos = 0;
    if (iniciarTour._reintentos < 30) {
      iniciarTour._reintentos++;
      setTimeout(() => iniciarTour(rol), 100);
    } else {
      console.warn('Driver.js no cargó. Tour omitido.');
    }
    return;
  }
  const pasos = TOURS[rol];
  if (!pasos) return;

  const tour = factory({
    showProgress: true,
    popoverClass: 'idea-tour',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo!',
    steps: pasos.filter(p => !p.element || document.querySelector(p.element))
  });
  tour.drive();
  marcarTourCompleto(rol);
}

export function debeAutoIniciar(rol) {
  return !localStorage.getItem(LS_PREFIX + rol);
}

export function marcarTourCompleto(rol) {
  localStorage.setItem(LS_PREFIX + rol, '1');
}

/**
 * Inyecta un botón flotante de ayuda que dispara el tour.
 */
export function botonAyudaFlotante(rol) {
  // Rediseño 2026-06-07: el ÚNICO botón de ayuda flotante es ahora el de Sabio
  // (js/guia-sabio.js) — "la IA viviendo en la plataforma". Se suprime el antiguo "?"
  // para no duplicar botones. El tour sigue disponible vía iniciarTour si se necesita.
  return;
}
