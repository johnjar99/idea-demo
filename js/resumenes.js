// resumenes.js — Resumenes AGREGADOS por grupo (coleccion `idea_resumenes`).
//
// POR QUE EXISTE
// Hasta hoy, resultado.html pintaba la comparativa "tu puntaje / promedio del grupo /
// mejor del grupo" leyendo TODAS las aplicaciones de la institucion del estudiante y
// filtrando en el navegador. Eso obliga a que un estudiante pueda leer las pruebas de
// sus companeros (y de toda su IE), que es justo lo que las reglas de seguridad cierran.
//
// La decision del dueno (8-ago-2026) fue: "un estudiante tiene solo acceso a las pruebas
// de su grado y de su grupo, no puede salir de ahi". Asi que la comparativa deja de
// calcularse leyendo pruebas ajenas y pasa a leer UN documento agregado que contiene
// SOLO numeros: promedio, conteo, maximo, minimo y reparto por nivel. Nunca un nombre,
// nunca un documento de identidad, nunca un estudiante_id.
//
// QUIEN ESCRIBE
// Nadie con rol estudiante. Escriben:
//   - el manager, con scripts/resumenes_grupo.mjs (recalculo completo);
//   - el personal de la propia IE (docente / directivo / funcionario) cuando abre su
//     panel, de forma oportunista y limitada (ver refrescarResumenes). Ese personal ya
//     puede leer las pruebas de su IE, asi que escribir un agregado correcto no le da
//     ningun privilegio nuevo, y mantiene el dato fresco sin tareas programadas.
//
// QUIEN LEE
// El estudiante lee UN solo documento: el de su institucion + sede + grado + grupo +
// cuadernillo. Las reglas comprueban que el grado y el grupo del documento son los suyos.
//
// IMPORTANTE: las funciones puras de este archivo (claveResumen, normalizarGrupo,
// calcularResumenes) estan DUPLICADAS a proposito en scripts/resumenes_grupo.mjs, porque
// Node no puede importar este modulo (arrastra el SDK de Firebase por URL del CDN).
// Si tocas una, toca la otra: el id del documento tiene que coincidir exactamente.

// DOS ENTORNOS, UNA SOLA TARJETA
// En produccion este modulo trabaja contra Firestore, como se describe arriba. En la pagina
// de prueba (idea-demo) NO hay Firestore: firebase-init.js exporta `fdb = null` a proposito,
// para que el sandbox no pueda hablar con la base real bajo ninguna circunstancia. Cuando
// esto se escribio, el modulo se propago tal cual al demo y la tarjeta comparativa quedo
// muerta alli para los tres periodos (regresion del 8-ago-2026).
//
// La solucion NO es abrir la lectura de pruebas ajenas en produccion. Es que el demo, que
// guarda todo en IndexedDB del propio navegador, calcule el agregado en el momento a partir
// de los datos que ya tiene: mismo calculo (calcularResumenes), misma forma de documento y
// misma tarjeta en pantalla, sin coleccion publicada y sin una sola lectura remota. En el
// demo eso no filtra nada de nadie porque no hay datos de personas reales; en produccion
// este camino NO se toma nunca, porque alli `fdb` existe.
import { fdb } from './firebase-init.js';
import { db } from './db.js';
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const COLECCION_RESUMENES = 'idea_resumenes';

// True en produccion y en localhost servido contra Firestore; false SOLO en el sandbox.
const HAY_FIRESTORE = !!fdb;

// Grupo normalizado: "a" y " A " son el mismo grupo. Igual que en docente.html.
export function normalizarGrupo(g) {
  return String(g ?? '').trim().toUpperCase();
}

// Trozo seguro para un id de documento de Firestore (sin '/', sin espacios, sin acentos
// ni simbolos como el '°' de "1°"). Determinista: la misma entrada da siempre lo mismo.
// Quita las tildes sin escribir el rango de marcas combinantes literal en el codigo
// (que se corrompe con facilidad al reguardar el archivo con otra codificacion).
function _sinTildes(s) {
  return Array.from(String(s).normalize('NFD'))
    .filter(ch => { const c = ch.codePointAt(0); return c < 0x300 || c > 0x36f; })
    .join('');
}
function _trozo(v) {
  const s = String(v ?? '').trim();
  if (!s) return '_';
  return _sinTildes(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) || '_';
}

/**
 * Id determinista del resumen. Lo calculan igual el navegador y el script de Node.
 * Ejes: institucion · sede · grado · grupo · cuadernillo (el cuadernillo ya lleva
 * dentro el area y el periodo, asi que no hacen falta como ejes del id).
 */
export function claveResumen({ institucion_id, sede_id, grado, grupo, cuadernillo_id }) {
  return [
    _trozo(institucion_id),
    _trozo(sede_id),
    _trozo(grado),
    _trozo(normalizarGrupo(grupo)),
    _trozo(cuadernillo_id)
  ].join('__');
}

const NIVELES = ['BAJO', 'BASICO', 'ALTO', 'SUPERIOR'];
const _nivelClave = (n) => _sinTildes(String(n ?? '').trim().toUpperCase());

// De varias entregas del MISMO estudiante y cuadernillo vale UNA: la mas reciente con
// permiso de reintento autorizado y, si ninguna lo uso, la primera. Es la misma regla de
// integridad de docente.html y de la comparativa que habia en resultado.html, para que el
// promedio del agregado coincida con el que ve el docente.
const _ts = (a) => new Date(a.fecha_envio || a.fecha_fin || a.fecha_creacion || 0).getTime();
function _unaPorEstudiante(lista) {
  const m = new Map();
  for (const a of lista) {
    const k = `${a.estudiante_id || a.estudiante_nombre}-${a.cuadernillo_id}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(a);
  }
  return [...m.values()].map(l => {
    const cp = l.filter(x => x.permiso_usado);
    if (cp.length) return cp.sort((x, y) => _ts(y) - _ts(x))[0];
    return l.slice().sort((x, y) => _ts(x) - _ts(y))[0];
  });
}

/**
 * A partir de una lista de aplicaciones ENVIADAS devuelve los documentos de resumen.
 * Cada documento contiene SOLO agregados. No sale de aqui ningun dato de una persona.
 * @param {Array} aplicaciones aplicaciones con estado 'enviada'
 * @param {Object} fichasCuadernillo mapa id -> { area, periodo, nombre } (opcional)
 */
export function calcularResumenes(aplicaciones, fichasCuadernillo = {}) {
  const enviadas = (aplicaciones || []).filter(a => a && a.estado === 'enviada' && typeof a.puntaje === 'number');
  const cubos = new Map();
  for (const a of _unaPorEstudiante(enviadas)) {
    const eje = {
      institucion_id: a.institucion_id || null,
      sede_id: a.sede_id || null,
      grado: String(a.grado ?? ''),
      grupo: normalizarGrupo(a.grupo),
      cuadernillo_id: a.cuadernillo_id || ''
    };
    if (!eje.institucion_id || !eje.cuadernillo_id) continue;
    const id = claveResumen(eje);
    if (!cubos.has(id)) cubos.set(id, { eje, puntajes: [], niveles: {} });
    const c = cubos.get(id);
    c.puntajes.push(a.puntaje);
    const nk = _nivelClave(a.nivel);
    if (NIVELES.includes(nk)) c.niveles[nk] = (c.niveles[nk] || 0) + 1;
  }

  const out = [];
  for (const [id, c] of cubos) {
    const p = c.puntajes;
    const suma = p.reduce((s, v) => s + v, 0);
    const por_nivel = {};
    NIVELES.forEach(n => { por_nivel[n] = c.niveles[n] || 0; });
    const ficha = fichasCuadernillo[c.eje.cuadernillo_id] || {};
    out.push({
      id,
      ...c.eje,
      area: ficha.area ?? null,
      periodo: ficha.periodo ?? null,
      n: p.length,
      promedio: Math.round(suma / p.length),
      mejor: Math.max(...p),
      minimo: Math.min(...p),
      por_nivel,
      actualizado: new Date().toISOString()
    });
  }
  return out;
}

/**
 * Lee EL resumen del grupo del estudiante. Una sola lectura, un solo documento.
 * Devuelve null si aun no existe (grupo recien estrenado): quien llama debe ocultar
 * la comparativa, igual que hoy cuando el grupo tiene una sola entrega.
 */
export async function obtenerResumenGrupo(eje) {
  if (!HAY_FIRESTORE) return resumenGrupoLocal(eje);

  // Se intenta con la sede del perfil y, si no hay documento, SIN sede. Hay pruebas
  // antiguas en produccion que no traen sede_id: para esos grupos el resumen se archiva
  // bajo la clave sin sede, y sin este segundo intento el estudiante no veria su
  // comparativa. Las reglas permiten las dos lecturas igual (comprueban institucion,
  // grado y grupo, no la sede), asi que no se abre nada con esto.
  const claves = [claveResumen(eje)];
  if (eje.sede_id) claves.push(claveResumen({ ...eje, sede_id: null }));
  for (const clave of claves) {
    try {
      const snap = await getDoc(doc(fdb, COLECCION_RESUMENES, clave));
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (e) {
      // OJO: aqui NO se puede devolver. Un documento que todavia no existe da
      // permission-denied (las reglas desreferencian resource.data y con resource == null
      // la evaluacion falla), asi que salir en el catch dejaba la segunda clave —la que
      // cubre las pruebas antiguas sin sede_id— como codigo muerto. Se anota y se sigue
      // probando; si ninguna clave da documento, se devuelve null al final.
      console.warn('[resumenes] no se pudo leer el resumen del grupo con la clave', clave, ':', e.code || e.message);
    }
  }
  return null;
}

/**
 * SANDBOX (idea-demo). Calcula el agregado del grupo en el momento, desde IndexedDB.
 * Devuelve exactamente la misma forma de documento que produce calcularResumenes(), para
 * que resultado.html pinte la tarjeta sin enterarse de en que entorno esta.
 *
 * Se lee por cuadernillo (consulta dirigida, no la coleccion entera) y se acota despues al
 * grupo del estudiante. La sede NO entra en el filtro: hay pruebas sembradas sin sede_id y
 * exigirla dejaria la tarjeta vacia, que es justo el sintoma que se esta corrigiendo.
 */
async function resumenGrupoLocal(eje) {
  try {
    const grado = String(eje.grado ?? '');
    const grupo = normalizarGrupo(eje.grupo);
    const delCuadernillo = await db.consultarPorCampo('idea_aplicaciones', 'cuadernillo_id', eje.cuadernillo_id);
    const delGrupo = (delCuadernillo || []).filter(a =>
      a && a.estado === 'enviada'
      && (!eje.institucion_id || a.institucion_id === eje.institucion_id)
      && String(a.grado ?? '') === grado
      && normalizarGrupo(a.grupo) === grupo
    );
    if (!delGrupo.length) return null;
    // Se reutiliza el MISMO calculo que publica produccion (una entrega por estudiante,
    // promedio, mejor, minimo y reparto por nivel), asi que los numeros de la tarjeta son
    // los mismos que veria el estudiante si el agregado estuviera publicado. Se uniforman
    // institucion y sede para que las entregas caigan TODAS en un solo cubo: si no, unas
    // pruebas con sede y otras sin ella darian dos agregados y la tarjeta mostraria solo
    // medio grupo.
    const uniformes = delGrupo.map(a => ({
      ...a,
      institucion_id: eje.institucion_id || a.institucion_id || '_',
      sede_id: eje.sede_id ?? null
    }));
    const [resumen] = calcularResumenes(uniformes, {});
    if (!resumen) return null;
    return { ...resumen, id: claveResumen(eje) };
  } catch (e) {
    console.warn('[resumenes] no se pudo calcular el resumen local del grupo:', e && (e.code || e.message));
    return null;
  }
}

// --- Refresco oportunista desde los paneles del personal --------------------------
// Se llama con las aplicaciones ENVIADAS que el panel ya tiene en memoria, asi que no
// cuesta ni una lectura extra de aplicaciones. Solo escribe los resumenes que han
// CAMBIADO, y como mucho una vez cada TTL por navegador, para no gastar escrituras.
const _CK_TTL = 'idea_resumenes_ts';
const _TTL_REFRESCO = 30 * 60 * 1000; // 30 min

function _mismos(a, b) {
  if (!a || !b) return false;
  if (a.n !== b.n || a.promedio !== b.promedio || a.mejor !== b.mejor || a.minimo !== b.minimo) return false;
  return NIVELES.every(k => (a.por_nivel?.[k] || 0) === (b.por_nivel?.[k] || 0));
}

/**
 * @param {Object} ses sesion (rol, institucion_id)
 * @param {Array}  aplicacionesEnviadas aplicaciones de SU institucion, ya en memoria
 * @param {Object} fichasCuadernillo mapa id -> ficha (para guardar area y periodo)
 * @param {Object} opts { forzar:boolean }
 */
export async function refrescarResumenes(ses, aplicacionesEnviadas, fichasCuadernillo = {}, opts = {}) {
  // En el sandbox no hay nada que publicar: obtenerResumenGrupo() calcula el agregado en el
  // momento desde IndexedDB, asi que la coleccion `idea_resumenes` no hace falta. Se sale
  // limpio y sin console.warn, en vez de intentar un writeBatch contra `fdb = null`.
  if (!HAY_FIRESTORE) return { escritos: 0, motivo: 'sandbox: el resumen se calcula al leerlo' };
  if (!ses || ses.rol === 'estudiante') return { escritos: 0, motivo: 'rol no autorizado' };
  if (!ses.institucion_id) return { escritos: 0, motivo: 'sin institucion' };
  if (!opts.forzar) {
    try {
      const ts = +(localStorage.getItem(_CK_TTL + '_' + ses.institucion_id)) || 0;
      if (ts && (Date.now() - ts) < _TTL_REFRESCO) return { escritos: 0, motivo: 'fresco' };
    } catch (_) {}
  }

  const calculados = calcularResumenes(aplicacionesEnviadas, fichasCuadernillo)
    .filter(r => r.institucion_id === ses.institucion_id);
  if (!calculados.length) return { escritos: 0, motivo: 'nada que calcular' };

  // Lo que ya hay publicado para esta IE: UNA consulta, para escribir solo lo distinto.
  let actuales = new Map();
  try {
    const snap = await getDocs(query(collection(fdb, COLECCION_RESUMENES),
      where('institucion_id', '==', ses.institucion_id)));
    actuales = new Map(snap.docs.map(d => [d.id, d.data()]));
  } catch (e) {
    console.warn('[resumenes] no se pudieron leer los resumenes actuales:', e.code || e.message);
  }

  const pendientes = calculados.filter(r => !_mismos(r, actuales.get(r.id)));
  try {
    for (let i = 0; i < pendientes.length; i += 400) {
      const batch = writeBatch(fdb);
      for (const r of pendientes.slice(i, i + 400)) {
        batch.set(doc(fdb, COLECCION_RESUMENES, r.id), r);
      }
      await batch.commit();
    }
    try { localStorage.setItem(_CK_TTL + '_' + ses.institucion_id, String(Date.now())); } catch (_) {}
    return { escritos: pendientes.length, total: calculados.length };
  } catch (e) {
    // Nunca debe romper un panel: si las reglas lo rechazan, se anota y se sigue.
    console.warn('[resumenes] no se pudieron publicar los resumenes:', e.code || e.message);
    return { escritos: 0, motivo: e.code || e.message };
  }
}
