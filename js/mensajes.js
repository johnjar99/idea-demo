// mensajes.js — Mensajería docente↔estudiante con hilos de conversación.
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

export async function listarMensajesPara(userId) {
  const todos = await db.lista(COL);
  return todos
    .filter(m => m.para_id === userId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function listarMensajesEnviados(userId) {
  const todos = await db.lista(COL);
  return todos
    .filter(m => m.de_id === userId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function listarHilo(hiloId) {
  const todos = await db.lista(COL);
  return todos
    .filter(m => (m.hilo_id || m.id) === hiloId)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

export async function contarNoLeidos(userId) {
  const m = await listarMensajesPara(userId);
  return m.filter(x => !x.leido).length;
}

export async function marcarLeido(mensajeId) {
  return db.actualizar(COL, mensajeId, { leido: true });
}

export async function marcarTodosLeidos(userId) {
  const todos = await db.lista(COL);
  for (const m of todos) {
    if (m.para_id === userId && !m.leido) {
      await db.actualizar(COL, m.id, { leido: true });
    }
  }
}
