// mensajes.js - Mensajería docente↔estudiante con hilos de conversación.
// Cada mensaje: { id, hilo_id?, de_id, de_nombre, para_id, asunto?, texto, fecha, leido, plantilla? }
// hilo_id permite agrupar respuestas. Si un mensaje no especifica hilo_id, su id es la raíz del hilo.

import { db } from './db.js';
import { uuid, nowIso } from './utils.js';

const COL = 'idea_mensajes';

// Plantillas predefinidas para el docente
export const PLANTILLAS_DOCENTE = [
  {
    id: 'felicitacion',
    icono: '🎉',
    asunto: '¡Felicitaciones por tu desempeño!',
    texto: 'Hola, quería felicitarte por tu desempeño en la última prueba IDEA. El resultado refleja tu esfuerzo y compromiso. Sigue así: te invito a que sigas alimentando esa motivación con problemas de mayor reto.'
  },
  {
    id: 'refuerzo',
    icono: '💪',
    asunto: 'Recomendación de refuerzo',
    texto: 'Hola, revisé tu resultado en la prueba IDEA y noté oportunidades de mejora en tu competencia más débil. Te recomiendo dedicar 30 minutos diarios a los recursos que te dejé en tu panel y vendrás conmigo en horario de tutoría esta semana para revisarlos juntos.'
  },
  {
    id: 'reintento',
    icono: '🔓',
    asunto: 'Nuevo intento autorizado',
    texto: 'He habilitado un nuevo intento de la prueba IDEA en tu panel. Lo verás como "Nuevo intento habilitado". Tómalo con calma cuando te sientas preparado.'
  },
  {
    id: 'tutoria',
    icono: '📅',
    asunto: 'Citación a tutoría',
    texto: 'Te cito a tutoría individual esta semana en horario de descanso para revisar tu resultado y diseñar juntos un plan personalizado. Confirma por favor el día que mejor te funcione.'
  }
];

export async function enviarMensaje(deUserId, deNombre, paraUserId, texto, asunto = '', extras = {}) {
  if (!deUserId || !paraUserId || !texto) throw new Error('Datos incompletos');
  const msg = {
    id: uuid(),
    hilo_id: extras.hilo_id || null,
    de_id: deUserId,
    de_nombre: deNombre,
    para_id: paraUserId,
    asunto: String(asunto || '').slice(0, 200),
    texto: String(texto).slice(0, 2000),
    fecha: nowIso(),
    leido: false,
    plantilla: extras.plantilla || null
  };
  // Si no hay hilo_id, este mensaje inicia un hilo nuevo
  if (!msg.hilo_id) msg.hilo_id = msg.id;
  return db.crear(COL, msg);
}

export async function responderEnHilo(deUserId, deNombre, mensajeOriginal, texto) {
  return enviarMensaje(deUserId, deNombre, mensajeOriginal.de_id, texto,
    'Re: ' + (mensajeOriginal.asunto || 'Mensaje'),
    { hilo_id: mensajeOriginal.hilo_id || mensajeOriginal.id });
}

// CONSULTAS ACOTADAS AL DESTINATARIO O AL REMITENTE (8-ago-2026).
//
// Antes, las cuatro funciones de abajo hacian `db.lista(COL)` —un listado de TODA la
// coleccion— y filtraban en el navegador. Con las reglas nuevas eso lanza
// PERMISSION_DENIED en cada carga de estudiante.html y cuadernillo.html, como excepcion
// no capturada, y deja la mensajeria y la campana de notificaciones muertas para todos
// los roles salvo el manager.
//
// La regla de idea_mensajes permite leer un mensaje si `de_id == miUid()` o
// `para_id == miUid()` (o si eres manager). Firestore evalua `list` documento a
// documento sobre lo que devuelve la consulta: un listado sin filtro incluye mensajes
// ajenos y cae entero, pero una consulta `where('para_id','==',<yo>)` devuelve solo
// documentos que cumplen la regla y pasa. Por eso el filtro se baja al servidor con
// db.consultarPorCampo, que en produccion es un where() y en el sandbox es el mismo
// filtro sobre IndexedDB. Son igualdades de un solo campo: usan el indice automatico de
// Firestore y NO hacen falta indices compuestos (el orden por fecha se sigue haciendo
// aqui, en memoria, sobre un conjunto ya pequeno).
const _porFechaDesc = (a, b) => new Date(b.fecha) - new Date(a.fecha);
const _porFechaAsc  = (a, b) => new Date(a.fecha) - new Date(b.fecha);

export async function listarMensajesPara(userId) {
  if (!userId) return [];
  const mios = await db.consultarPorCampo(COL, 'para_id', userId);
  return mios.filter(m => m.para_id === userId).sort(_porFechaDesc);
}

export async function listarMensajesEnviados(userId) {
  if (!userId) return [];
  const mios = await db.consultarPorCampo(COL, 'de_id', userId);
  return mios.filter(m => m.de_id === userId).sort(_porFechaDesc);
}

/**
 * Un hilo es una conversacion entre DOS personas, asi que todo mensaje del hilo tiene a
 * `userId` como remitente o como destinatario. Se piden las dos mitades por separado —las
 * dos consultas estan permitidas por las reglas— y se unen aqui. Consultar por `hilo_id`
 * seria una sola lectura, pero devolveria documentos sin garantia de pertenecer al
 * usuario, y esa es exactamente la clase de consulta que las reglas rechazan.
 */
export async function listarHilo(hiloId, userId) {
  if (!hiloId) return [];
  const [recibidos, enviados] = await Promise.all([
    listarMensajesPara(userId),
    listarMensajesEnviados(userId)
  ]);
  const unicos = new Map();
  for (const m of [...recibidos, ...enviados]) {
    if ((m.hilo_id || m.id) === hiloId) unicos.set(m.id, m);
  }
  return [...unicos.values()].sort(_porFechaAsc);
}

export async function contarNoLeidos(userId) {
  const m = await listarMensajesPara(userId);
  return m.filter(x => !x.leido).length;
}

export async function marcarLeido(mensajeId) {
  return db.actualizar(COL, mensajeId, { leido: true });
}

export async function marcarTodosLeidos(userId) {
  if (!userId) return;
  // Solo los MIOS y solo los no leidos: la consulta ya viene acotada por `para_id`, que es
  // ademas el unico campo que las reglas dejan tocar al destinatario (soloCambia(['leido'])).
  const mios = await listarMensajesPara(userId);
  for (const m of mios) {
    if (!m.leido) await db.actualizar(COL, m.id, { leido: true });
  }
}
