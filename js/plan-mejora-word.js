// Generador de Word del Plan de Mejora — estilo v11.9 (Calibri + paleta vivos clásicos).
// v13.2 fix: removido THEME.word.css() editorial v14 (Fraunces+Inter+colores oscuros)
// porque el usuario calificó como "diseño modificado" no deseado.
import { escapeHtml } from './utils.js';

export function construirWordHtml(ctx) {
  const {
    plan, fecha, recsSel, cronograma, observaciones, prom, niv, enRiesgo,
    logComp, compKeys, minComp, maxComp,
    accionesHTML, trayectoriaHTML, vincHTML, recsHTML, cronoHTML, prioridadesHTML,
    diagnosticoExperto, cuadernillo,
    fortalezasAuto  // [{tipo, codigo, nombre, logro, color}] — autodetectadas en el panel
  } = ctx;

  const partes = [];
  partes.push('<!DOCTYPE html>');
  partes.push('<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">');
  partes.push('<head><meta charset="utf-8"><title>Plan de Mejora - IDEA</title>');
  partes.push('<style>');
  // CSS v11.9: Calibri + paleta vivos clásicos (rojo #E11D48, dorado #FBBF24)
  partes.push("body{font-family:'Calibri',sans-serif;font-size:11pt;line-height:1.55;color:#1F1F23}");
  partes.push('h1{font-size:24pt;color:#E11D48;border-bottom:3px solid #FBBF24;padding-bottom:10px;margin-bottom:16px}');
  partes.push('h2{font-size:15pt;color:#E11D48;border-bottom:1px solid #FBBF24;padding-bottom:4px;margin-top:28px}');
  partes.push('h3{font-size:12pt;color:#1F1F23;margin-top:18px}');
  partes.push('table{border-collapse:collapse;width:100%;margin:12px 0}');
  partes.push('th,td{border:1px solid #999;padding:7px 10px;text-align:left;vertical-align:top;font-size:10.5pt}');
  partes.push('th{background:#1F1F23;color:white;font-weight:bold}');
  partes.push('.meta{background:#FFFBEB;padding:14px 16px;border-left:4px solid #FBBF24;margin-bottom:18px}');
  partes.push('.institucional{background:#F0F9FF;padding:12px;border-left:4px solid #0EA5E9;margin:12px 0}');
  partes.push('.firma-col{display:inline-block;width:30%;text-align:center;margin:0 1%;vertical-align:top}');
  partes.push('.firma-line{border-top:1px solid #333;margin-top:50px;padding-top:4px;font-weight:bold;font-size:10pt}');
  partes.push('.firma-sub{font-size:9pt;color:#666;margin-top:2px}');
  partes.push('.anexo{background:#FAFAFA;padding:12px;border:1px dashed #CBD5E1;margin-top:16px}');
  partes.push('</style></head>');
  partes.push('<body>');
  partes.push('<h1>Plan de Mejora Personalizado - Instrumento IDEA</h1>');

  // Meta
  partes.push('<div class="meta">');
  partes.push('<p><b>Docente del area:</b> ' + escapeHtml(plan.docente_nombre) + '<br>');
  partes.push('<b>Area:</b> ' + escapeHtml(plan.area) + ' &middot; <b>Grado-grupo:</b> ' + escapeHtml(plan.grado || '') + '&deg; ' + escapeHtml(plan.grupo || '') + ' &middot; <b>Periodo:</b> ' + escapeHtml(plan.periodo || '') + '<br>');
  partes.push('<b>Fecha del plan:</b> ' + fecha + ' &middot; <b>Estado:</b> ' + escapeHtml(plan.estado) + ' &middot; <b>Fase del ciclo:</b> II - Analisis y Planeacion</p>');
  partes.push('</div>');

  // Seccion 1
  partes.push('<h2>1. Diagnostico de partida</h2>');
  partes.push(diagnosticoExperto);
  partes.push('<h3>1.1. Trayectoria historica del grupo</h3>');
  partes.push('<table><thead><tr><th>Periodo</th><th style="text-align:center">Promedio del grupo (0-100)</th></tr></thead>');
  partes.push('<tbody>' + (trayectoriaHTML || '<tr><td colspan="2">Sin datos historicos registrados.</td></tr>') + '</tbody></table>');

  // Seccion 2
  partes.push('<h2>2. Competencias y evidencias priorizadas</h2>');
  partes.push('<p>A partir del analisis de logros por competencia, se priorizan las siguientes para el plan de mejora:</p>');
  partes.push('<ul>' + (prioridadesHTML || '<li>Sin competencias priorizadas en el wizard.</li>') + '</ul>');
  partes.push('<p>La priorizacion se basa en el porcentaje de logro grupal, focalizando las competencias con menos del 65% de dominio como areas criticas de intervencion pedagogica (umbral verde del semaforo unificado de la plataforma: menos de 35% rojo, 35 a 65% amarillo, 65% o mas verde).</p>');

  // Seccion 2.1 — Fortalezas autodetectadas (logro >= 65%)
  partes.push('<h2>2.1. Fortalezas detectadas en el grupo</h2>');
  partes.push('<p>Las siguientes competencias, afirmaciones o componentes muestran un nivel de logro grupal igual o superior al 65% (umbral verde del semaforo unificado de la plataforma). Son la base sobre la cual construir el plan de mejora y no requieren intervencion inmediata.</p>');
  if (fortalezasAuto && fortalezasAuto.length > 0) {
    partes.push('<table><thead><tr><th style="width:18%">Tipo</th><th style="width:12%">Codigo</th><th>Descripcion</th><th style="text-align:center;width:12%">Logro</th></tr></thead><tbody>');
    fortalezasAuto.forEach(f => {
      partes.push(`<tr>
        <td>${escapeHtml(f.tipo || '')}</td>
        <td>${escapeHtml(f.codigo || '—')}</td>
        <td>${escapeHtml(f.nombre || '')}</td>
        <td style="text-align:center;color:${f.color || '#10B981'};font-weight:bold">${f.logro || 0}%</td>
      </tr>`);
    });
    partes.push('</tbody></table>');
  } else {
    partes.push('<p><i>Aun no se han detectado fortalezas con logro &ge; 65% en este grupo. Esto puede indicar que el grupo necesita refuerzo generalizado. Concentre el plan en las oportunidades de mejora.</i></p>');
  }

  // Seccion 3
  partes.push('<h2>3. Plan de accion pedagogica detallado</h2>');
  if (recsSel.length > 0) {
    partes.push('<h3>3.1. Acciones del catalogo experto</h3>');
    partes.push('<table><thead><tr><th style="width:22%">Accion</th><th>Descripcion</th><th style="text-align:center;width:10%">Esfuerzo</th><th style="text-align:center;width:10%">Impacto</th><th style="text-align:center;width:12%">Duracion</th></tr></thead>');
    partes.push('<tbody>' + recsHTML + '</tbody></table>');
  }
  if (plan.acciones.length > 0) {
    partes.push('<h3>3.2. Acciones definidas por el docente</h3>');
    // Las Fortalezas YA se muestran arriba en la seccion 2.1 (autodetectadas).
    // Aqui solo van Oportunidades, Estrategias y Seguimiento, definidas por el docente.
    partes.push('<table><thead><tr><th>Oportunidades de mejora</th><th>Estrategias didacticas</th><th>Seguimiento</th></tr></thead>');
    partes.push('<tbody>' + accionesHTML + '</tbody></table>');
  }
  if (recsSel.length === 0 && plan.acciones.length === 0) {
    partes.push('<p><i>No se registraron acciones en el plan. Complete los pasos 2 y 3 del wizard antes de exportar.</i></p>');
  }

  // Seccion 4
  partes.push('<h2>4. Cronograma de implementacion</h2>');
  if (cronograma.length > 0) {
    partes.push('<table><thead><tr><th style="width:30%">Accion</th><th style="text-align:center;width:12%">Semana</th><th style="width:18%">Responsable</th><th style="width:28%">Indicador de seguimiento</th><th style="text-align:center;width:12%">Estado</th></tr></thead>');
    partes.push('<tbody>' + cronoHTML + '</tbody></table>');
  } else {
    partes.push('<p><i>Cronograma sin definir. Complete el Paso 4 del wizard para asignar semanas y responsables.</i></p>');
  }

  // Seccion 5
  partes.push('<h2>5. Indicadores de seguimiento y verificacion</h2>');
  partes.push('<p>Para verificar la implementacion efectiva del plan, se establecen los siguientes mecanismos de seguimiento:</p>');
  partes.push('<ul>');
  partes.push('<li><b>Indicador cuantitativo:</b> aplicacion de un segundo instrumento IDEA al cierre del proximo periodo, con metas de mejora del <b>10% minimo</b> en las competencias priorizadas.</li>');
  partes.push('<li><b>Indicador cualitativo:</b> observacion de aula focalizada en las estrategias didacticas implementadas, con rubrica de fidelidad de aplicacion.</li>');
  partes.push('<li><b>Indicador de proceso:</b> verificacion quincenal del cumplimiento del cronograma con el responsable institucional asignado: <b>' + escapeHtml(plan.responsable || '-') + '</b>.</li>');
  partes.push('<li><b>Indicador de producto:</b> portafolio de evidencias de aprendizaje por estudiante priorizado, con muestras de inicio, medio y cierre del periodo.</li>');
  partes.push('<li><b>Indicador de impacto en estudiantes en riesgo:</b> ' + (enRiesgo > 0 ? 'seguimiento individualizado de los <b>' + enRiesgo + ' estudiantes</b> en nivel BAJO, con plan de tutoria documentado.' : 'no aplica en esta aplicacion.') + '</li>');
  partes.push('</ul>');

  // v13: Seccion 6 "Articulacion con SIEE y PEI" ELIMINADA. La articulacion
  // institucional es autonomia del docente y de la IE; no compete al
  // instrumento IDEA prescribirla.

  // Seccion 6 (nueva): Puente a la Fase III
  partes.push('<h2>6. Puente a la Fase III - Implementacion en el aula</h2>');
  partes.push('<div class="institucional">');
  partes.push('<p>Este plan cierra la <b>Fase II - Analisis y Planeacion</b> del instrumento IDEA. La <b>Fase III - Implementacion y Accion</b> es enteramente autonomia del docente: sucede en el aula, con sus secuencias didacticas y su juicio profesional para ajustar la ruta segun el avance observado en los estudiantes.</p>');
  partes.push('<p>Sugerencias para llevar este plan al aula esta misma semana:</p>');
  partes.push('<ul>');
  partes.push('<li><b>Empieza con la primera estrategia.</b> Programala para tu proxima clase. No esperes el lunes perfecto.</li>');
  partes.push('<li><b>Lleva una bitacora corta.</b> Anota que funciono, que ajustaste y como respondieron los estudiantes; sera el insumo de la proxima aplicacion.</li>');
  partes.push('<li><b>Conversa con un par.</b> Comparte una vez por semana con otro docente del area. La mejora pedagogica mas sostenible nace del dialogo profesional.</li>');
  partes.push('</ul>');
  partes.push('<p>Al cierre del periodo, una nueva aplicacion del cuadernillo IDEA permitira comparar el impacto concreto del plan que hoy comienza.</p>');
  partes.push('</div>');

  // Anexo rubricas
  partes.push('<h2>Anexo. Rubricas analiticas por nivel de desempeno</h2>');
  partes.push('<div class="anexo">');
  partes.push('<p>Plantilla de rubrica para evaluacion formativa por competencia. Edite los descriptores segun el contexto institucional.</p>');
  partes.push('<table><thead><tr><th>Competencia</th><th style="background:#10B981">SUPERIOR (90-100)</th><th style="background:#FBBF24;color:#1A1613">ALTO (75-89)</th><th style="background:#F59E0B">BASICO (60-74)</th><th style="background:#EF4444">BAJO (0-59)</th></tr></thead><tbody>');
  compKeys.forEach(k => {
    const comp = cuadernillo && cuadernillo.competencias ? (cuadernillo.competencias[k] || k) : k;
    partes.push('<tr><td><b>' + escapeHtml(comp) + '</b></td>');
    partes.push('<td>Resuelve situaciones complejas con argumentacion rigurosa y articula multiples representaciones.</td>');
    partes.push('<td>Resuelve situaciones contextualizadas con procedimientos correctos y justificacion parcial.</td>');
    partes.push('<td>Resuelve situaciones basicas con apoyo y reconoce conceptos centrales.</td>');
    partes.push('<td>Requiere acompanamiento sostenido para alcanzar comprensiones minimas.</td></tr>');
  });
  partes.push('</tbody></table></div>');

  // Firmas editoriales con líneas Unicode decorativas
  partes.push('<h2>7. Firmas de validacion</h2>');
  partes.push('<div class="firma-grid" style="text-align:center;margin-top:60pt;">');
  partes.push('<div class="firma-col">');
  partes.push('<div class="firma-linea">────────────────────</div>');
  partes.push('<div class="firma-nombre">' + escapeHtml(plan.docente_nombre) + '</div>');
  partes.push('<div class="firma-cargo">Docente del area</div>');
  partes.push('</div>');
  partes.push('<div class="firma-col">');
  partes.push('<div class="firma-linea">────────────────────</div>');
  partes.push('<div class="firma-nombre">Coordinacion academica</div>');
  partes.push('<div class="firma-cargo">Nombre y firma</div>');
  partes.push('</div>');
  partes.push('<div class="firma-col">');
  partes.push('<div class="firma-linea">────────────────────</div>');
  partes.push('<div class="firma-nombre">Rectoria</div>');
  partes.push('<div class="firma-cargo">Nombre y firma</div>');
  partes.push('</div>');
  partes.push('</div>');

  // Footer editorial con hairline + huella mono
  partes.push('<div class="footer-doc" style="text-align:center;">');
  partes.push('Instrumento IDEA &middot; Alvaro R. Cordoba B. &middot; <span class="doc-id">' + fecha + '</span> &middot; Documento para uso institucional');
  partes.push('</div>');
  partes.push('</body></html>');

  return partes.join('\n');
}
