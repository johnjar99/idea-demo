# Graph Report - idea-demo  (2026-08-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 505 nodes · 1124 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5aca4ea5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 24
- Community 26

## God Nodes (most connected - your core abstractions)
1. `exportarReporteGrupoExcel()` - 32 edges
2. `exportarReporteGrupoPDF()` - 31 edges
3. `conclusionesProfundas()` - 23 edges
4. `exportarResultadoEstudianteExcel()` - 22 edges
5. `configArea()` - 19 edges
6. `generarPlanAccionIA()` - 19 edges
7. `aciertosDe()` - 16 edges
8. `logroPorCompetencia()` - 16 edges
9. `nowIso()` - 16 edges
10. `uuid()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `matrizHeatmap()` --calls--> `aciertosDe()`  [EXTRACTED]
  js/analisis.js → js/calculo.js
- `tasaPorDificultad()` --calls--> `aciertosDe()`  [EXTRACTED]
  js/analisis.js → js/calculo.js
- `conclusionesProfundas()` --indirect_call--> `logroPorCompetencia()`  [INFERRED]
  js/analisis.js → js/calculo.js
- `generarRecomendacionesPersonalizables()` --indirect_call--> `logroPorCompetencia()`  [INFERRED]
  js/analisis.js → js/calculo.js
- `insightsAutomaticos()` --indirect_call--> `logroPorCompetencia()`  [INFERRED]
  js/analisis.js → js/calculo.js

## Import Cycles
- None detected.

## Communities (29 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (74): comparativoIndividual(), datosRadar(), estudiantesEnRiesgo(), kpiGrupo(), ALIAS_AREA_BASICA, AREAS, areaSlug(), codigoAfirmacion() (+66 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (51): _ALIAS_AREA, analisisDistractores(), _areaSlug(), asimetria(), coefVariacion(), conclusionesProfundas(), correlacionPuntoBiserial(), cuartiles() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (37): _banda_negra_flowable(), construir_pdf(), contexto_flowables(), contraportada_flowables(), _decode_entities(), _Doc, enunciado_a_flowables(), _img_flowable() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (31): abrirAsistenteSabioIA(), autoIniciarGuia(), getDriverFactory(), GUIA_CONTENIDOS, iconoSabio(), iniciarGuiaSabio(), montarBotonGuia(), resaltarElemento() (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (23): _banda_negra_flowable(), construir_pdf(), contexto_flowables(), contraportada_flowables(), _decode_entities(), _Doc, enunciado_a_flowables(), _img_flowable() (+15 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (18): barrasAgrupadas(), barrasHorizontalesLogro(), configDefault(), lineaEvolucion(), PALETA, COLOR, EXCEL, FONT (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (4): e(), i, n, t()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (18): _cache, cargarHtml2Canvas(), cargarJsPDF(), cargarPdfLib(), _cargarScript(), _adjNivel(), _ajustarNombre(), _cargarImagen() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (18): auth, FB_SDK, fdb, firebaseApp, calcularResumenes(), claveResumen(), COLECCION_RESUMENES, _mismos() (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.24
Nodes (13): abrir(), COLECCIONES, idbClear(), idbDel(), idbGet(), idbGetAll(), idbPut(), _invalidar() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (14): asegurarPdfLib(), cargarLogoIdeaBytes(), descargarPdfDirecto(), exportarCuadernilloOriginalPDF(), textoCentrado(), urlPdfOriginal(), construirBarraFiltros(), emitir() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (7): construirWordHtml(), crearToastContainer(), escapeHtml(), latexToHtml(), latexToPng(), MACROS_KATEX_ES, toast()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (13): buscarPerfil(), cerrarSesion(), _guardarPerfilSesion(), hashPassword(), iniciarSesion(), _leerPerfilSesion(), obtenerSesion(), perfilASesion() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (10): borrarDemos(), cargarDemosTodas(), _clamp(), COLS_DEMO, _completos, _cuadernilloCompleto(), _esDeDemo(), barajado() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (10): contarNoLeidos(), enviarMensaje(), listarHilo(), listarMensajesEnviados(), listarMensajesPara(), marcarTodosLeidos(), PLANTILLAS_DOCENTE, _porFechaAsc() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (3): DESCRIPCIONES_IMAGEN, onerrorPlaceholder, SIN_WEBP

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (5): consumirPermiso(), ESTADOS_APLICACION, otorgarPermisoReintento(), revocarPermiso(), nowIso()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (7): construirAplicacion(), ESTADOS_APLICACION, PERFILES, PERIODOS, poblarDatosDemo(), simularRespuestas(), uuid()

### Community 18 - "Community 18"
Cohesion: 0.28
Nodes (5): guardar(), leer(), quitar_rango(), Quita el rango de preguntas y deja la instruccion gramaticalmente entera. El…, ruta()

### Community 19 - "Community 19"
Cohesion: 0.32
Nodes (7): cargarUsuariosDemo(), db, asegurarPerfilesFijos(), construirPerfiles(), hashPassword(), INSTITUCION_DEMO, PASSWORD_DEMO

### Community 20 - "Community 20"
Cohesion: 0.38
Nodes (4): getDriverFactory(), iniciarTour(), marcarTourCompleto(), TOURS

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): compilable(), dirJs, fallos, pendientes, RAIZ, revisar()

### Community 22 - "Community 22"
Cohesion: 0.60
Nodes (3): cuadernillosLocales(), cuadernillosOcultos(), esEntornoLocal()

## Knowledge Gaps
- **68 isolated node(s):** `ALIAS_AREA_BASICA`, `AREAS`, `ETIQUETAS_DCE_DEFAULT`, `SEMAFORO_CORTES`, `_cacheAciertos` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `romanoPeriodo()` connect `Community 10` to `Community 0`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `db` connect `Community 19` to `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `Community 16` to `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 17`, `Community 19`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `exportarReporteGrupoExcel()` (e.g. with `logroPorAfirmacion()` and `logroPorCompetencia()`) actually correct?**
  _`exportarReporteGrupoExcel()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `exportarReporteGrupoPDF()` (e.g. with `logroPorAfirmacion()` and `logroPorCMC()`) actually correct?**
  _`exportarReporteGrupoPDF()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `conclusionesProfundas()` (e.g. with `logroPorAfirmacion()` and `logroPorCompetencia()`) actually correct?**
  _`conclusionesProfundas()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ALIAS_AREA_BASICA`, `AREAS`, `ETIQUETAS_DCE_DEFAULT` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._