// tema.js — Single source of truth en JavaScript para hex/medidas.
const hexToRgb = (hex) => { const h = hex.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
const hexToExcel = (hex) => hex.replace('#', '').toUpperCase();
const COLOR = {
  ink: { 900: '#1A1613', 700: '#3D332C', 500: '#6B5F54', 400: '#8E8276', 300: '#C2B8AD', 200: '#E5DDD2', 100: '#F1ECE3', 50: '#FBF8F2' },
  paper: '#FFFFFF', zebra: '#FAF6EE',
  brand: { 700: '#A8132F', 600: '#C7163C', 500: '#E11D48', 400: '#EE6B7E', 100: '#FCE7EC', 50: '#FDF2F5' },
  gold: { 700: '#946B11', 600: '#B8861A', 500: '#FBBF24', 100: '#FEF3C7', 50: '#FEF9E7' },
  ok: { '700': '#0A6243', '600': '#0E7A52', '100': '#D6EFE2' },
  warn: { '700': '#935B16', '600': '#B5751C', '100': '#FBEED0' },
  err: { '700': '#95172F', '600': '#B91C3C', '100': '#FBE0E4' },
  info: { '700': '#1A4F8F', '600': '#1F5FA8', '100': '#DBE8F7' }
};
const NIVEL = { BAJO: {fg:COLOR.err['600'],bg:COLOR.err['100']}, 'BÁSICO': {fg:COLOR.warn['600'],bg:COLOR.warn['100']}, ALTO: {fg:COLOR.ok['600'],bg:COLOR.ok['100']}, SUPERIOR: {fg:COLOR.gold[600],bg:COLOR.gold[100]} };
const SEMAFORO = { rojo: COLOR.err['600'], ambar: COLOR.warn['600'], verde: COLOR.ok['600'] };
const FONT = { serif: "'Fraunces','Source Serif Pro',Georgia,serif", sans: "'Inter',system-ui,sans-serif", mono: "'JetBrains Mono',Consolas,monospace" };
const TEXT = { xs:12, sm:14, base:16, md:18, lg:22, xl:28, '2xl':36, '3xl':48, '4xl':64, '5xl':84 };
const LH = { tight:1.05, snug:1.2, normal:1.45, relaxed:1.65, loose:1.8 };
const SPACE = { 1:4, 2:8, 3:12, 4:16, 5:24, 6:32, 7:48, 8:64, 9:96, 10:128 };
const RADIUS = { xs:6, sm:10, md:14, lg:22, full:9999 };
const SHADOW = { xs:'0 1px 2px rgba(60,40,25,0.04)', sm:'0 2px 4px rgba(60,40,25,0.05)', md:'0 6px 16px -4px rgba(60,40,25,0.08)', lg:'0 14px 32px -8px rgba(60,40,25,0.10)', xl:'0 28px 60px -16px rgba(60,40,25,0.16)', '2xl':'0 48px 100px -24px rgba(60,40,25,0.22)' };
const MOTION = { dur: {1:150,2:250,3:400,4:600}, ease: { standard:'cubic-bezier(0.2,0,0,1)', emphasized:'cubic-bezier(0.3,0,0,1)', decelerate:'cubic-bezier(0,0,.2,1)' } };
const PDF = {
  color: {
    ink900: hexToRgb(COLOR.ink[900]), ink700: hexToRgb(COLOR.ink[700]), ink500: hexToRgb(COLOR.ink[500]),
    ink300: hexToRgb(COLOR.ink[300]), ink200: hexToRgb(COLOR.ink[200]), ink100: hexToRgb(COLOR.ink[100]),
    ink50: hexToRgb(COLOR.ink[50]), paper: hexToRgb(COLOR.paper), zebra: hexToRgb(COLOR.zebra),
    brand600: hexToRgb(COLOR.brand[600]), brand500: hexToRgb(COLOR.brand[500]), brand100: hexToRgb(COLOR.brand[100]),
    gold600: hexToRgb(COLOR.gold[600]), gold500: hexToRgb(COLOR.gold[500]), gold100: hexToRgb(COLOR.gold[100]),
    ok600: hexToRgb(COLOR.ok['600']), ok100: hexToRgb(COLOR.ok['100']),
    warn600: hexToRgb(COLOR.warn['600']), warn100: hexToRgb(COLOR.warn['100']),
    err600: hexToRgb(COLOR.err['600']), err100: hexToRgb(COLOR.err['100']),
    info600: hexToRgb(COLOR.info['600']), info100: hexToRgb(COLOR.info['100'])
  },
  font: { serif:'times', serifBold:'times', serifItalic:'times', sans:'helvetica', sansBold:'helvetica', mono:'courier' },
  margin: { top:30, right:25, bottom:25, left:25 }, pageWidth:210, pageHeight:297
};
const EXCEL = {
  color: {
    ink900: hexToExcel(COLOR.ink[900]), ink700: hexToExcel(COLOR.ink[700]), ink500: hexToExcel(COLOR.ink[500]),
    ink300: hexToExcel(COLOR.ink[300]), ink200: hexToExcel(COLOR.ink[200]), ink100: hexToExcel(COLOR.ink[100]),
    ink50: hexToExcel(COLOR.ink[50]), paper: hexToExcel(COLOR.paper), zebra: hexToExcel(COLOR.zebra),
    brand600: hexToExcel(COLOR.brand[600]), brand500: hexToExcel(COLOR.brand[500]), brand100: hexToExcel(COLOR.brand[100]),
    gold600: hexToExcel(COLOR.gold[600]), gold500: hexToExcel(COLOR.gold[500]), gold100: hexToExcel(COLOR.gold[100]),
    ok600: hexToExcel(COLOR.ok['600']), ok100: hexToExcel(COLOR.ok['100']),
    warn600: hexToExcel(COLOR.warn['600']), warn100: hexToExcel(COLOR.warn['100']),
    err600: hexToExcel(COLOR.err['600']), err100: hexToExcel(COLOR.err['100']),
    info600: hexToExcel(COLOR.info['600']), info100: hexToExcel(COLOR.info['100'])
  },
  font: { serif:'Garamond', sans:'Inter', sansAlt:'Calibri', mono:'Consolas' }
};
function wordStyle() {
  return `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap');
    body { font-family:'Inter',Calibri,Arial,sans-serif; font-size:11pt; line-height:1.6; color:${COLOR.ink[700]}; background:${COLOR.paper}; }
    h1,h2,h3 { font-family:'Fraunces',Cambria,Georgia,serif; color:${COLOR.ink[900]}; }
    h1 { font-size:28pt; font-weight:600; margin:0 0 12pt 0; }
    h2 { font-size:18pt; font-weight:600; margin:24pt 0 10pt 0; border-bottom:1px solid ${COLOR.ink[200]}; padding-bottom:6pt; }
    h3 { font-size:14pt; font-weight:500; margin:16pt 0 8pt 0; color:${COLOR.ink[700]}; }
    .eyebrow { font-family:'Inter'; font-size:9pt; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:${COLOR.gold[600]}; margin-bottom:6pt; }
    .subtit-italic { font-family:'Fraunces'; font-style:italic; font-size:14pt; color:${COLOR.ink[500]}; }
    table { border-collapse:collapse; width:100%; margin:12pt 0; }
    th { background:${COLOR.ink[100]}; color:${COLOR.ink[700]}; font-weight:600; text-transform:uppercase; font-size:9pt; letter-spacing:0.08em; padding:10px 12px; border:0.5pt solid ${COLOR.ink[200]}; }
    td { padding:10px 12px; border:0.5pt solid ${COLOR.ink[200]}; font-size:10.5pt; vertical-align:top; }
    .meta { background:${COLOR.brand[50]}; border-left:3px solid ${COLOR.brand[600]}; padding:16px 20px; margin:12pt 0; }
    .institucional { background:${COLOR.info['100']}; border-left:3px solid ${COLOR.info['600']}; padding:16px 20px; margin:12pt 0; }
    .anexo { background:${COLOR.ink[50]}; border:1px dashed ${COLOR.ink[300]}; padding:14px 18px; margin:12pt 0; }
    .firma-col { display:inline-block; width:31%; text-align:center; vertical-align:top; margin-top:60pt; }
    .firma-linea { color:${COLOR.ink[300]}; font-size:11pt; }
    .firma-nombre { font-family:'Inter'; font-weight:600; font-size:11pt; color:${COLOR.ink[900]}; margin-top:4pt; }
    .firma-cargo { font-family:'Inter'; font-style:italic; font-size:9pt; color:${COLOR.ink[500]}; }
    .footer-doc { border-top:0.5pt solid ${COLOR.ink[200]}; padding-top:12pt; margin-top:24pt; font-size:8.5pt; color:${COLOR.ink[500]}; }
    .footer-doc .doc-id { font-family:'Consolas',monospace; }`;
}
export const THEME = { color:COLOR, nivel:NIVEL, semaforo:SEMAFORO, font:FONT, text:TEXT, lh:LH, space:SPACE, radius:RADIUS, shadow:SHADOW, motion:MOTION, pdf:PDF, excel:EXCEL, word:{css:wordStyle} };
export { hexToRgb, hexToExcel };
export default THEME;
