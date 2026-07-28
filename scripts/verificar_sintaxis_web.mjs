// verificar_sintaxis_web.mjs — Comprueba que TODA página y módulo de la plataforma compila.
//
// Por qué existe: una edición automática dejó un salto de línea real dentro de una expresión
// regular de cuadernillo.html (`split(/\n\s*\n/)` quedó partido en tres líneas). El archivo
// seguía siendo HTML válido, así que ningún validador lo detectó, pero el módulo JavaScript no
// cargaba y la prueba se quedaba en blanco: "N/D" en tiempo y número de preguntas, y el botón
// sin hacer nada. El estudiante no podía presentar en NINGÚN grado.
//
// Ni validar_p2.mjs ni auditar_alineacion.mjs miran el código: solo los datos. Esta verificación
// cierra ese hueco y debe correrse después de cualquier edición de páginas o módulos.
//
// Uso:  node scripts/verificar_sintaxis_web.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Quita las líneas de import/export para poder compilar el cuerpo con `new Function`, y envuelve
// en una función async porque los módulos admiten await de nivel superior.
function compilable(src) {
  return src
    .replace(/^[ \t]*import[\s\S]*?from\s*['"][^'"]*['"];?[ \t]*$/gm, '')
    .replace(/^[ \t]*import\s*['"][^'"]*['"];?[ \t]*$/gm, '')
    // Los módulos minificados traen los export en la misma línea que el código, así que no se
    // pueden anclar a principio de línea.
    .replace(/export\s*\{[^}]*\}\s*;?/g, '')
    .replace(/export\s+default\s+/g, 'void ')
    .replace(/^[ \t]*export\s+(?=(const|let|var|function|async|class))/gm, '');
}

const pendientes = [];

function revisar(nombre, codigo, fallos) {
  try {
    new Function('(async()=>{' + compilable(codigo) + '})()');
    return;
  } catch (e) {
    // Segundo intento: hay módulos minificados donde quitar los export a ciegas desbalancea el
    // código. Se prueba como módulo real, que es como lo carga el navegador.
    try {
      new (Object.getPrototypeOf(async function* () {}).constructor)('', '');
    } catch (_) { /* sin soporte */ }
    try {
      // `import()` de un data: URL valida el módulo COMPLETO, imports y exports incluidos.
      const b64 = Buffer.from(codigo, 'utf8').toString('base64');
      pendientes.push(
        import('data:text/javascript;base64,' + b64)
          .then(() => null)
          .catch(err => (String(err.message).includes('Cannot find module') ||
                         String(err.message).includes('Failed to resolve')
            ? null                                   // solo falla la RUTA de un import: sintaxis OK
            : fallos.push(`${nombre}: ${err.message}`))));
      return;
    } catch (_) { /* cae al error original */ }
    fallos.push(`${nombre}: ${e.message}`);
  }
}

const fallos = [];
let nPag = 0, nMod = 0;

for (const f of fs.readdirSync(RAIZ).filter(x => x.endsWith('.html') && !x.includes('_PRE_'))) {
  const html = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  nPag++;
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (m[1].trim()) revisar(f, m[1], fallos);
  }
}

const dirJs = path.join(RAIZ, 'js');
for (const f of fs.readdirSync(dirJs).filter(x => x.endsWith('.js'))) {
  nMod++;
  revisar('js/' + f, fs.readFileSync(path.join(dirJs, f), 'utf8'), fallos);
}

await Promise.all(pendientes);
console.log(`Revisadas ${nPag} páginas y ${nMod} módulos.`);
if (fallos.length) {
  console.log(`\n${fallos.length} CON ERROR DE SINTAXIS:`);
  fallos.forEach(x => console.log('  ' + x));
  process.exit(1);
}
console.log('Todo compila: ningún error de sintaxis.');
