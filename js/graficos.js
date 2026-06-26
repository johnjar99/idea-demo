// graficos.js — Wrappers de Chart.js con paleta IDEA v14 editorial.
// Chart.js se carga via CDN en cada HTML. Toda la paleta proviene de tema.js
// (single source of truth). Sincronizado con tokens.css.

import { THEME } from './tema.js';

// RENDIMIENTO: desactivar las animaciones de Chart.js. En paneles con varios gráficos,
// la animación por defecto (~1s cada uno) se percibe como lentitud/lag en barras y
// círculos. Sin animación, las gráficas aparecen al instante y la navegación fluye.
if (typeof window !== 'undefined' && window.Chart && window.Chart.defaults) {
  window.Chart.defaults.animation = false;
  window.Chart.defaults.animations = {};
}

// ============================================================================
// PALETA derivada de THEME para consumo por los renderers
// ============================================================================
// PALETA v13 RESTAURADA — colores vivos, NO los editoriales oscuros v14.
// Cambios respecto a v14:
//  - Niveles: vivos puros (rojo #EF4444, ámbar #F59E0B, esmeralda #10B981, dorado #D4AF37)
//    para que el donut "Distribución por niveles del grupo" vuelva al look v13.
//  - historico: pasteles vivos del v13 (menta, cielo, fucsia, amarillo) para las
//    barras agrupadas "Avance por componente" (Período I/II/III).
//  - cmc: cambiado a paleta TOTALMENTE distinta de competencias/afirmaciones/evidencias
//    (turquesa profundo, magenta, lima oliva, terracota) para no confundir en CN.
//  - inglesPartes: paleta de 5 colores DISTINTOS entre sí para "Partes del cuadernillo"
//    (antes tenía dos grises repetidos).
const PALETA = {
  // Brand
  rojo: '#DC2626',
  rojoSuave: 'rgba(220, 38, 38, 0.15)',
  rojoFill:  'rgba(220, 38, 38, 0.06)',
  grafito: '#1F1F1F',
  dorado: '#D4AF37',
  doradoSuave: 'rgba(212, 175, 55, 0.2)',
  // Niveles (vivos v13)
  bajo: '#EF4444',
  basico: '#F59E0B',
  alto: '#10B981',
  superior: '#D4AF37',
  // Paletas categóricas
  competencias: ['#6366F1', '#EC4899', '#14B8A6'],       // índigo, magenta, turquesa
  cmc:          ['#0EA5E9', '#D946EF', '#84CC16', '#F97316'], // cielo, fucsia, lima, naranja — DISTINTO de competencias
  historico:    ['#6EE7B7', '#7DD3FC', '#F472B6', '#FCD34D'], // pasteles vivos v13
  inglesPartes: ['#3B82F6', '#A855F7', '#10B981', '#F59E0B', '#EC4899'], // 5 distintos
  // Neutros para grids/axes (se sigue tomando del tema para consistencia con exports)
  axis: THEME.color.ink[500],
  grid: 'rgba(60, 40, 25, 0.06)',
  paper: THEME.color.paper,
  inkBorder: THEME.color.ink[200]
};

// ============================================================================
// Config default para todos los charts (estilo Stripe/Linear)
// ============================================================================
function configDefault() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: 'Inter', size: 12, weight: 500 },
          color: THEME.color.ink[700],
          padding: 14,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: PALETA.paper,
        borderColor: PALETA.inkBorder,
        borderWidth: 1,
        titleColor: THEME.color.ink[900],
        bodyColor: THEME.color.ink[700],
        titleFont: { family: 'Fraunces', weight: 500, size: 14 },
        bodyFont:  { family: 'Inter', size: 12 },
        padding: 14,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        caretSize: 6
      }
    },
    scales: {
      x: {
        ticks: { font: { family: 'Inter', size: 11 }, color: PALETA.axis },
        grid:  { color: PALETA.grid, drawBorder: false, lineWidth: 1 }
      },
      y: {
        ticks: { font: { family: 'Inter', size: 11 }, color: PALETA.axis, callback: v => v + '%' },
        grid:  { color: PALETA.grid, drawBorder: false, lineWidth: 1 },
        beginAtZero: true,
        max: 100
      }
    }
  };
}

// ============================================================================
// Donut aciertos vs desaciertos
// ============================================================================
export function donutAciertos(canvas, correctas, total) {
  const desaciertos = total - correctas;
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Aciertos', 'Desaciertos'],
      datasets: [{
        data: [correctas, desaciertos],
        backgroundColor: [PALETA.alto, PALETA.bajo],
        borderColor: PALETA.paper,
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 12, weight: 500 },
            color: THEME.color.ink[700],
            padding: 14,
            boxWidth: 10, boxHeight: 10,
            usePointStyle: true, pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: PALETA.paper,
          borderColor: PALETA.inkBorder, borderWidth: 1,
          titleColor: THEME.color.ink[900], bodyColor: THEME.color.ink[700],
          titleFont: { family: 'Fraunces', weight: 500, size: 14 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12, cornerRadius: 10
        }
      }
    }
  });
}

// ============================================================================
// Barras horizontales de logro (competencias / afirmaciones / evidencias / dim2)
// ============================================================================
export function barrasHorizontalesLogro(canvas, datos, opciones = {}) {
  const labels = Object.keys(datos);
  const valores = labels.map(k => datos[k]);
  const labelsCompletas = opciones.etiquetasFull ? labels.map(k => opciones.etiquetasFull[k] || k) : labels;
  const colores = labels.map((k, i) =>
    opciones.colorPorClave?.[k] ||
    (opciones.colorBarras || PALETA.competencias[i % PALETA.competencias.length])
  );

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labelsCompletas,
      datasets: [{
        label: opciones.titulo || 'Logro %',
        data: valores,
        backgroundColor: colores,
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 18
      }]
    },
    options: {
      ...configDefault(),
      indexAxis: 'y',
      layout: { padding: { left: 8, right: 24, top: 4, bottom: 4 } },
      plugins: {
        legend: { display: false },
        title: opciones.titulo
          ? { display: true, text: opciones.titulo, font: { family: 'Fraunces', weight: 500, size: 14 }, color: THEME.color.ink[900], padding: { bottom: 12 } }
          : { display: false },
        tooltip: {
          backgroundColor: PALETA.paper,
          borderColor: PALETA.inkBorder, borderWidth: 1,
          titleColor: THEME.color.ink[900], bodyColor: THEME.color.ink[700],
          titleFont: { family: 'Fraunces', weight: 500, size: 14 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12, cornerRadius: 10,
          callbacks: { label: ctx => `${ctx.parsed.x}% de logro` }
        }
      },
      scales: {
        x: {
          beginAtZero: true, max: 100,
          ticks: { font: { family: 'Inter', size: 11 }, color: PALETA.axis, callback: v => v + '%' },
          grid:  { color: PALETA.grid, drawBorder: false }
        },
        y: {
          afterFit: (scale) => { scale.width = Math.max(scale.width, 280); },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: THEME.color.ink[700],
            autoSkip: false,
            crossAlign: 'far',
            callback: function(value) {
              const lbl = this.getLabelForValue(value) || '';
              if (lbl.length <= 48) return lbl;
              // Wrap inteligente por palabras a ~46 chars por línea (máx 2 líneas)
              const palabras = lbl.split(' ');
              const lineas = [];
              let actual = '';
              for (const p of palabras) {
                if ((actual + ' ' + p).trim().length > 46) {
                  if (actual) lineas.push(actual.trim());
                  actual = p;
                } else {
                  actual = (actual + ' ' + p).trim();
                }
                if (lineas.length >= 2) break;
              }
              if (actual && lineas.length < 2) lineas.push(actual);
              else if (actual && lineas.length === 2) lineas[1] = lineas[1].replace(/...$/, '…');
              return lineas;
            }
          },
          grid:  { display: false }
        }
      }
    }
  });
}

// ============================================================================
// Línea de evolución temporal
// ============================================================================
export function lineaEvolucion(canvas, serie, opciones = {}) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: serie.map(s => s.label),
      datasets: [{
        label: opciones.titulo || 'Puntaje',
        data: serie.map(s => s.valor),
        borderColor: PALETA.rojo,
        backgroundColor: PALETA.rojoFill,
        pointBackgroundColor: PALETA.rojo,
        pointBorderColor: PALETA.paper,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      ...configDefault(),
      plugins: {
        legend: { display: !!opciones.titulo, position: 'bottom',
          labels: { font: { family: 'Inter', size: 12 }, color: THEME.color.ink[700], usePointStyle: true } },
        title: opciones.titulo
          ? { display: true, text: opciones.titulo, font: { family: 'Fraunces', weight: 500, size: 14 }, color: THEME.color.ink[900] }
          : { display: false },
        tooltip: {
          backgroundColor: PALETA.paper, borderColor: PALETA.inkBorder, borderWidth: 1,
          titleColor: THEME.color.ink[900], bodyColor: THEME.color.ink[700],
          titleFont: { family: 'Fraunces', weight: 500, size: 14 },
          bodyFont: { family: 'Inter', size: 12 }, padding: 12, cornerRadius: 10
        }
      }
    }
  });
}

// ============================================================================
// Barras agrupadas (histórico comparativo entre periodos)
// ============================================================================
export function barrasAgrupadas(canvas, categorias, grupos, opciones = {}) {
  const colores = PALETA.historico;
  const completas = opciones.etiquetasCompletas || categorias;
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: categorias,
      datasets: grupos.map((g, i) => ({
        label: g.label,
        data: g.valores,
        // Con un solo período (1 dataset) se puede colorear cada barra distinto
        // (por competencia) vía opciones.coloresPorBarra; con varios períodos se
        // mantiene un color por período para poder compararlos.
        backgroundColor: (grupos.length === 1 && Array.isArray(opciones.coloresPorBarra)) ? opciones.coloresPorBarra : colores[i % colores.length],
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.82,
        categoryPercentage: 0.72
      }))
    },
    options: {
      ...configDefault(),
      plugins: {
        legend: { position: 'bottom',
          labels: { font: { family: 'Inter', size: 12 }, color: THEME.color.ink[700], usePointStyle: true, boxWidth: 10, boxHeight: 10, padding: 14 } },
        tooltip: {
          backgroundColor: PALETA.paper, borderColor: PALETA.inkBorder, borderWidth: 1,
          titleColor: THEME.color.ink[900], bodyColor: THEME.color.ink[700],
          titleFont: { family: 'Fraunces', weight: 500, size: 14 },
          bodyFont: { family: 'Inter', size: 12 }, padding: 12, cornerRadius: 10,
          callbacks: {
            title: (items) => completas[items[0].dataIndex] || items[0].label,
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`
          }
        }
      }
    }
  });
}

// ============================================================================
// Sparkline mini (tendencia rápida sin ejes)
// ============================================================================
export function spark(canvas, valores) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: valores.map((_, i) => i + 1),
      datasets: [{
        data: valores,
        borderColor: PALETA.rojo,
        backgroundColor: PALETA.rojoFill,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

export { PALETA };
