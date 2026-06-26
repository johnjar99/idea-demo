// auth.js — ADAPTADOR LOCAL de autenticación (sandbox idea-demo).
//
// Reemplaza al auth.js de Firebase Authentication SIN cambiar la interfaz pública ni la
// forma de la sesión. Login 100% client-side: el perfil vive en IndexedDB (idea_usuarios)
// y la contraseña se verifica contra password_hash (mismo esquema que perfiles-fijos.js).
// La sesión se guarda en sessionStorage. Todas las lecturas de sesión son ASÍNCRONAS para
// no romper los `await requerirSesion()/obtenerSesion()` de las páginas.
//
// Roles: estudiante | docente | directivo | funcionario | manager.

import { db } from './db.js';
import { uuid, nowIso, emailValido, documentoValido } from './utils.js';

const _SES_CK = 'idea_demo_sesion';
let _perfilCache = null;

// --- Hash / verificación (compatible con perfiles-fijos.js) --------------------------
async function hashPassword(plano) {
  const b = window.dcodeIO?.bcrypt || window.bcrypt;
  if (b && typeof b.hashSync === 'function') return 'bcrypt$' + b.hashSync(plano, 10);
  const sal = uuid().replace(/-/g, '').slice(0, 16);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sal + plano));
  const hex = Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
  return `sha256$${sal}$${hex}`;
}
async function verificarPassword(plano, hash) {
  if (!hash || typeof hash !== 'string') return false;
  if (hash.startsWith('bcrypt$')) {
    const b = window.dcodeIO?.bcrypt || window.bcrypt;
    if (b && typeof b.compareSync === 'function') { try { return b.compareSync(plano, hash.slice(7)); } catch (_) { return false; } }
    return false; // hash bcrypt pero sin librería → no se puede verificar
  }
  if (hash.startsWith('sha256$')) {
    const [, sal, hex] = hash.split('$');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sal + plano));
    const calc = Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
    return calc === hex;
  }
  return false;
}

// --- Sesión en sessionStorage --------------------------------------------------------
function _guardarPerfilSesion(perfil) {
  _perfilCache = perfil;
  try { if (perfil) sessionStorage.setItem(_SES_CK, JSON.stringify(perfil)); else sessionStorage.removeItem(_SES_CK); } catch (_) {}
}
function _leerPerfilSesion() {
  if (_perfilCache) return _perfilCache;
  try { const raw = sessionStorage.getItem(_SES_CK); if (raw) { _perfilCache = JSON.parse(raw); return _perfilCache; } } catch (_) {}
  return null;
}

// Forma de "sesión" (idéntica a producción).
function perfilASesion(perfil) {
  if (!perfil) return null;
  return {
    user_id: perfil.id,
    rol: perfil.rol,
    nombre_completo: perfil.nombre_completo,
    institucion_id: perfil.institucion_id ?? null,
    sede_id: perfil.sede_id ?? null,
    grado: perfil.grado,
    grupo: perfil.grupo,
    grupos_asignados: perfil.grupos_asignados,
    secretaria_id: perfil.secretaria_id
  };
}

// Busca un perfil por usuario / numero_documento / email (case-insensitive).
async function buscarPerfil(identificador) {
  const id = String(identificador || '').trim().toLowerCase();
  if (!id) return null;
  const usuarios = await db.lista('idea_usuarios');
  return usuarios.find(u =>
    (u.usuario || '').toLowerCase() === id ||
    String(u.numero_documento || '').toLowerCase() === id ||
    (u.email || '').toLowerCase() === id
  ) || null;
}

export async function registrar({ nombre_completo, tipo_documento, numero_documento, sexo, email, password, rol, institucion_id, sede_id, grado, grupo, grupos_asignados, secretaria_id, usuario }) {
  if (!nombre_completo || nombre_completo.length < 5) throw new Error('Nombre completo requerido');
  if (!documentoValido(numero_documento)) throw new Error('Número de documento inválido (6-15 dígitos)');
  if (email && !emailValido(email)) throw new Error('Correo electrónico inválido');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
  if (!['estudiante', 'docente', 'directivo', 'funcionario', 'manager'].includes(rol)) throw new Error('Rol inválido');

  // Unicidad por documento / usuario
  const usuarios = await db.lista('idea_usuarios');
  if (usuarios.some(u => String(u.numero_documento) === String(numero_documento))) throw new Error('Ya existe una cuenta con ese documento');
  if (usuario && usuarios.some(u => (u.usuario || '').toLowerCase() === usuario.toLowerCase())) throw new Error('Ya existe ese nombre de usuario');

  const perfil = {
    id: uuid(),
    rol,
    nombre_completo: nombre_completo.trim().toUpperCase(),
    tipo_documento,
    numero_documento: String(numero_documento).trim(),
    sexo,
    email: (email || '').trim().toLowerCase(),
    usuario: usuario || null,
    password_hash: await hashPassword(password),
    institucion_id: institucion_id || null,
    sede_id: sede_id || null,
    fecha_registro: nowIso(),
    ultima_sesion: nowIso()
  };
  if (rol === 'estudiante') { perfil.grado = grado; perfil.grupo = grupo; }
  if (rol === 'docente') perfil.grupos_asignados = grupos_asignados || [];
  if (rol === 'funcionario') perfil.secretaria_id = secretaria_id || null;

  await db.crear('idea_usuarios', perfil);
  _guardarPerfilSesion(perfil);
  return perfil;
}

export async function iniciarSesion({ identificador, password }) {
  if (!identificador || !password) throw new Error('Usuario/correo y contraseña requeridos');
  const perfil = await buscarPerfil(identificador);
  if (!perfil) throw new Error('Usuario o contraseña incorrectos');
  const ok = await verificarPassword(password, perfil.password_hash);
  if (!ok) throw new Error('Usuario o contraseña incorrectos');
  _guardarPerfilSesion(perfil);
  try { await db.actualizar('idea_usuarios', perfil.id, { ultima_sesion: nowIso() }); } catch (_) {}
  return perfilASesion(perfil);
}

export async function obtenerSesion() {
  const perfil = _leerPerfilSesion();
  return perfil ? perfilASesion(perfil) : null;
}

export async function cerrarSesion() {
  _guardarPerfilSesion(null);
}

/**
 * Guard de páginas (ASÍNCRONO): `const ses = await requerirSesion('rol')`.
 * Redirige a index.html si no hay sesión o el rol no coincide.
 */
export async function requerirSesion(rolesPermitidos) {
  const ses = await obtenerSesion();
  if (!ses) { window.location.href = 'index.html'; return null; }
  const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : (rolesPermitidos ? [rolesPermitidos] : null);
  if (roles && !roles.includes(ses.rol)) { window.location.href = 'index.html'; return null; }
  return ses;
}

/** En el sandbox no hay correo: solo recordamos que la clave demo es idea2026. */
export async function recuperarPassword(_identificador) {
  throw new Error('Demo local: la contraseña de los perfiles de demostración es idea2026.');
}

/** Crea/garantiza los perfiles de demostración (mismo efecto que db.inicializar). */
export async function cargarUsuariosDemo() {
  const { asegurarPerfilesFijos } = await import('./perfiles-fijos.js');
  return asegurarPerfilesFijos();
}
