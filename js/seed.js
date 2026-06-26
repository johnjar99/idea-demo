// seed.js — Generación de aplicaciones simuladas para datos demo enriquecidos.
//
// Cada estudiante recibe entre 1 y 3 aplicaciones (P1, P2, P3) con un puntaje
// objetivo según un "perfil" persistente, simulando respuestas coherentes con
// ese nivel. Esto garantiza que el dashboard del docente y los reportes tengan
// material variado para mostrar (distribución de niveles, evolución, etc.).

import { db } from './db.js';
import { uuid, nowIso } from './utils.js';
import { calcularResultados } from './calculo.js';
import { generarPlanAplicacion } from './shuffle.js';

const ESTADOS_APLICACION = { ENVIADA: 'enviada' };

/**
 * Perfiles de estudiantes (puntaje objetivo P1, P2, P3).
 * 20 estudiantes 11A + 5 11B. Distribución pensada para mostrar variedad:
 *   ~30% BAJO, ~40% BÁSICO, ~25% ALTO, ~5% SUPERIOR.
 */
const PERFILES = [
  // 11A — 20 estudiantes
  { docs: '1000000001', perfil: [40, 50, 55] },   // mejora gradual
  { docs: '1000000002', perfil: [75, 80, 85] },   // alto consistente
  { docs: '1000000003', perfil: [40, 45, 50] },   // bajo persistente
  { docs: '1000000004', perfil: [55, 60, 65] },   // básico estable
  { docs: '1000000005', perfil: [40, 40, 50] },   // bajo a básico
  { docs: '1000000006', perfil: [70, 75, 75] },   // básico-alto
  { docs: '1000000007', perfil: [45, 55, 60] },   // mejora
  { docs: '1000000008', perfil: [45, 50, 60] },   // mejora suave
  { docs: '1000000009', perfil: [40, 45, 45] },   // estancado bajo
  { docs: '1000000011', perfil: [15, 30, 45] },   // mejora dramática desde muy bajo
  { docs: '1000000012', perfil: [40, 50, 55] },   // mejora gradual
  { docs: '1000000013', perfil: [45, 40, 45] },   // bajo errático
  { docs: '1000000014', perfil: [50, 55, 65] },   // básico consolidado
  { docs: '1000000015', perfil: [40, 45, 50] },   // mejora discreta
  { docs: '1000000016', perfil: [40, 50, 50] },   // bajo→básico
  { docs: '1000000017', perfil: [45, 65, 75] },   // mejora fuerte
  { docs: '1000000018', perfil: [75, 80, 85] },   // alta destacada
  { docs: '1000000019', perfil: [65, 70, 80] },   // alto en ascenso
  { docs: '1000000021', perfil: [85, 90, 95] },   // SUPERIOR — referente
  { docs: '1000000022', perfil: [50, 55, 70] },   // mejora notable
  // 11B — 5 estudiantes
  { docs: '1000000023', perfil: [60, 70, 80], grupo: 'B' },
  { docs: '1000000024', perfil: [40, 50, 60], grupo: 'B' },
  { docs: '1000000025', perfil: [70, 75, 85], grupo: 'B' },
  { docs: '1000000026', perfil: [45, 50, 55], grupo: 'B' },
  { docs: '1000000027', perfil: [55, 65, 75], grupo: 'B' }
];

const PERIODOS = ['I', 'II', 'III'];

/**
 * Genera respuestas simuladas para alcanzar un puntaje objetivo.
 * Distribuye correctamente las preguntas necesarias para llegar al puntaje.
 */
function simularRespuestas(cuadernillo, puntajeObjetivo) {
  const total = cuadernillo.preguntas.length;
  const aciertos = Math.round((puntajeObjetivo / 100) * total);
  // Indices aleatorios donde acertará
  const indices = [...Array(total).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const idxAciertos = new Set(indices.slice(0, aciertos));

  return cuadernillo.preguntas.map((p, i) => {
    // Usar las opciones reales de la pregunta (puede ser A-C o A-D según área)
    const opcionesPregunta = Object.keys(p.opciones || {}).sort();
    const incorrectas = opcionesPregunta.filter(o => o !== p.clave);
    const elegida = idxAciertos.has(i)
      ? p.clave
      : incorrectas[Math.floor(Math.random() * incorrectas.length)];
    return {
      pregunta_id: p.id,
      opcion_visual: elegida,
      opcion_elegida_real: elegida,
      tiempo_seg: 60 + Math.floor(Math.random() * 120)
    };
  });
}

/**
 * Crea una aplicación enviada para un estudiante en un período.
 */
function construirAplicacion(estudiante, cuadernillo, puntajeObjetivo, periodo, intentoNumero, oficial) {
  const plan = generarPlanAplicacion(cuadernillo);
  const respuestas = simularRespuestas(cuadernillo, puntajeObjetivo);
  // Fechas escalonadas para mostrar evolución (P1 hace 6 meses, P2 hace 3, P3 hoy)
  const offsetMeses = { I: 6, II: 3, III: 0 }[periodo];
  const fechaBase = new Date();
  fechaBase.setMonth(fechaBase.getMonth() - offsetMeses);
  fechaBase.setDate(fechaBase.getDate() - Math.floor(Math.random() * 5));

  const fechaIso = fechaBase.toISOString();
  const duracion = 1800 + Math.floor(Math.random() * 1400);

  const baseApp = {
    id: uuid(),
    estudiante_id: estudiante.id,
    estudiante_nombre: estudiante.nombre_completo,
    institucion_id: estudiante.institucion_id,
    sede_id: estudiante.sede_id,
    grado: estudiante.grado,
    grupo: estudiante.grupo,
    cuadernillo_id: cuadernillo.id,
    area: cuadernillo.area,
    periodo,
    fecha_inicio: fechaIso,
    fecha_fin: fechaIso,
    fecha_envio: fechaIso,
    duracion_segundos: duracion,
    orden_preguntas: plan.ordenPreguntas,
    orden_opciones: plan.ordenesOpciones,
    respuestas,
    intento_numero: intentoNumero,
    estado: ESTADOS_APLICACION.ENVIADA,
    bloqueada: true,
    oficial,
    finalizado_por_tiempo: false
  };
  const calc = calcularResultados(baseApp, cuadernillo);
  return { ...baseApp, ...calc };
}

/**
 * Pobla datos demo completos: solo crea aplicaciones si no existen ya.
 */
export async function poblarDatosDemo(opciones = {}) {
  const usuarios = await db.lista('idea_usuarios');
  const cuadernillos = await db.lista('idea_cuadernillos');
  if (!cuadernillos.length) throw new Error('No hay cuadernillos cargados. Ejecuta db.inicializar() primero.');

  const apsExistentes = await db.lista('idea_aplicaciones');
  if (apsExistentes.length > 0) {
    return { creadas: 0, mensaje: 'Ya existen aplicaciones registradas. Limpia la base primero.' };
  }

  // v5: modo demo grande con N estudiantes simulados (default 25 = perfiles base)
  const N = opciones.total_estudiantes || 0;
  const perfilesFinales = [...PERFILES];
  if (N > PERFILES.length) {
    let idx = 0;
    while (perfilesFinales.length < N) {
      const base = PERFILES[idx % PERFILES.length];
      const docFake = '20000' + String(100000 + perfilesFinales.length).slice(-5);
      const variacion = perfilesFinales.length % 2 === 0 ? 5 : -5;
      perfilesFinales.push({
        docs: docFake,
        perfil: base.perfil.map(p => Math.max(15, Math.min(100, p + variacion + Math.floor(Math.random() * 6 - 3)))),
        grupo: idx % 4 === 0 ? 'B' : 'A',
        nombre_sintetico: `Estudiante Demo ${perfilesFinales.length + 1}`
      });
      idx++;
    }
  }

  const nuevasApps = [];
  for (const perfil of perfilesFinales) {
    let estudiante = usuarios.find(u => u.numero_documento === perfil.docs);
    if (!estudiante && perfil.nombre_sintetico) {
      estudiante = {
        id: uuid(),
        numero_documento: perfil.docs,
        nombre_completo: perfil.nombre_sintetico,
        institucion_id: usuarios[0]?.institucion_id || 'inst-sjb',
        sede_id: usuarios[0]?.sede_id || null,
        grado: 11,
        grupo: perfil.grupo || 'A',
        rol: 'estudiante'
      };
    }
    if (!estudiante) continue;
    // Genera aplicaciones para todos los cuadernillos disponibles
    for (const cuadActual of cuadernillos) {
      const nPeriodos = 2 + (Math.floor(Math.random() * 2));
      for (let i = 0; i < nPeriodos; i++) {
        const periodo = PERIODOS[i];
        const objetivo = Math.max(15, Math.min(100, perfil.perfil[i] + Math.floor(Math.random() * 8 - 4)));
        const oficial = (i === nPeriodos - 1);
        const intento = i + 1;
        nuevasApps.push(construirAplicacion(estudiante, cuadActual, objetivo, periodo, intento, oficial));
      }
    }
  }

  await db.guardarLista('idea_aplicaciones', nuevasApps);

  // === Seed v3: mensajes + permisos históricos para que la demo se sienta poblada ===
  const docente = usuarios.find(u => u.rol === 'docente');
  const estudiantes = usuarios.filter(u => u.rol === 'estudiante');
  if (docente && estudiantes.length) {
    const PLANTILLAS_SEED = [
      { asunto: '¡Felicitaciones por tu desempeño!', texto: 'Hola, quería felicitarte por tu desempeño en la última prueba. Sigue así.' },
      { asunto: 'Recomendación de refuerzo', texto: 'Hola, noté oportunidades de mejora en Razonamiento. Te recomiendo Khan Academy esta semana.' },
      { asunto: 'Nuevo intento autorizado', texto: 'He habilitado un nuevo intento en tu panel. Tómalo con calma cuando estés listo.' },
      { asunto: 'Citación a tutoría', texto: 'Te cito a tutoría individual el miércoles a las 2:00 pm. Confirma asistencia, por favor.' },
      { asunto: 'Sobre el plan de mejora', texto: 'Vamos a trabajar en el plan que conversamos. Practica los problemas 13, 14 y 15.' },
      { asunto: 'Buen progreso', texto: 'Tu progreso es notable. Mantén el ritmo y enfócate ahora en Argumentación.' },
      { asunto: 'Atención a las reseñas', texto: 'Revisa el detalle de las preguntas que erraste. Cada pregunta tiene una justificación que te ayudará.' }
    ];
    const seedMensajes = [];
    const nMsg = 20;
    for (let i = 0; i < nMsg; i++) {
      const est = estudiantes[i % estudiantes.length];
      const pl = PLANTILLAS_SEED[i % PLANTILLAS_SEED.length];
      const diasAtras = Math.floor(Math.random() * 30);
      const fecha = new Date(Date.now() - diasAtras * 86400000).toISOString();
      const id = uuid();
      seedMensajes.push({
        id,
        hilo_id: id,
        de_id: docente.id,
        de_nombre: docente.nombre_completo,
        para_id: est.id,
        asunto: pl.asunto,
        texto: pl.texto,
        fecha,
        leido: Math.random() > 0.4,
        plantilla: null
      });
    }
    await db.guardarLista('idea_mensajes', seedMensajes);

    // 4 permisos: 2 consumidos, 2 vigentes
    const permisos = [];
    for (let i = 0; i < 4; i++) {
      const est = estudiantes[i];
      if (!est) continue;
      const consumido = i < 2;
      permisos.push({
        id: uuid(),
        estudiante_id: est.id,
        cuadernillo_id: cuadernillos[0]?.id || 'mat-11-p1-2023',
        otorgado_por_id: docente.id,
        razon: consumido ? 'Problema técnico durante primera aplicación (histórico)' : 'Nuevo intento autorizado tras tutoría',
        fecha_otorgado: new Date(Date.now() - (consumido ? 20 : 3) * 86400000).toISOString(),
        consumido,
        fecha_consumido: consumido ? new Date(Date.now() - (15 + i) * 86400000).toISOString() : null,
        aplicacion_consumida_id: null,
        fecha_revocado: null
      });
    }
    await db.guardarLista('idea_permisos_reintento', permisos);
  }

  return {
    creadas: nuevasApps.length,
    mensaje: `${nuevasApps.length} aplicaciones · 20 mensajes seed · 4 permisos históricos creados.`
  };
}

/**
 * Limpia todas las aplicaciones (útil para regenerar demo).
 */
export async function limpiarAplicaciones() {
  await db.guardarLista('idea_aplicaciones', []);
  await db.guardarLista('idea_permisos_reintento', []);
  await db.guardarLista('idea_mensajes', []);
}
