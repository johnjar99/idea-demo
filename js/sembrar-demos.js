// sembrar-demos.js — Motor de DEMOS de la IE de demostración (solo sandbox idea-demo).
//
// cargarDemosTodas(): por cada estudiante de la IE Demo, crea entregas YA presentadas (con
//   resultados) de TODOS los cuadernillos de su grado, para que docente/directivo/Sabio/plan
//   muestren datos ricos. Usa el motor REAL: generarPlanAplicacion (barajado) + calcularResultados
//   (puntaje/nivel/aciertos), con un desempeño variado por estudiante que cubre todos los niveles.
//
// borrarDemos(): elimina SOLO los datos de demostración (aplicaciones/planes/permisos/mensajes
//   de la IE Demo), conservando cuentas y cuadernillos, para poder presentar las pruebas en vivo.
//
// NUNCA toca instituciones reales (todo está acotado a institucion_id === 'ie-demo') ni Firestore
// (la demo es 100% IndexedDB local).

import { db } from './db.js';
import { generarPlanAplicacion, fisherYates } from './shuffle.js';
import { calcularResultados } from './calculo.js';
import { uuid, nowIso } from './utils.js';
import { INSTITUCION_DEMO } from './perfiles-fijos.js';

const IE = INSTITUCION_DEMO.id; // 'ie-demo'
const COLS_DEMO = ['idea_aplicaciones', 'idea_planes_mejora', 'idea_permisos_reintento', 'idea_mensajes'];

const _clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ¿Un registro pertenece a la demo? Por institucion_id directo, o porque alguno de sus
// campos *_id apunta a un usuario de la IE Demo (planes/permisos/mensajes referencian al
// estudiante/usuario, no siempre traen institucion_id).
function _esDeDemo(item, demoUserIds) {
  if (!item) return false;
  if (item.institucion_id === IE) return true;
  for (const k of ['estudiante_id', 'usuario_id', 'de_id', 'para_id', 'remitente_id', 'destinatario_id', 'autor_id']) {
    if (item[k] && demoUserIds.has(item[k])) return true;
  }
  return false;
}

/** Borra SOLO los datos de demostración de la IE Demo. Conserva cuentas y cuadernillos. */
export async function borrarDemos(onLog = () => {}) {
  const usuarios = await db.lista('idea_usuarios');
  const demoUserIds = new Set(usuarios.filter(u => u.institucion_id === IE).map(u => u.id));
  let total = 0;
  for (const col of COLS_DEMO) {
    let items = [];
    try { items = await db.lista(col); } catch (_) { items = []; }
    for (const it of items) {
      if (_esDeDemo(it, demoUserIds)) { try { await db.eliminar(col, it.id); total++; } catch (_) {} }
    }
  }
  onLog(`🧹 Borradas ${total} entradas de demostración de ${IE} (cuentas y cuadernillos intactos).`);
  return total;
}

/**
 * Crea entregas de demostración para TODOS los estudiantes de la IE Demo, en TODAS las
 * pruebas de su grado. Limpia primero para no duplicar. Idempotente.
 * @returns {Promise<{entregas:number, estudiantes:number}>}
 */
export async function cargarDemosTodas(onLog = () => {}) {
  await db.inicializar();              // asegura perfiles fijos + cuadernillos sembrados
  await borrarDemos(onLog);            // limpiar antes (evita duplicados)

  const usuarios = await db.lista('idea_usuarios');
  const estudiantes = usuarios
    .filter(u => u.rol === 'estudiante' && u.institucion_id === IE)
    .sort((a, b) => (Number(a.grado) - Number(b.grado)) || String(a.usuario).localeCompare(String(b.usuario)));
  const cuadernillos = await db.lista('idea_cuadernillos');

  // Desempeño base por estudiante: se reparte en una escala que cubre todos los niveles
  // (BAJO / BÁSICO / ALTO / SUPERIOR). Con un poco de ruido por cuadernillo para que el
  // análisis por competencia/afirmación no salga plano.
  const BASES = [0.52, 0.66, 0.78, 0.9, 0.97];

  let entregas = 0, si = 0;
  for (const est of estudiantes) {
    const cuads = cuadernillos.filter(c => String(c.grado) === String(est.grado));
    const baseAcc = BASES[si % BASES.length]; si++;

    for (const c of cuads) {
      const preguntas = c.preguntas || [];
      if (!preguntas.length) continue;
      const plan = generarPlanAplicacion(c);                  // barajado REAL (respeta preservar_orden)
      const acc = _clamp(baseAcc + (Math.random() * 0.14 - 0.07), 0.25, 1);
      const nCorrect = Math.round(acc * preguntas.length);

      // Qué preguntas quedan correctas: barajamos índices y tomamos las primeras nCorrect,
      // para que la distribución de aciertos por competencia/afirmación varíe.
      const idxs = preguntas.map((_, i) => i);
      fisherYates(idxs);
      const correctSet = new Set(idxs.slice(0, nCorrect));

      const respuestas = preguntas.map((p, i) => {
        const correcto = correctSet.has(i);
        const incorrecta = Object.keys(p.opciones || {}).find(k => k !== p.clave) || p.clave;
        const real = correcto ? p.clave : incorrecta;
        return { pregunta_id: p.id, opcion_visual: real, opcion_elegida_real: real, tiempo_seg: 18 + Math.floor(Math.random() * 42) };
      });

      const base = {
        id: uuid(),
        estudiante_id: est.id, estudiante_nombre: est.nombre_completo,
        tipo_documento: est.tipo_documento || 'TI', numero_documento: est.numero_documento || '',
        institucion_id: est.institucion_id, sede_id: est.sede_id || null,
        grado: est.grado, grupo: est.grupo,
        cuadernillo_id: c.id, area: c.area, periodo: c.periodo,
        fecha_inicio: nowIso(), fecha_fin: nowIso(), fecha_envio: nowIso(), duracion_segundos: 300,
        orden_preguntas: plan.ordenPreguntas, orden_opciones: plan.ordenesOpciones,
        respuestas, estado: 'enviada', bloqueada: true, oficial: true, permiso_usado: null, intento_numero: 1
      };
      const calc = calcularResultados(base, c);
      await db.crear('idea_aplicaciones', { ...base, ...calc });
      entregas++;
    }
    onLog(`✓ ${est.nombre_completo} (${est.grado}°${est.grupo || ''}): ${cuads.length} pruebas`);
  }
  onLog(`✅ Listo: ${entregas} entregas de demostración en ${estudiantes.length} estudiantes.`);
  return { entregas, estudiantes: estudiantes.length };
}
