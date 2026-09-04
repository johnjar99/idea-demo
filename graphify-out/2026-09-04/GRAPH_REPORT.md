# Graph Report - idea-demo  (2026-08-25)

## Corpus Check
- 232 files · ~9,863,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 507 nodes · 1125 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf5f4ae2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- analisis.js
- pedagogia-grado.js
- generar_pdf_p2.py
- sabio-pedagogia.js
- generar_pdf_p1.py
- tema.js
- i
- certificado.js
- resumenes.js
- db.js
- cuadernillo-pdf-original.js
- utils.js
- auth.js
- sembrar-demos.js
- mensajes.js
- extractor-imagenes.js
- nowIso
- seed.js
- limpiar_duplicados_lectura.py
- perfiles-fijos.js
- tour.js
- verificar_sintaxis_web.mjs
- release-local.js
- verificar_todo.py
- generar_webp.py
- export-pdf.js
- CLAUDE.md

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
- `comparativoIndividual()` --indirect_call--> `logroPorCompetencia()`  [INFERRED]
  js/analisis.js → js/calculo.js
- `comparativoIndividual()` --indirect_call--> `logroPorDimensionSecundaria()`  [INFERRED]
  js/analisis.js → js/calculo.js
- `datosRadar()` --indirect_call--> `logroPorCompetencia()`  [INFERRED]
  js/analisis.js → js/calculo.js
- `matrizHeatmap()` --calls--> `aciertosDe()`  [EXTRACTED]
  js/analisis.js → js/calculo.js
- `tasaPorDificultad()` --calls--> `aciertosDe()`  [EXTRACTED]
  js/analisis.js → js/calculo.js

## Import Cycles
- None detected.

## Communities (31 total, 3 thin omitted)

### Community 0 - "analisis.js"
Cohesion: 0.07
Nodes (91): _ALIAS_AREA, _areaSlug(), asimetria(), coefVariacion(), comparativoIndividual(), conclusionesProfundas(), correlacionPuntoBiserial(), cuartiles() (+83 more)

### Community 1 - "pedagogia-grado.js"
Cohesion: 0.27
Nodes (9): aliasAreaSlug(), _leerCelda(), _leerDe(), _leerDePeriodo(), _norm(), _normPeriodo(), pedagogiaDe(), _resolver() (+1 more)

### Community 2 - "generar_pdf_p2.py"
Cohesion: 0.14
Nodes (23): _banda_negra_flowable(), construir_pdf(), contexto_flowables(), contraportada_flowables(), _decode_entities(), _Doc, enunciado_a_flowables(), _img_flowable() (+15 more)

### Community 3 - "sabio-pedagogia.js"
Cohesion: 0.10
Nodes (30): abrirAsistenteSabioIA(), autoIniciarGuia(), getDriverFactory(), GUIA_CONTENIDOS, iconoSabio(), iniciarGuiaSabio(), montarBotonGuia(), resaltarElemento() (+22 more)

### Community 4 - "generar_pdf_p1.py"
Cohesion: 0.09
Nodes (37): _banda_negra_flowable(), construir_pdf(), contexto_flowables(), contraportada_flowables(), _decode_entities(), _Doc, enunciado_a_flowables(), _img_flowable() (+29 more)

### Community 5 - "tema.js"
Cohesion: 0.09
Nodes (18): barrasAgrupadas(), barrasHorizontalesLogro(), configDefault(), lineaEvolucion(), PALETA, COLOR, EXCEL, FONT (+10 more)

### Community 6 - "i"
Cohesion: 0.13
Nodes (4): e(), i, n, t()

### Community 7 - "certificado.js"
Cohesion: 0.18
Nodes (19): _cache, cargarHtml2Canvas(), cargarJsPDF(), cargarLibsPDF(), cargarPdfLib(), _cargarScript(), _adjNivel(), _ajustarNombre() (+11 more)

### Community 8 - "resumenes.js"
Cohesion: 0.19
Nodes (18): auth, FB_SDK, fdb, firebaseApp, calcularResumenes(), claveResumen(), COLECCION_RESUMENES, _mismos() (+10 more)

### Community 9 - "db.js"
Cohesion: 0.24
Nodes (13): abrir(), COLECCIONES, idbClear(), idbDel(), idbGet(), idbGetAll(), idbPut(), _invalidar() (+5 more)

### Community 10 - "cuadernillo-pdf-original.js"
Cohesion: 0.27
Nodes (14): asegurarPdfLib(), cargarLogoIdeaBytes(), descargarPdfDirecto(), exportarCuadernilloOriginalPDF(), textoCentrado(), urlPdfOriginal(), construirBarraFiltros(), emitir() (+6 more)

### Community 11 - "utils.js"
Cohesion: 0.17
Nodes (7): construirWordHtml(), crearToastContainer(), escapeHtml(), latexToHtml(), latexToPng(), MACROS_KATEX_ES, toast()

### Community 12 - "auth.js"
Cohesion: 0.25
Nodes (13): buscarPerfil(), cerrarSesion(), _guardarPerfilSesion(), hashPassword(), iniciarSesion(), _leerPerfilSesion(), obtenerSesion(), perfilASesion() (+5 more)

### Community 13 - "sembrar-demos.js"
Cohesion: 0.25
Nodes (11): INSTITUCION_DEMO, borrarDemos(), cargarDemosTodas(), _clamp(), COLS_DEMO, _completos, _cuadernilloCompleto(), _esDeDemo() (+3 more)

### Community 14 - "mensajes.js"
Cohesion: 0.29
Nodes (10): contarNoLeidos(), enviarMensaje(), listarHilo(), listarMensajesEnviados(), listarMensajesPara(), marcarTodosLeidos(), PLANTILLAS_DOCENTE, _porFechaAsc() (+2 more)

### Community 15 - "extractor-imagenes.js"
Cohesion: 0.20
Nodes (3): DESCRIPCIONES_IMAGEN, onerrorPlaceholder, SIN_WEBP

### Community 16 - "nowIso"
Cohesion: 0.24
Nodes (5): consumirPermiso(), ESTADOS_APLICACION, otorgarPermisoReintento(), revocarPermiso(), nowIso()

### Community 17 - "seed.js"
Cohesion: 0.33
Nodes (7): construirAplicacion(), ESTADOS_APLICACION, PERFILES, PERIODOS, poblarDatosDemo(), simularRespuestas(), uuid()

### Community 18 - "limpiar_duplicados_lectura.py"
Cohesion: 0.28
Nodes (5): guardar(), leer(), quitar_rango(), Quita el rango de preguntas y deja la instruccion gramaticalmente entera. El…, ruta()

### Community 19 - "perfiles-fijos.js"
Cohesion: 0.38
Nodes (6): cargarUsuariosDemo(), db, asegurarPerfilesFijos(), construirPerfiles(), hashPassword(), PASSWORD_DEMO

### Community 20 - "tour.js"
Cohesion: 0.38
Nodes (4): getDriverFactory(), iniciarTour(), marcarTourCompleto(), TOURS

### Community 21 - "verificar_sintaxis_web.mjs"
Cohesion: 0.33
Nodes (6): compilable(), dirJs, fallos, pendientes, RAIZ, revisar()

### Community 22 - "release-local.js"
Cohesion: 0.60
Nodes (3): cuadernillosLocales(), cuadernillosOcultos(), esEntornoLocal()

### Community 29 - "export-pdf.js"
Cohesion: 0.15
Nodes (25): analisisDistractores(), histogramaPuntajes(), proyeccionSaber11Parcial(), _addImagenCanvas(), _addLogo(), agregarSeccionComoPagina(), _aliasDe(), _aliasPorDoc (+17 more)

## Knowledge Gaps
- **69 isolated node(s):** `graphify`, `ALIAS_AREA_BASICA`, `AREAS`, `ETIQUETAS_DCE_DEFAULT`, `SEMAFORO_CORTES` (+64 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `romanoPeriodo()` connect `cuadernillo-pdf-original.js` to `export-pdf.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `db` connect `perfiles-fijos.js` to `resumenes.js`, `db.js`, `auth.js`, `sembrar-demos.js`, `mensajes.js`, `nowIso`, `seed.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `nowIso()` connect `nowIso` to `db.js`, `utils.js`, `auth.js`, `sembrar-demos.js`, `mensajes.js`, `seed.js`, `perfiles-fijos.js`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `exportarReporteGrupoExcel()` (e.g. with `logroPorAfirmacion()` and `logroPorCompetencia()`) actually correct?**
  _`exportarReporteGrupoExcel()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `exportarReporteGrupoPDF()` (e.g. with `logroPorAfirmacion()` and `logroPorCMC()`) actually correct?**
  _`exportarReporteGrupoPDF()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `conclusionesProfundas()` (e.g. with `logroPorAfirmacion()` and `logroPorCompetencia()`) actually correct?**
  _`conclusionesProfundas()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify`, `ALIAS_AREA_BASICA`, `AREAS` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._