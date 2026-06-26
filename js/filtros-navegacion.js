// js/filtros-navegacion.js
// =============================================================================
// Filtros de navegación ADITIVOS para los paneles (estudiante / docente / directivo).
//
// Con 35 cuadernillos P2 nuevos + 5 vivos de 11°P1, cada panel necesita poder
// filtrar por Grado / Periodo / Asignatura sin romper la lógica ya validada.
// Este módulo es 100% aditivo: por defecto TODOS los selectores están en "Todos",
// de modo que NO oculta nada (11°P1 sigue visible tal cual). Sin dependencias,
// reutilizable por los tres paneles.
//
// El campo `periodo` de los cuadernillos es INCONSISTENTE en los datos:
//   - vivos 11°P1 → "I" (y a veces "1")
//   - propios P2  → "II"
// Por eso SIEMPRE normalizamos antes de comparar.
// =============================================================================

/**
 * Normaliza un periodo a "1" | "2" | "3".
 * Acepta "1"/"I", "2"/"II", "3"/"III" (con o sin espacios, mayúsc/minúsc).
 * Cualquier otro valor se devuelve como String(p) sin tocar (no rompe).
 */
export function normPeriodo(p) {
  const s = String(p ?? '').trim().toUpperCase();
  if (s === '1' || s === 'I')   return '1';
  if (s === '2' || s === 'II')  return '2';
  if (s === '3' || s === 'III') return '3';
  return String(p ?? '');
}

/** Etiqueta legible de un periodo: "Periodo I" | "Periodo II" | "Periodo III". */
export function etiquetaPeriodo(p) {
  const n = normPeriodo(p);
  const rom = { '1': 'I', '2': 'II', '3': 'III' }[n] || n;
  return `Periodo ${rom}`;
}

// Sentinela de "sin filtro". Si un <select> tiene este value (o vacío), pasa todo.
const TODOS = '__todos__';

/**
 * ¿El `item` pasa el `filtro`? Un campo vacío/"Todos" en el filtro = pasa.
 * Los getters extraen del item el periodo (crudo, se normaliza aquí), el área y el grado.
 *
 * @param {object} item    cuadernillo o aplicación
 * @param {{grado?:string, periodo?:string, asignatura?:string}} filtro valores actuales
 * @param {(it:object)=>any} getPeriodo  devuelve el periodo CRUDO del item
 * @param {(it:object)=>any} getArea     devuelve el área (texto) del item
 * @param {(it:object)=>any} getGrado    devuelve el grado del item
 */
export function pasaFiltro(item, filtro, getPeriodo, getArea, getGrado) {
  const f = filtro || {};
  const vacio = (v) => v == null || v === '' || v === TODOS;

  if (!vacio(f.grado)) {
    if (String(getGrado(item)) !== String(f.grado)) return false;
  }
  if (!vacio(f.periodo)) {
    if (normPeriodo(getPeriodo(item)) !== normPeriodo(f.periodo)) return false;
  }
  if (!vacio(f.asignatura)) {
    if (String(getArea(item)) !== String(f.asignatura)) return false;
  }
  return true;
}

/**
 * Dibuja una barra de <select> (solo los campos pedidos) dentro de `contenedorEl`.
 * Cada select arranca en "Todos"/"Todas". Al cambiar cualquiera, llama
 * `onChange({grado, periodo, asignatura})` con los valores actuales (TODOS → '').
 *
 * @param {HTMLElement} contenedorEl  dónde inyectar la barra
 * @param {{grado?:boolean, periodo?:boolean, asignatura?:boolean}} campos qué selects mostrar
 * @param {{grados?:Array, periodos?:Array, asignaturas?:Array}} valoresPosibles opciones por campo
 * @param {(filtro:{grado:string,periodo:string,asignatura:string})=>void} onChange
 * @returns {{leer:()=>object, root:HTMLElement}} API mínima por si el caller la necesita
 */
export function construirBarraFiltros(contenedorEl, campos, valoresPosibles, onChange, opts) {
  if (!contenedorEl) return { leer: () => ({}), root: null };
  const vp = valoresPosibles || {};
  const cmp = campos || {};
  // opts (todo opcional, retrocompatible):
  //   sinTodos: [campo...]    -> ese campo NO lleva opción "Todos"; queda obligado a un valor.
  //   valoresIniciales: {campo: valor} -> valor preseleccionado (si existe entre las opciones).
  const op = opts || {};
  const SIN_TODOS = new Set(op.sinTodos || []);
  const INI = op.valoresIniciales || {};

  const root = document.createElement('div');
  root.className = 'idea-filtros-nav';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Filtros de navegación');

  // Estilo embebido (no toca CSS externos). Acorde a idea-custom: bordes suaves,
  // radios 10px, etiqueta en mayúsculas. Se inyecta una sola vez.
  if (!document.getElementById('idea-filtros-nav-css')) {
    const st = document.createElement('style');
    st.id = 'idea-filtros-nav-css';
    st.textContent = `
      .idea-filtros-nav{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;
        padding:12px 14px;margin:0 0 14px;background:#FBF9F7;
        border:1px solid var(--idea-borde,#ECE6E1);border-radius:12px;}
      .idea-filtros-nav__campo{display:flex;flex-direction:column;gap:4px;min-width:140px;}
      .idea-filtros-nav__lbl{font-size:10.5px;font-weight:700;letter-spacing:.06em;
        text-transform:uppercase;color:#9CA3AF;}
      .idea-filtros-nav__sel{appearance:none;-webkit-appearance:none;width:100%;
        padding:8px 30px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;
        font-size:13.5px;font-family:inherit;background:#fff;color:var(--idea-grafito,#1F1F23);
        cursor:pointer;transition:border-color .15s ease, box-shadow .15s ease;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat:no-repeat;background-position:right 10px center;}
      .idea-filtros-nav__sel:focus{outline:none;border-color:var(--idea-rojo,#E11D48);
        box-shadow:0 0 0 3px rgba(225,29,72,.12);}
      .idea-filtros-nav__hint{font-size:11px;color:#9CA3AF;align-self:center;margin-left:auto;}
    `;
    document.head.appendChild(st);
  }

  const selects = {};

  function mkCampo(clave, label, opciones, optTodosTexto) {
    const wrap = document.createElement('div');
    wrap.className = 'idea-filtros-nav__campo';
    const lbl = document.createElement('span');
    lbl.className = 'idea-filtros-nav__lbl';
    lbl.textContent = label;
    const sel = document.createElement('select');
    sel.className = 'idea-filtros-nav__sel';
    sel.dataset.campo = clave;
    const sinTodos = SIN_TODOS.has(clave);
    if (!sinTodos) {
      const optAll = document.createElement('option');
      optAll.value = TODOS;
      optAll.textContent = optTodosTexto;
      sel.appendChild(optAll);
    }
    (opciones || []).forEach(o => {
      const op = document.createElement('option');
      op.value = String(o.value);
      op.textContent = o.label;
      sel.appendChild(op);
    });
    // Preselección: valor inicial pedido si existe; si no, y el campo es obligatorio
    // (sin "Todos"), la primera opción disponible.
    const ini = INI[clave];
    if (ini != null && (opciones || []).some(o => String(o.value) === String(ini))) {
      sel.value = String(ini);
    } else if (sinTodos && (opciones || []).length) {
      sel.value = String(opciones[0].value);
    }
    sel.addEventListener('change', emitir);
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    root.appendChild(wrap);
    selects[clave] = sel;
  }

  if (cmp.grado) {
    const grados = (vp.grados || [])
      .slice()
      .sort((a, b) => Number(a) - Number(b))
      .map(g => ({ value: g, label: `${g}°` }));
    mkCampo('grado', 'Grado', grados, 'Todos');
  }
  if (cmp.periodo) {
    const periodos = (vp.periodos || [])
      .map(p => normPeriodo(p))
      .filter((v, i, arr) => arr.indexOf(v) === i)        // únicos
      .sort((a, b) => Number(a) - Number(b))
      .map(p => ({ value: p, label: etiquetaPeriodo(p) }));
    mkCampo('periodo', 'Periodo', periodos, 'Todos');
  }
  if (cmp.asignatura) {
    const asigs = (vp.asignaturas || [])
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map(a => ({ value: a, label: a }));
    mkCampo('asignatura', 'Asignatura', asigs, 'Todas');
  }

  function leer() {
    const f = {};
    for (const k in selects) {
      const v = selects[k].value;
      f[k] = (v === TODOS) ? '' : v;
    }
    return f;
  }

  function emitir() {
    if (typeof onChange === 'function') onChange(leer());
  }

  contenedorEl.appendChild(root);
  return { leer, root };
}
