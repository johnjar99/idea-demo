// permisos.js — Sistema de habilitación de reintentos de prueba.
//
// Regla central: cada estudiante puede presentar UNA SOLA vez cada cuadernillo.
// Para presentar de nuevo necesita un permiso explícito otorgado por docente/directivo/funcionario.
// El permiso se "consume" cuando el estudiante envía la nueva prueba.
//
// Colecciones de localStorage involucradas:
//   - idea_aplicaciones: cada prueba presentada (estado: 'en_curso' | 'enviada')
//   - idea_permisos_reintento: vales para presentar otra vez
//
// Funciones públicas:
//   - puedeEstudianteIniciarPrueba(estudianteId, cuadernilloId) → { permitido, razon, permisoId? }
//   - otorgarPermisoReintento(estudianteId, cuadernilloId, otorgadoPorId, razon)
//   - consumirPermiso(permisoId)
//   - listarPermisosVigentes(filtro?)
//   - revocarPermiso(permisoId)
//   - aplicacionVigenteEnCurso(estudianteId, cuadernilloId) → aplicacion | null
//   - aplicacionOficial(estudianteId, cuadernilloId) → aplicacion | null

import { db } from './db.js';
import { uuid, nowIso } from './utils.js';

const COL_PERMISOS = 'idea_permisos_reintento';
const COL_APS = 'idea_aplicaciones';

/**
 * Determina si un estudiante puede iniciar (o continuar) una prueba de un cuadernillo.
 * @returns {Promise<{permitido: boolean, razon: string, permisoId?: string, retomar?: Aplicacion}>}
 */
export async function puedeEstudianteIniciarPrueba(estudianteId, cuadernilloId, opts = {}) {
  // Lectura DIRIGIDA por estudiante_id (solo las pruebas de este estudiante, no toda la
  // colección). El panel del estudiante puede pasar `opts.appsEstudiante` y
  // `opts.permisosEstudiante` ya cargados para NO releer una vez por cuadernillo.
  const appsEst = opts.appsEstudiante || await db.consultarPorCampo(COL_APS, 'estudiante_id', estudianteId);
  const propias = appsEst.filter(a => a.estudiante_id === estudianteId && a.cuadernillo_id === cuadernilloId);

  // 1. Si tiene una aplicación 'en_curso', retomarla.
  const enCurso = propias.find(a => a.estado === 'en_curso');
  if (enCurso) {
    return { permitido: true, razon: 'retomar', retomar: enCurso };
  }

  // 2. Si NO tiene aplicación enviada todavía, primer intento permitido.
  const enviadas = propias.filter(a => a.estado === 'enviada');
  if (enviadas.length === 0) {
    return { permitido: true, razon: 'primer_intento' };
  }

  // 3. Si ya tiene aplicaciones enviadas, necesita permiso vigente.
  const permisos = opts.permisosEstudiante || await db.consultarPorCampo(COL_PERMISOS, 'estudiante_id', estudianteId);
  const vigente = permisos.find(p =>
    p.estudiante_id === estudianteId &&
    p.cuadernillo_id === cuadernilloId &&
    p.vigente === true &&
    !p.consumido
  );
  if (vigente) {
    return { permitido: true, razon: 'permiso_vigente', permisoId: vigente.id };
  }

  return {
    permitido: false,
    razon: 'sin_permiso',
    detalle: `Ya presentaste esta prueba ${enviadas.length} vez(ces). Solicita a tu docente que habilite un nuevo intento.`
  };
}

/**
 * El docente/directivo otorga un permiso de reintento a un estudiante.
 */
export async function otorgarPermisoReintento(estudianteId, cuadernilloId, otorgadoPorId, razon = '') {
  if (!estudianteId || !cuadernilloId || !otorgadoPorId) {
    throw new Error('Datos incompletos para otorgar permiso');
  }
  // Si ya hay un permiso vigente para esta combinación, no crear duplicado
  const todos = await db.lista(COL_PERMISOS);
  const yaVigente = todos.find(p =>
    p.estudiante_id === estudianteId &&
    p.cuadernillo_id === cuadernilloId &&
    p.vigente === true &&
    !p.consumido
  );
  if (yaVigente) return yaVigente;

  const permiso = {
    id: uuid(),
    estudiante_id: estudianteId,
    cuadernillo_id: cuadernilloId,
    otorgado_por_id: otorgadoPorId,
    fecha_otorgado: nowIso(),
    razon: String(razon || '').slice(0, 500),
    vigente: true,
    consumido: false,
    fecha_consumido: null,
    aplicacion_resultante_id: null
  };
  return db.crear(COL_PERMISOS, permiso);
}

/**
 * Marca un permiso como consumido y guarda referencia a la aplicación resultante.
 */
export async function consumirPermiso(permisoId, aplicacionResultanteId) {
  if (!permisoId) return null;
  return db.actualizar(COL_PERMISOS, permisoId, {
    vigente: false,
    consumido: true,
    fecha_consumido: nowIso(),
    aplicacion_resultante_id: aplicacionResultanteId || null
  });
}

/**
 * Lista los permisos según un filtro opcional.
 */
export async function listarPermisosVigentes(filtro = {}) {
  const todos = await db.lista(COL_PERMISOS);
  return todos.filter(p => {
    if (filtro.solo_vigentes && (!p.vigente || p.consumido)) return false;
    if (filtro.estudiante_id && p.estudiante_id !== filtro.estudiante_id) return false;
    if (filtro.cuadernillo_id && p.cuadernillo_id !== filtro.cuadernillo_id) return false;
    if (filtro.otorgado_por_id && p.otorgado_por_id !== filtro.otorgado_por_id) return false;
    return true;
  });
}

/**
 * Revoca un permiso vigente antes de ser consumido.
 */
export async function revocarPermiso(permisoId) {
  return db.actualizar(COL_PERMISOS, permisoId, {
    vigente: false,
    fecha_revocado: nowIso()
  });
}

/**
 * Devuelve la aplicación 'en_curso' actual del estudiante para un cuadernillo, si existe.
 */
export async function aplicacionVigenteEnCurso(estudianteId, cuadernilloId) {
  const todas = await db.lista(COL_APS);
  return todas.find(a =>
    a.estudiante_id === estudianteId &&
    a.cuadernillo_id === cuadernilloId &&
    a.estado === 'en_curso'
  ) || null;
}

/**
 * Aplicación oficial = la enviada más reciente con bandera `oficial: true`,
 * o en su defecto la enviada más reciente.
 */
export async function aplicacionOficial(estudianteId, cuadernilloId) {
  const todas = await db.lista(COL_APS);
  const enviadas = todas
    .filter(a => a.estudiante_id === estudianteId && a.cuadernillo_id === cuadernilloId && a.estado === 'enviada')
    .sort((a, b) => new Date(b.fecha_envio || b.fecha_fin) - new Date(a.fecha_envio || a.fecha_fin));
  if (enviadas.length === 0) return null;
  const marcada = enviadas.find(a => a.oficial === true);
  return marcada || enviadas[0];
}

/**
 * Marca una aplicación como oficial y desmarca cualquier otra anterior del mismo estudiante+cuadernillo.
 */
export async function marcarAplicacionOficial(aplicacionId) {
  const ap = await db.obtener(COL_APS, aplicacionId);
  if (!ap) return null;
  const todas = await db.filtrar(COL_APS, a =>
    a.estudiante_id === ap.estudiante_id && a.cuadernillo_id === ap.cuadernillo_id
  );
  // Escrituras rápidas (1 viaje c/u). La recién enviada normalmente ya viene marcada
  // oficial desde el envío; aquí se asegura y se desmarcan las anteriores.
  for (const x of todas) {
    if (x.id === aplicacionId) {
      if (!x.oficial) await db.actualizarRapido(COL_APS, x.id, { oficial: true });
    } else if (x.oficial) {
      await db.actualizarRapido(COL_APS, x.id, { oficial: false });
    }
  }
  return aplicacionId;
}

/**
 * Estados válidos del flujo de aplicación.
 */
export const ESTADOS_APLICACION = Object.freeze({
  EN_CURSO: 'en_curso',
  ENVIADA: 'enviada'
});
