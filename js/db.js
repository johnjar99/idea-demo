// db.js — ADAPTADOR LOCAL (sandbox idea-demo) sobre IndexedDB.
//
// Reemplaza al db.js de Firestore SIN cambiar la interfaz pública: las páginas
// (estudiante/docente/directivo/manager/cuadernillo/resultado/plan-mejora) siguen
// llamando db.lista / db.obtener / db.crear / db.actualizar / db.eliminar / db.filtrar /
// db.consultarPorCampo / db.actualizarRapido / db.guardarLista / db.inicializar exactamente igual.
//
// TODO vive en IndexedDB del navegador → es IMPOSIBLE que toque la base de producción
// (instrumentoidea.com / Firestore). Esta es la garantía de aislamiento del sandbox.
//
// Siembra (db.inicializar): a diferencia de producción (no-op), aquí SÍ sembramos en la
// primera carga: cuadernillos (los 35 P2 propio + 5 vivos 11°P1, leídos de datos/_release.json),
// instituciones (datos/instituciones.json + IE Demo) y los perfiles fijos de demostración.

import { uuid, nowIso } from './utils.js';
import { asegurarPerfilesFijos, INSTITUCION_DEMO } from './perfiles-fijos.js';

const DB_NAME = 'idea_demo';
const DB_VERSION = 1;

const COLECCIONES = [
  'idea_usuarios',
  'idea_cuadernillos',
  'idea_instituciones',
  'idea_aplicaciones',
  'idea_planes_mejora',
  'idea_permisos_reintento',
  'idea_mensajes',
  'idea_tour_completado'
];

// --- IndexedDB: wrapper mínimo promisificado -----------------------------------------
let _dbPromise = null;
function abrir() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      for (const c of COLECCIONES) {
        if (!idb.objectStoreNames.contains(c)) idb.createObjectStore(c, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}
function _tx(store, modo) {
  return abrir().then(idb => idb.transaction(store, modo).objectStore(store));
}
function _prom(req) {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
async function idbGetAll(store) { return _prom((await _tx(store, 'readonly')).getAll()); }
async function idbGet(store, id) { return _prom((await _tx(store, 'readonly')).get(id)); }
async function idbPut(store, obj) { return _prom((await _tx(store, 'readwrite')).put(obj)); }
async function idbDel(store, id) { return _prom((await _tx(store, 'readwrite')).delete(id)); }
async function idbClear(store) { return _prom((await _tx(store, 'readwrite')).clear()); }

// Caché en memoria por colección (se llena en la primera lectura, se invalida al escribir).
// Da velocidad dentro de una misma carga de página sin arriesgar datos añejos: cada
// navegación es una recarga completa, así que la memoria arranca vacía y se relee fresco.
const _mem = {};
function _invalidar(coleccion) { delete _mem[coleccion]; }

// --- Schema mínimo de cuadernillo (idéntico a producción) ----------------------------
function validarCuadernillo(c) {
  if (!c || typeof c !== 'object') return { ok: false, msg: 'Cuadernillo vacío o inválido' };
  if (!c.id || !c.area || !c.grado) return { ok: false, msg: 'Faltan id/area/grado' };
  if (!Array.isArray(c.preguntas) || c.preguntas.length === 0) return { ok: false, msg: 'Sin preguntas' };
  const LETRAS_VALIDAS = ['A','B','C','D','E','F','G'];
  for (const p of c.preguntas) {
    if (!p.id || !p.clave) return { ok: false, msg: `Pregunta ${p.numero||'?'} mal formada (falta id/clave)` };
    if (!LETRAS_VALIDAS.includes(p.clave)) return { ok: false, msg: `Pregunta ${p.numero} clave inválida (${p.clave})` };
    const opc = p.opciones;
    if (!opc || typeof opc !== 'object') return { ok: false, msg: `Pregunta ${p.numero}: opciones ausentes` };
    const llaves = Array.isArray(opc) ? opc.map((_, i) => LETRAS_VALIDAS[i]) : Object.keys(opc).sort();
    if (llaves.length < 3 || llaves.length > 7) return { ok: false, msg: `Pregunta ${p.numero}: deben ser entre 3 y 7 opciones (tiene ${llaves.length})` };
    if (!llaves.includes(p.clave)) return { ok: false, msg: `Pregunta ${p.numero}: la clave "${p.clave}" no está en las opciones (${llaves.join(',')})` };
  }
  if (!c.competencias || !c.afirmaciones) return { ok: false, msg: 'Faltan competencias/afirmaciones' };
  return { ok: true };
}

// --- Siembra inicial (solo si la base está vacía) ------------------------------------
// Versión de contenido: súbela cuando cambien los cuadernillos/instituciones para que un
// visitante que ya abrió el demo re-siembre automáticamente (sin tener que limpiar el navegador).
const SEED_VERSION = '2026-06-26-dce-competencias';
let _sembrado = null;
async function sembrarSiVacio() {
  let verPrev = null;
  try { verPrev = localStorage.getItem('idea_demo_seed_version'); } catch (_) {}
  const reseed = verPrev !== SEED_VERSION;

  // 1) Cuadernillos: leer manifiesto datos/_release.json y cargar los servibles
  //    (estado local | web | vivo). Son los 35 P2 propio + 5 vivos de 11°P1.
  const cuadActuales = await idbGetAll('idea_cuadernillos');
  if (reseed && cuadActuales.length) { await idbClear('idea_cuadernillos'); _invalidar('idea_cuadernillos'); }
  if (!cuadActuales.length || reseed) {
    try {
      const rel = await fetch('datos/_release.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
      const ents = Object.entries((rel && rel.cuadernillos) || {})
        .filter(([, e]) => ['local', 'web', 'vivo'].includes(e.estado));
      for (const [, e] of ents) {
        try {
          const c = await fetch('datos/' + e.archivo, { cache: 'no-store' }).then(r => r.json());
          if (c && c.id) await idbPut('idea_cuadernillos', c);
        } catch (_) {}
      }
    } catch (_) {}
    _invalidar('idea_cuadernillos');
  }

  // 2) Instituciones: datos/instituciones.json + IE Demo
  const instActuales = await idbGetAll('idea_instituciones');
  if (reseed && instActuales.length) { await idbClear('idea_instituciones'); _invalidar('idea_instituciones'); }
  if (!instActuales.length || reseed) {
    let base = [];
    try { base = await fetch('datos/instituciones.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []); } catch (_) {}
    if (!Array.isArray(base)) base = [];
    if (!base.some(i => i.id === INSTITUCION_DEMO.id)) base.push(INSTITUCION_DEMO);
    for (const i of base) { if (i && i.id) await idbPut('idea_instituciones', i); }
    _invalidar('idea_instituciones');
  }

  // Marca la versión de contenido ya sembrada (para no re-sembrar en cada carga).
  try { localStorage.setItem('idea_demo_seed_version', SEED_VERSION); } catch (_) {}
}

// === Interfaz pública (idéntica a la versión Firestore) ==============================
export const db = {
  async lista(coleccion) {
    if (_mem[coleccion]) return _mem[coleccion];
    const arr = await idbGetAll(coleccion);
    _mem[coleccion] = arr;
    return arr;
  },

  // Alias para compatibilidad: en Firestore _listaBase saltaba el overlay. Aquí no hay overlay.
  async _listaBase(coleccion) { return this.lista(coleccion); },

  async guardarLista(coleccion, arr) {
    const lista = Array.isArray(arr) ? arr : [];
    await idbClear(coleccion);
    for (const item of lista) {
      const obj = { ...item, id: item.id || uuid() };
      await idbPut(coleccion, obj);
    }
    _invalidar(coleccion);
  },

  async obtener(coleccion, id) {
    if (!id) return null;
    const hit = await idbGet(coleccion, id);
    return hit || null;
  },

  async crear(coleccion, obj) {
    const nuevo = { ...obj };
    if (!nuevo.id) nuevo.id = uuid();
    if (!nuevo.fecha_creacion) nuevo.fecha_creacion = nowIso();
    await idbPut(coleccion, nuevo);
    _invalidar(coleccion);
    return nuevo;
  },

  async actualizar(coleccion, id, parche) {
    const actual = await idbGet(coleccion, id);
    if (!actual) return null;
    const out = { ...actual, ...parche, id, fecha_actualizacion: nowIso() };
    await idbPut(coleccion, out);
    _invalidar(coleccion);
    return out;
  },

  // Actualización RÁPIDA: el documento debe existir (como updateDoc en Firestore).
  async actualizarRapido(coleccion, id, parche) {
    const actual = await idbGet(coleccion, id);
    if (!actual) throw new Error(`actualizarRapido: ${coleccion}/${id} no existe`);
    await idbPut(coleccion, { ...actual, ...parche, id, fecha_actualizacion: nowIso() });
    _invalidar(coleccion);
  },

  async eliminar(coleccion, id) {
    const actual = await idbGet(coleccion, id);
    if (!actual) return false;
    await idbDel(coleccion, id);
    _invalidar(coleccion);
    return true;
  },

  async filtrar(coleccion, predicado) {
    const arr = await this.lista(coleccion);
    return arr.filter(predicado);
  },

  // Lectura DIRIGIDA: misma semántica que producción (campo === valor; vacío → lista completa).
  async consultarPorCampo(coleccion, campo, valor) {
    if (valor === undefined || valor === null || valor === '') return this.lista(coleccion);
    const arr = await this.lista(coleccion);
    return arr.filter(x => x[campo] === valor);
  },

  // En el sandbox SÍ sembramos en la primera carga (idempotente entre páginas).
  async inicializar() {
    if (!_sembrado) {
      _sembrado = (async () => {
        await sembrarSiVacio();
        try { await asegurarPerfilesFijos(); } catch (e) { console.warn('[idea-demo] perfiles-fijos:', e && e.message); }
      })();
    }
    return _sembrado;
  },

  validarCuadernillo,

  // === Backup / Restore (usan la interfaz pública) ===
  async exportarBackup() {
    const backup = { version: '1.0', fecha: nowIso(), colecciones: {} };
    for (const c of COLECCIONES) backup.colecciones[c] = await this.lista(c);
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `idea_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    return backup;
  },

  async analizarBackup(backupJson) {
    let backup;
    try { backup = typeof backupJson === 'string' ? JSON.parse(backupJson) : backupJson; }
    catch (e) { throw new Error('JSON inválido: ' + e.message); }
    if (!backup.colecciones || typeof backup.colecciones !== 'object') throw new Error('Backup mal formado: falta nodo "colecciones"');
    const resumen = [];
    for (const c of COLECCIONES) {
      const nuevos = Array.isArray(backup.colecciones[c]) ? backup.colecciones[c].length : 0;
      const actuales = (await this.lista(c)).length;
      resumen.push({ coleccion: c, actuales, nuevos, sera_sobreescrita: nuevos > 0 });
    }
    const cuads = backup.colecciones['idea_cuadernillos'];
    const errores = [];
    if (Array.isArray(cuads)) for (const c of cuads) { const v = validarCuadernillo(c); if (!v.ok) errores.push(`Cuadernillo "${c.id || '?'}": ${v.msg}`); }
    return { fecha: backup.fecha || null, version: backup.version || null, resumen, errores, es_valido: errores.length === 0, backup_object: backup };
  },

  async importarBackup(backupJson) {
    const analisis = await this.analizarBackup(backupJson);
    if (!analisis.es_valido) throw new Error('Backup inválido: ' + analisis.errores.join(' · '));
    let restauradas = 0;
    for (const c of COLECCIONES) {
      if (Array.isArray(analisis.backup_object.colecciones[c])) { await this.guardarLista(c, analisis.backup_object.colecciones[c]); restauradas++; }
    }
    return { restauradas, total: COLECCIONES.length };
  },

  async exportarColeccion(coleccion) {
    if (!COLECCIONES.includes(coleccion)) throw new Error('Colección desconocida: ' + coleccion);
    const data = await this.lista(coleccion);
    const json = JSON.stringify({ version: '1.0', fecha: nowIso(), coleccion, datos: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `idea_${coleccion}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    return { coleccion, registros: data.length };
  },

  async limpiarTodo() { for (const c of COLECCIONES) { await idbClear(c); _invalidar(c); } }
};

if (typeof window !== 'undefined') window.__db = db;
