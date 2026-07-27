// js/pedagogia-grado.js - Capa ADITIVA de individualidad pedagogica POR GRADO x AREA.
//
// Carga datos/pedagogia_por_grado.json (esqueleto poblable celda a celda) y expone
// lecturas tolerantes. REGLA SUPREMA: si una celda/clave NO existe, la lectura devuelve
// null y el LLAMADOR cae a su logica actual por area (fallback). Asi 11 P1 (celda vacia)
// queda IDENTICO a hoy.
//
// Hay dos rutas de lectura:
//   - pedagogiaDe(...)      ASINCRONA: garantiza la carga del JSON (await). Para codigo async
//                           como el plan de mejora o exports.
//   - pedagogiaDeSync(...)  SINCRONA: lee de un cache de modulo ya precargado. Para analisis.js,
//                           que es sincrono. El bootstrap del panel debe llamar antes a
//                           cargarPedagogiaGrado() (o setPedagogiaCache) para llenar el cache.
//
// El JSON NO contamina con sus claves de documentacion: las claves que empiezan por "_"
// (p.ej. "_meta", "_schema_celda", "_nota_ejemplo") se ignoran como contenido real.

let _cache = null;          // objeto ya cargado (cache de modulo, lectura sincrona)
let _cachePer = null;       // pedagogia POR PERIODO (area×grado×periodo): capa PREFERENTE sobre la de grado
let _promesaCarga = null;   // de-duplica cargas concurrentes

// Cuadernillos YA VIVOS y validados a la perfeccion (11° P1). La individualidad es por
// grado×asignatura (NO por periodo): la celda [area][11] queda poblada por el P2 de 11°.
// Para que estos 5 sigan dando EXACTAMENTE la salida validada, todo llamador de la capa por
// grado debe saltarse el override cuando el cuadernillo es uno de estos. Fuente unica de verdad.
export const VIVOS_PROTEGIDOS = new Set([
  'cn-11-p1-2023', 'in-11-p1-2023', 'lc-11-p1-2023', 'math-11-p1-2023', 'sc-11-p1-2023'
]);
/** ¿El id (o cuadernillo) corresponde a un vivo protegido que NO debe recibir override por grado? */
export function esVivoProtegido(idOrCuad) {
  const id = (idOrCuad && typeof idOrCuad === 'object') ? idOrCuad.id : idOrCuad;
  return !!id && VIVOS_PROTEGIDOS.has(id);
}

const RUTA = 'datos/pedagogia_por_grado.json';
const RUTA_PER = 'datos/pedagogia_por_periodo.json';  // capa POR PERIODO (opcional; personaliza área×grado×periodo)

/**
 * Carga el JSON una sola vez y lo deja en cache de modulo. Tolerante a error:
 * ante cualquier fallo (red, parseo) deja el cache en {} y NUNCA lanza, de modo que
 * toda la plataforma siga funcionando con su comportamiento actual (fallback total).
 * @returns {Promise<object>} el objeto de pedagogia (o {} si fallo).
 */
export async function cargarPedagogiaGrado() {
  if (_cache) return _cache;
  if (_promesaCarga) return _promesaCarga;
  _promesaCarga = (async () => {
    // RENDIMIENTO: los dos archivos suman ~380 KB comprimidos y antes se pedían EN SERIE y con
    // `cache:'no-cache'`, que obliga al navegador a revalidar siempre. Ahora van EN PARALELO y
    // con la caché normal del navegador: el servidor manda ETag, así que un archivo sin cambios
    // se resuelve con un 304 vacío en vez de volver a descargarse, y las dos esperas se solapan.
    const [resp, respP] = await Promise.all([
      fetch(RUTA).catch(e => ({ ok: false, _err: e })),
      fetch(RUTA_PER).catch(e => ({ ok: false, _err: e })),
    ]);
    try {
      if (!resp || !resp.ok) throw new Error('HTTP ' + (resp && resp.status));
      const obj = await resp.json();
      _cache = (obj && typeof obj === 'object') ? obj : {};
    } catch (e) {
      console.warn('[IDEA] pedagogia_por_grado.json no disponible; usando fallback por area.', e && e.message);
      _cache = {};
    }
    // Capa POR PERIODO (opcional): personaliza por área×grado×periodo. Si no existe o falla,
    // se ignora y todo cae a la pedagogía por grado (comportamiento actual, sin romper nada).
    try {
      const objP = (respP && respP.ok) ? await respP.json() : null;
      _cachePer = (objP && typeof objP === 'object') ? objP : {};
    } catch (_) { _cachePer = {}; }
    return _cache;
  })();
  return _promesaCarga;
}

/**
 * Inyecta directamente un objeto de pedagogia en el cache de modulo (sin fetch).
 * Util si el bootstrap ya tiene el JSON cargado por otra via, o para tests.
 * @param {object} obj
 */
export function setPedagogiaCache(obj) {
  _cache = (obj && typeof obj === 'object') ? obj : {};
  return _cache;
}

/** ¿Ya hay datos en cache? (para que un llamador sincrono sepa si puede confiar en sync). */
export function pedagogiaCacheLista() {
  return _cache != null;
}

// --- Normalizacion de claves ---------------------------------------------------------
function _norm(s) {
  return (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // sin tildes
}

/**
 * Mapea el TEXTO de area de un cuadernillo a su area_slug canonico. Necesario porque
 * algunos cuadernillos vivos traen area_slug = null y solo el campo `area` con texto
 * ("Ciencias Naturales", "Inglés", ...). Devuelve null si no reconoce el area.
 * @param {string} area  texto del area (cuadernillo.area)
 * @returns {string|null} matematicas | lectura_critica | sociales_ciudadanas | ciencias_naturales | ingles | null
 */
export function aliasAreaSlug(area) {
  const s = _norm(area);
  if (!s) return null;
  if (/matematic|numeric/.test(s)) return 'matematicas';
  if (/lectura|lenguaje|lengua|critic/.test(s)) return 'lectura_critica';
  if (/social|ciudadan|historia|geograf/.test(s)) return 'sociales_ciudadanas';
  if (/natural|biolog|quimic|fisic|ciencias\b/.test(s)) return 'ciencias_naturales';
  if (/ingl|english/.test(s)) return 'ingles';
  return null;
}

/**
 * Resuelve el area_slug a partir del cuadernillo: usa cuadernillo.area_slug si viene,
 * y si no, lo deriva del texto cuadernillo.area con aliasAreaSlug. Conveniencia para
 * los llamadores (analisis.js, sabio-ia.js) que solo tienen el cuadernillo.
 * @param {object} cuadernillo
 * @returns {string|null}
 */
export function areaSlugDeCuadernillo(cuadernillo) {
  if (!cuadernillo) return null;
  if (cuadernillo.area_slug) return cuadernillo.area_slug;
  return aliasAreaSlug(cuadernillo.area || cuadernillo.materia || '');
}

// --- Lectura tolerante del contenido -------------------------------------------------
// Lee una CELDA (objeto con las claves de pedagogía) tolerando ausencias/vacíos.
function _leerCelda(celda, clave) {
  if (!celda || typeof celda !== 'object') return null;
  if (clave == null) {
    // Devuelve la celda completa pero SIN las claves de documentacion "_*".
    const out = {};
    for (const k of Object.keys(celda)) { if (k[0] !== '_') out[k] = celda[k]; }
    return Object.keys(out).length ? out : null;
  }
  if (clave[0] === '_') return null; // nunca exponer claves de documentacion
  const v = celda[clave];
  if (v == null) return null;
  // Vacio = ausente (para que el llamador caiga al fallback): {} o [] cuentan como null.
  if (Array.isArray(v) && v.length === 0) return null;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).filter(k => k[0] !== '_').length === 0) return null;
  return v;
}

// Lectura por GRADO: data[area][grado][clave].
function _leerDe(data, area_slug, grado, clave) {
  if (!data || !area_slug) return null;
  const porArea = data[area_slug];
  if (!porArea || typeof porArea !== 'object') return null;
  return _leerCelda(porArea[String(grado)], clave);
}

// Normaliza el periodo a "1" | "2" | "3" (acepta I/II/III, 1/2/3, "P1"/"P2"). null si no reconoce.
function _normPeriodo(p) {
  const s = (p == null ? '' : String(p)).trim().toUpperCase();
  if (s === '1' || s === 'I' || s === 'P1') return '1';
  if (s === '2' || s === 'II' || s === 'P2') return '2';
  if (s === '3' || s === 'III' || s === 'P3') return '3';
  return null;
}

// Lectura por PERIODO: dataPer[area][grado][periodo][clave]. null si no hay celda de ese periodo.
function _leerDePeriodo(dataPer, area_slug, grado, periodo, clave) {
  const per = _normPeriodo(periodo);
  if (!dataPer || !area_slug || !per) return null;
  const porArea = dataPer[area_slug]; if (!porArea || typeof porArea !== 'object') return null;
  const porGrado = porArea[String(grado)]; if (!porGrado || typeof porGrado !== 'object') return null;
  return _leerCelda(porGrado[per], clave);
}

// Resolución con prioridad: 1) celda POR PERIODO  2) celda POR GRADO  3) null (=> fallback en el llamador).
function _resolver(area_slug, grado, clave, periodo) {
  const porPeriodo = _leerDePeriodo(_cachePer, area_slug, grado, periodo, clave);
  if (porPeriodo != null) return porPeriodo;
  return _leerDe(_cache, area_slug, grado, clave);
}

/**
 * Lectura ASINCRONA: garantiza la carga del JSON antes de leer. Devuelve el contenido
 * de data[area_slug][grado][clave] o null si no existe (=> fallback en el llamador).
 * @param {string} area_slug
 * @param {string|number} grado
 * @param {string} [clave]  si se omite, devuelve la celda completa (sin claves "_*").
 * @returns {Promise<*|null>}
 */
export async function pedagogiaDe(area_slug, grado, clave, periodo) {
  await cargarPedagogiaGrado();
  return _resolver(area_slug, grado, clave, periodo);
}

/**
 * Lectura SINCRONA desde el cache ya precargado. Si el cache aun no esta cargado,
 * devuelve null (=> fallback). Pensada para analisis.js (sincrono): el bootstrap del
 * panel debe haber llamado a cargarPedagogiaGrado()/setPedagogiaCache antes de renderizar.
 * @param {string} area_slug
 * @param {string|number} grado
 * @param {string} [clave]
 * @returns {*|null}
 */
export function pedagogiaDeSync(area_slug, grado, clave, periodo) {
  if (_cache == null) return null;
  return _resolver(area_slug, grado, clave, periodo);
}
