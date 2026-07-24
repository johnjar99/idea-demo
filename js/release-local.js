// release-local.js - Overlay LOCAL de cuadernillos autorizados.
// SOLO actúa en localhost: inyecta en memoria los cuadernillos marcados 'local' o 'web' en
// datos/_release.json (leídos de los archivos datos/), para verificarlos en la plataforma LOCAL
// antes de lanzarlos a la web. NO escribe en Firestore ni afecta producción: en el dominio real
// (instrumentoidea.com) esEntornoLocal() es false y este overlay no se ejecuta.
export function esEntornoLocal() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '';
}

let _cache = null;

export async function cuadernillosLocales() {
  if (!esEntornoLocal()) return [];
  if (_cache) return _cache;
  try {
    const rel = await fetch('datos/_release.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (!rel) { _cache = []; return _cache; }
    const ents = Object.entries(rel.cuadernillos || {}).filter(([, e]) => e.estado === 'local' || e.estado === 'web');
    const out = [];
    for (const [, e] of ents) {
      try {
        const c = await fetch('datos/' + e.archivo, { cache: 'no-store' }).then(r => r.json());
        if (c && c.id) out.push(c);
      } catch (_) {}
    }
    _cache = out;
    return out;
  } catch (_) { _cache = []; return _cache; }
}

// IDs a OCULTAR en localhost (estado 'archivado' en _release.json): p. ej. cuadernillos
// viejos reemplazados por su versión propia. En producción no aplica (esEntornoLocal()=false).
let _cacheOcultos = null;
export async function cuadernillosOcultos() {
  if (!esEntornoLocal()) return new Set();
  if (_cacheOcultos) return _cacheOcultos;
  try {
    const rel = await fetch('datos/_release.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    const ids = Object.entries((rel && rel.cuadernillos) || {})
      .filter(([, e]) => e.estado === 'archivado').map(([k]) => k);
    _cacheOcultos = new Set(ids);
  } catch (_) { _cacheOcultos = new Set(); }
  return _cacheOcultos;
}

export function limpiarCacheLocal() { _cache = null; _cacheOcultos = null; }
