// perfiles-fijos.js — Perfiles de demostración SIEMPRE disponibles, sin cargar demo.
//
// IE de DEMOSTRACIÓN con estudiantes de TODOS los grados (3°-11°), sus docentes, un
// directivo y un manager, para validar los tres paneles. Se auto-crean al inicializar la
// base (db.inicializar) en cualquier navegador, sin pulsar ningún botón. Es idempotente:
// solo crea los perfiles que falten (busca por el campo `usuario`) y NUNCA borra ni
// sobrescribe datos existentes.
//
// Login por nombre de usuario (campo `usuario`):
//   - 11°: Estudiante1..10 (1-5 en A, 6-10 en B)
//   - 3°-10°: Est<grado>-<n>  (4 por grado, grupo A) → Est3-1 .. Est10-4
//   - Docente1..5, Directivo1, Manager
// Contraseña compartida: idea2026.

import { db } from './db.js';
import { uuid, nowIso } from './utils.js';

export const PASSWORD_DEMO = 'idea2026';

export const INSTITUCION_DEMO = {
  id: 'ie-demo',
  nombre: 'Institución Educativa Demostración IDEA',
  abreviatura: 'IE Demo',
  secretaria_educacion: 'Nariño',
  municipio: 'Pasto',
  departamento: 'Nariño',
  sedes: [{ id: 'demo-principal', nombre: 'Sede Principal' }],
  grados: ['3', '4', '5', '6', '7', '8', '9', '10', '11'],
  grupos: ['A', 'B']
};

// Mismo esquema de hashing que auth.js: bcrypt si está disponible, SHA-256 como fallback.
async function hashPassword(plano) {
  const b = window.dcodeIO?.bcrypt || window.bcrypt;
  if (b && typeof b.hashSync === 'function') return 'bcrypt$' + b.hashSync(plano, 10);
  const sal = uuid().replace(/-/g, '').slice(0, 16);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sal + plano));
  const hex = Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('');
  return `sha256$${sal}$${hex}`;
}

function construirPerfiles() {
  const perfiles = [];

  // === Estudiantes de TODOS los grados (3° a 11°) para validar todos los paneles ===
  // 11° conserva EXACTAMENTE los 10 originales (1-5 en A, 6-10 en B) para no romper nada
  // ya validado (incl. el flujo 11°P1 y las demos de excelencia que dependen de ellos).
  for (let i = 1; i <= 10; i++) {
    perfiles.push({
      usuario: `Estudiante${i}`,
      rol: 'estudiante',
      nombre_completo: `ESTUDIANTE ${i} (DEMO)`,
      tipo_documento: 'TI',
      numero_documento: '90000000' + String(i).padStart(2, '0'),
      sexo: i % 2 === 0 ? 'F' : 'M',
      email: `estudiante${i}@idea.demo`,
      institucion_id: INSTITUCION_DEMO.id,
      sede_id: 'demo-principal',
      grado: '11',
      grupo: i <= 5 ? 'A' : 'B'
    });
  }
  // Grados 3° a 10°: 4 estudiantes por grado, todos en grupo A. Login usuario `Est<grado>-<n>`.
  for (let g = 3; g <= 10; g++) {
    for (let n = 1; n <= 4; n++) {
      perfiles.push({
        usuario: `Est${g}-${n}`,
        rol: 'estudiante',
        nombre_completo: `ESTUDIANTE ${g}°-${n} (DEMO)`,
        tipo_documento: 'TI',
        numero_documento: '95' + String(g).padStart(2, '0') + String(n).padStart(2, '0'),
        sexo: n % 2 === 0 ? 'F' : 'M',
        email: `est${g}-${n}@idea.demo`,
        institucion_id: INSTITUCION_DEMO.id,
        sede_id: 'demo-principal',
        grado: String(g),
        grupo: 'A'
      });
    }
  }

  // 5 docentes, sin grupos asignados (ven todos los grupos hasta que el Manager los restrinja)
  for (let i = 1; i <= 5; i++) {
    perfiles.push({
      usuario: `Docente${i}`,
      rol: 'docente',
      nombre_completo: `DOCENTE ${i} (DEMO)`,
      tipo_documento: 'CC',
      numero_documento: '91000000' + String(i).padStart(2, '0'),
      sexo: 'N',
      email: `docente${i}@idea.demo`,
      institucion_id: INSTITUCION_DEMO.id,
      sede_id: 'demo-principal',
      grupos_asignados: []
    });
  }

  // 1 directivo de la IE
  perfiles.push({
    usuario: 'Directivo1',
    rol: 'directivo',
    nombre_completo: 'DIRECTIVO 1 (DEMO)',
    tipo_documento: 'CC',
    numero_documento: '9200000001',
    sexo: 'N',
    email: 'directivo1@idea.demo',
    institucion_id: INSTITUCION_DEMO.id,
    sede_id: 'demo-principal'
  });

  // 1 manager (administrador de la demo)
  perfiles.push({
    usuario: 'Manager',
    rol: 'manager',
    nombre_completo: 'MANAGER (DEMO)',
    tipo_documento: 'CC',
    numero_documento: '9300000001',
    sexo: 'N',
    email: 'manager@idea.demo',
    institucion_id: INSTITUCION_DEMO.id,
    sede_id: 'demo-principal'
  });

  return perfiles;
}

/**
 * Garantiza que la institución demo y los 17 perfiles fijos existan.
 * Idempotente: crea solo lo que falte (busca por `usuario`), nunca borra ni sobrescribe.
 * Se invoca desde db.inicializar(), así corre en cualquier página y navegador.
 * @returns {Promise<{creados:number}>}
 */
export async function asegurarPerfilesFijos() {
  // 1) Institución demo
  const insts = await db.lista('idea_instituciones');
  if (!insts.some(i => i.id === INSTITUCION_DEMO.id)) {
    insts.push(INSTITUCION_DEMO);
    await db.guardarLista('idea_instituciones', insts);
  }

  // 2) Perfiles que falten
  const perfiles = construirPerfiles();
  const usuarios = await db.lista('idea_usuarios');
  const existentes = new Set(usuarios.map(u => (u.usuario || '').toLowerCase()));
  const faltantes = perfiles.filter(p => !existentes.has(p.usuario.toLowerCase()));
  if (faltantes.length === 0) return { creados: 0 };

  const hash = await hashPassword(PASSWORD_DEMO);
  for (const p of faltantes) {
    await db.crear('idea_usuarios', {
      ...p,
      password_hash: hash,
      fecha_registro: nowIso(),
      ultima_sesion: null
    });
  }
  console.log(`perfiles-fijos: ${faltantes.length} perfiles de demostración creados`);
  return { creados: faltantes.length };
}
