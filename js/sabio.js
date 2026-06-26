// sabio.js — "Sabio", tutor de IA del Instrumento IDEA.
//
// REDISEÑO 2026-06-06 (v6): PERSONAJE completo = mascota amigable + robótica de IA +
// educación. Cabeza de robot redondeada con visor y ojos cian luminosos (IA), birrete de
// graduación con borla dorada (educación), orejas-nodo con LED, anillo orbital y barra de
// actividad (robótica), aura y flotación. Acabado pulido con gradientes y brillo. Paleta
// armonizada con IDEA y los paneles (índigo/violeta + dorado + navy + acento cian).
// Animaciones embebidas en el SVG. prefers-reduced-motion.
//
// API y expresiones SE CONSERVAN: sabioSVG, sabioConBurbuja, initSabioMouseReactividad,
// mensajeSabioPorNivel. Expresiones: feliz, pensativo, animando, saludando, celebrando,
// leyendo, pensando_profundo. Pupilas .pupila-izq/.pupila-der siguen el cursor.

let _sabioSeq = 0;

export function sabioSVG(expresion = 'saludando', tamano = 160) {
  const u = 'sb' + (++_sabioSeq);

  const ojo = (cx) => `<rect x="${cx - 11}" y="128" width="22" height="20" rx="10" fill="url(#eye-${u})" filter="url(#glow-${u})"/>`;
  const pup = (cx, cls, dy = 0) => `<circle cx="${cx}" cy="${138 + dy}" r="4.3" fill="#04121F" class="pupila ${cls}"/><circle cx="${cx - 1.7}" cy="${134.6 + dy}" r="1.7" fill="#EAFCFF"/>`;
  const arco = (cx) => `<path d="M ${cx - 11} 141 Q ${cx} 127 ${cx + 11} 141" stroke="url(#eye-${u})" stroke-width="4.6" fill="none" stroke-linecap="round" filter="url(#glow-${u})"/>`;
  const slit = (cx) => `<line x1="${cx - 10}" y1="138" x2="${cx + 10}" y2="138" stroke="url(#eye-${u})" stroke-width="4.6" stroke-linecap="round" filter="url(#glow-${u})"/>`;
  const OJOS = {
    base:     `<g class="sb-eyes">${ojo(91)}${ojo(129)}${pup(91, 'pupila-izq')}${pup(129, 'pupila-der')}</g>`,
    animando: `<g class="sb-eyes">${ojo(91)}${ojo(129)}${pup(91, 'pupila-izq')}${pup(129, 'pupila-der')}</g>`,
    leyendo:  `${ojo(91)}${ojo(129)}${pup(91, 'pupila-izq', 3)}${pup(129, 'pupila-der', 3)}`,
    feliz:    `${arco(91)}${arco(129)}`,
    pensativo:`${slit(91)}${ojo(129)}${pup(129, 'pupila-der')}`,
    pensando: `${slit(91)}${slit(129)}`
  };
  const BOCA = {
    leve:    `<path d="M 102 158 Q 110 163 118 158" stroke="url(#eye-${u})" stroke-width="2.4" fill="none" stroke-linecap="round" filter="url(#glow-${u})"/>`,
    sonrisa: `<path d="M 99 157 Q 110 166 121 157" stroke="url(#eye-${u})" stroke-width="2.8" fill="none" stroke-linecap="round" filter="url(#glow-${u})"/>`,
    grande:  `<path d="M 98 156 Q 110 169 122 156 Q 110 162 98 156 Z" fill="url(#eye-${u})" opacity="0.92" filter="url(#glow-${u})"/>`
  };
  const chispas = `
    <g class="sb-twk"><circle cx="42" cy="98" r="2.6" fill="#FBBF24"/></g>
    <g class="sb-twk" style="animation-delay:.6s"><circle cx="180" cy="106" r="2.3" fill="#FB7185"/></g>
    <g class="sb-twk" style="animation-delay:1s"><circle cx="174" cy="170" r="2" fill="#67E8F9"/></g>`;
  const tablet = `<g transform="translate(150 184)"><rect x="0" y="0" width="32" height="22" rx="3.5" fill="#0B1430" stroke="url(#gold-${u})" stroke-width="1.2"/><line x1="5" y1="6" x2="27" y2="6" stroke="#67E8F9" stroke-width="1"/><line x1="5" y1="11" x2="22" y2="11" stroke="#A78BFA" stroke-width="1"/><line x1="5" y1="16" x2="25" y2="16" stroke="#FBBF24" stroke-width="1"/></g>`;
  const interrog = `<text x="166" y="92" font-size="28" font-weight="800" fill="url(#gold-${u})" font-family="'Plus Jakarta Sans','Inter',sans-serif" filter="url(#glow-${u})">?</text>`;
  const cfg = {
    saludando:         { ojos: OJOS.base,     boca: BOCA.sonrisa, extras: '',        blink: true },
    feliz:             { ojos: OJOS.feliz,    boca: BOCA.sonrisa, extras: '',        blink: false },
    animando:          { ojos: OJOS.animando, boca: BOCA.leve,    extras: '',        blink: true },
    pensativo:         { ojos: OJOS.pensativo,boca: BOCA.leve,    extras: '',        blink: false },
    celebrando:        { ojos: OJOS.feliz,    boca: BOCA.grande,  extras: chispas,   blink: false },
    leyendo:           { ojos: OJOS.leyendo,  boca: BOCA.leve,    extras: tablet,    blink: true },
    pensando_profundo: { ojos: OJOS.pensando, boca: BOCA.leve,    extras: interrog,  blink: false }
  }[expresion] || { ojos: OJOS.base, boca: BOCA.leve, extras: '', blink: true };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" style="height:${tamano}px;width:auto" class="sabio sabio-${expresion} sabio-svg" role="img" aria-label="Sabio, tutor de IA de IDEA — ${expresion}">
    <defs>
      <radialGradient id="aura-${u}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#A78BFA" stop-opacity="0.5"/>
        <stop offset="0.45" stop-color="#F59E0B" stop-opacity="0.20"/>
        <stop offset="0.75" stop-color="#FB7185" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#FB7185" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="head-${u}" x1="0.2" y1="0.04" x2="0.85" y2="1">
        <stop offset="0" stop-color="#9A95F5"/>
        <stop offset="0.42" stop-color="#6D5BE0"/>
        <stop offset="1" stop-color="#352F8C"/>
      </linearGradient>
      <radialGradient id="visor-${u}" cx="0.5" cy="0.34" r="0.85">
        <stop offset="0" stop-color="#1C2746"/><stop offset="1" stop-color="#070B1B"/>
      </radialGradient>
      <radialGradient id="eye-${u}" cx="0.4" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#ECFEFF"/><stop offset="0.45" stop-color="#67E8F9"/><stop offset="1" stop-color="#06B6D4"/>
      </radialGradient>
      <linearGradient id="cap-${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#322C66"/><stop offset="1" stop-color="#15122F"/>
      </linearGradient>
      <radialGradient id="gold-${u}" cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stop-color="#FFF7DB"/><stop offset="0.5" stop-color="#FBBF24"/><stop offset="1" stop-color="#C77E12"/>
      </radialGradient>
      <linearGradient id="ear-${u}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#403A92"/><stop offset="1" stop-color="#1D1A4A"/>
      </linearGradient>
      <filter id="glow-${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <filter id="auraB-${u}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <style>
      .sabio-svg .sb-bob{animation:sbBob 4.6s ease-in-out infinite}
      @keyframes sbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .sabio-svg .sb-aura{transform-box:fill-box;transform-origin:center;animation:sbAura 5s ease-in-out infinite}
      @keyframes sbAura{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.1);opacity:1}}
      .sabio-svg .sb-ring{transform-box:fill-box;transform-origin:center;animation:sbRing 16s linear infinite}
      @keyframes sbRing{to{transform:rotate(360deg)}}
      .sabio-svg .sb-tassel{transform-box:fill-box;transform-origin:top center;animation:sbTas 3.4s ease-in-out infinite}
      @keyframes sbTas{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(6deg)}}
      .sabio-svg .sb-blink{transform-box:fill-box;transform-origin:center;animation:sbBlink 5.4s ease-in-out infinite}
      @keyframes sbBlink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(0.12)}}
      .sabio-svg .sb-twk{transform-box:fill-box;transform-origin:center;animation:sbTwk 1.9s ease-in-out infinite}
      @keyframes sbTwk{0%,100%{transform:scale(.6);opacity:.4}50%{transform:scale(1.15);opacity:1}}
      .sabio-svg .sb-led{animation:sbLed 1.8s ease-in-out infinite}
      @keyframes sbLed{0%,100%{opacity:.5}50%{opacity:1}}
      @media (prefers-reduced-motion:reduce){.sabio-svg [class^="sb-"]{animation:none}}
    </style>

    <ellipse cx="110" cy="236" rx="46" ry="6" fill="#1E1B4B" opacity="0.18" filter="url(#glow-${u})"/>
    <g class="sb-bob">
      <circle cx="110" cy="140" r="84" fill="url(#aura-${u})" filter="url(#auraB-${u})" class="sb-aura"/>
      <ellipse cx="110" cy="150" rx="82" ry="24" fill="none" stroke="url(#eye-${u})" stroke-width="1.4" opacity="0.4" class="sb-ring" transform="rotate(-16 110 150)"/>

      <g><rect x="44" y="128" width="16" height="30" rx="7" fill="url(#ear-${u})"/><circle cx="52" cy="143" r="3" fill="#67E8F9" class="sb-led"/></g>
      <g><rect x="160" y="128" width="16" height="30" rx="7" fill="url(#ear-${u})"/><circle cx="168" cy="143" r="3" fill="#FBBF24" class="sb-led" style="animation-delay:.4s"/></g>

      <rect x="58" y="98" width="104" height="98" rx="40" fill="url(#head-${u})"/>
      <path d="M 74 118 Q 110 96 146 118" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.22"/>
      <ellipse cx="86" cy="120" rx="18" ry="10" fill="#FFFFFF" opacity="0.13"/>

      <g>
        <g class="sb-tassel">
          <path d="M 110 74 L 150 74" stroke="url(#gold-${u})" stroke-width="2" fill="none"/>
          <path d="M 150 74 L 150 96" stroke="url(#gold-${u})" stroke-width="2" fill="none"/>
          <path d="M 145 95 L 145 106 M 150 96 L 150 108 M 155 95 L 155 106" stroke="url(#gold-${u})" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="150" cy="95" r="2.6" fill="url(#gold-${u})"/>
        </g>
        <polygon points="110,58 156,74 110,90 64,74" fill="url(#cap-${u})"/>
        <polygon points="110,58 156,74 110,90 64,74" fill="none" stroke="#544D9C" stroke-width="0.8" opacity="0.6"/>
        <path d="M 64 74 L 110 90 L 156 74 L 156 78 L 110 94 L 64 78 Z" fill="#0A081F" opacity="0.85"/>
        <circle cx="110" cy="74" r="3.4" fill="url(#gold-${u})"/>
      </g>

      <rect x="70" y="116" width="80" height="46" rx="22" fill="url(#visor-${u})"/>
      <rect x="70.5" y="116.5" width="79" height="45" rx="21.5" fill="none" stroke="#22D3EE" stroke-width="0.7" opacity="0.4"/>
      ${cfg.blink ? `<g class="sb-blink">${cfg.ojos}</g>` : cfg.ojos}
      ${cfg.boca}

      <g transform="translate(98 178)" opacity="0.92">
        <rect x="0" y="2" width="3" height="6" rx="1.5" fill="#22D3EE" class="sb-led"/>
        <rect x="6" y="0" width="3" height="9" rx="1.5" fill="#A78BFA" class="sb-led" style="animation-delay:.2s"/>
        <rect x="12" y="3" width="3" height="6" rx="1.5" fill="#FBBF24" class="sb-led" style="animation-delay:.4s"/>
        <rect x="18" y="1" width="3" height="8" rx="1.5" fill="#FB7185" class="sb-led" style="animation-delay:.6s"/>
      </g>
      ${cfg.extras}
    </g>
  </svg>`;
}

export function sabioConBurbuja(mensaje, expresion = 'saludando', opciones = {}) {
  const lado = opciones.lado || 'derecha';
  const tam = opciones.tamano || 140;
  const burbujaClase = lado === 'izquierda' ? 'sabio-burbuja sabio-burbuja-izq' : 'sabio-burbuja sabio-burbuja-der';
  if (lado === 'izquierda') {
    return `<div class="sabio-grupo flex items-center gap-4">${sabioSVG(expresion, tam)}<div class="${burbujaClase}">${mensaje}</div></div>`;
  }
  return `<div class="sabio-grupo flex items-center gap-4 flex-row-reverse">${sabioSVG(expresion, tam)}<div class="${burbujaClase}">${mensaje}</div></div>`;
}

let _sabioMouseInit = false, _sabioRafToken = null, _sabioMouse = { x: 0.5, y: 0.5 };
export function initSabioMouseReactividad() {
  if (_sabioMouseInit) return;
  _sabioMouseInit = true;
  window.addEventListener('mousemove', (e) => {
    _sabioMouse.x = e.clientX / window.innerWidth;
    _sabioMouse.y = e.clientY / window.innerHeight;
    if (_sabioRafToken) return;
    _sabioRafToken = requestAnimationFrame(_applySabioGaze);
  }, { passive: true });
}
function _applySabioGaze() {
  _sabioRafToken = null;
  const dx = (_sabioMouse.x - 0.5) * 4, dy = (_sabioMouse.y - 0.5) * 3;
  document.querySelectorAll('.sabio-svg .pupila-izq, .sabio-svg .pupila-der').forEach(p => {
    p.style.transform = `translate(${dx}px, ${dy}px)`; p.style.transformBox = 'fill-box';
  });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSabioMouseReactividad, { once: true });
  else initSabioMouseReactividad();
}

export function mensajeSabioPorNivel(nivel) {
  const m = {
    'BAJO':     { expr: 'pensativo', msg: 'Cada esfuerzo cuenta. Revisemos juntos las preguntas que te costaron más y diseñemos un plan de refuerzo.' },
    'BÁSICO':   { expr: 'animando',  msg: 'Vas por buen camino. Identifica las competencias con menor logro y refuérzalas paso a paso.' },
    'ALTO':     { expr: 'feliz',     msg: '¡Excelente trabajo! Sigue manteniendo este ritmo y reta a tus compañeros a aprender contigo.' },
    'SUPERIOR': { expr: 'feliz',     msg: '¡Eres un referente! Comparte tu método y ayuda a impulsar a todo el grupo.' }
  };
  return m[nivel] || m['BÁSICO'];
}
