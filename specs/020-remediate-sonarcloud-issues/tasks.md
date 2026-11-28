# Tasks: Remediación Integral de los 49 Issues Abiertos en SonarQube Cloud

**Input**: Design documents from `/specs/020-remediate-sonarcloud-issues/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/observability-endpoints-preservation.md`

**Tests**: Se incluyen tareas de pruebas unitarias aditivas en archivos nuevos (`backend/test/unit/observability/audit-sanitizer-remediation.spec.ts` y `frontend/tests/unit/utils/observability-remediation.test.ts`) para cumplir los Principios III, IV y VI de la Constitución (≥ 80% de cobertura en líneas y bifurcaciones de forma independiente por stack y ≥ 80% sobre código nuevo, sin modificar pruebas preexistentes). El único hallazgo ubicado en una prueba existente (`typescript:S5906` en `backend/test/unit/observability/audit-sanitizer.spec.ts:74`) queda resguardado tras la compuerta obligatoria del Principio IV (`T047` → `T048`).

**Organization**: Las tareas están agrupadas por User Story (`US1` → `US4` en orden de prioridad `P1` → `P4`), módulo (`backend/` y `frontend/`) y archivo exacto para habilitar implementación incremental y validación independiente por historia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Ejecutable en paralelo (archivos distintos y sin dependencia sobre tareas incompletas dentro de la misma ola)
- **[Story]**: Historia de usuario a la que pertenece la tarea (`[US1]`, `[US2]`, `[US3]`, `[US4]`) — omitido en Setup, Foundational y Polish
- Todas las descripciones incluyen rutas de archivo exactas, regla SonarQube Cloud, número de línea y restricciones literales de `data-model.md` y `contracts/`

## Path Conventions

- **Backend (NestJS / TypeScript `ES2021`)**: `backend/src/`, `backend/test/`
- **Frontend (React / Vite / TypeScript `ES2022`)**: `frontend/src/`, `frontend/tests/`
- **Contratos & Colección Postman**: `specs/020-remediate-sonarcloud-issues/contracts/`, `postman/`

---

## Phase 1: Setup (Línea Base del Entorno y Verificación Inicial)

**Purpose**: Registrar los pisos vigentes de compilación y cobertura independiente por stack antes de modificar código de producción (ratchet effect del Principio VI) y confirmar la higiene de credenciales y contratos Postman.

- [X] T001 [P] Ejecutar compilación y reporte de cobertura base en `backend/` (`npm run build` y `npm run test:cov` definidos en `backend/package.json`) registrando los porcentajes iniciales de `lines` y `branches` como piso mínimo de no regresión (Principio VI)
- [X] T002 [P] Ejecutar compilación y reporte de cobertura base en `frontend/` (`npm run build` y `npm run test:coverage` definidos en `frontend/package.json`) registrando los porcentajes iniciales de `lines` y `branches` como piso mínimo de no regresión (Principio VI)
- [X] T003 [P] Verificar higiene de credenciales (`SONARQUBE_TOKEN` ausente de archivos versionados y `.env`/`.env.local` cubiertos en `.gitignore`) y estado base inalterado de `postman/football_tokens_auth.postman_collection.json` y `postman/football_tokens.postman_environment.json`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes y Compuertas Constitucionales)

**Purpose**: Confirmar las restricciones de compilador, runtime y política de inmutabilidad de pruebas que condicionan todas las historias de usuario antes de iniciar la remediación.

**⚠️ CRITICAL**: No comenzar ninguna historia de usuario hasta completar esta fase.

- [X] T004 [P] Verificar en `backend/tsconfig.json` (`target: "ES2021"`, `strictNullChecks: false`) y `backend/package.json` (`@types/node ^20.11.24`, Jest `^30.5.2`) la compatibilidad con imports con protocolo `node:` y confirmar la restricción de no utilizar `Array.prototype.toSorted` en `backend/`
- [X] T005 [P] Verificar en `frontend/tsconfig.json` (`target: "ES2022"`, `strict: true`) y `frontend/package.json` (Vitest `^4.1.11`, `@vitest/coverage-v8`) la configuración estricta de tipado y reportes de cobertura de `frontend/`
- [X] T006 [P] Confirmar línea base limpia de inmutabilidad de pruebas ejecutando `git diff --name-only -- backend/test frontend/tests` sobre `backend/test/` y `frontend/tests/` para garantizar el seguimiento estricto del Principio IV durante toda la ejecución

**Checkpoint**: Línea base de compilación, cobertura y compuertas constitucionales verificada — se habilita la implementación de historias de usuario.

---

## Phase 3: User Story 1 - Reducción de Complejidad Cognitiva Crítica en Observabilidad y Auditoría (Priority: P1) 🎯 MVP

**Goal**: Eliminar la totalidad de los **6 hallazgos `CRITICAL`** (`typescript:S3776`: 2 en `backend` y 4 en `frontend`, 69 min de deuda técnica) descomponiendo cada función a una complejidad cognitiva ≤ 15 dentro de su misma capa y módulo, sin alterar resultados funcionales.

**Independent Test**: Verificar que las 6 unidades intervenidas registran complejidad cognitiva ≤ 15 (0 ocurrencias abiertas de `typescript:S3776`), que los tests preexistentes de auditoría y observabilidad pasan con 0 fallos sin modificaciones y que las suites unitarias aditivas cubren ≥ 80% en líneas y bifurcaciones del código nuevo.

### Remediación Backend — User Story 1 (`typescript:S3776`, 2 issues)

- [X] T007 [P] [US1] Descomponer `sanitizarValor` (CC 31 → ≤ 8, regla `typescript:S3776` L70) en `backend/src/observability/utils/audit-sanitizer.util.ts` extrayendo los helpers puros privados `sanitizarValorEspecial(valor: object): { manejado: boolean; resultado?: unknown }` (`Date`, `Buffer`, `RegExp`, `Error`), `sanitizarArray(lista: unknown[], profundidad: number, visitados: WeakSet<object>): unknown[]` (truncado `MAX_ITEMS_ARRAY`), `sanitizarObjetoPlano(registro: Record<string, unknown>, profundidad: number, visitados: WeakSet<object>): Record<string, unknown>` (redacción de claves sensibles y `MAX_CLAVES_OBJETO`) y `sanitizarEstructuraObjeto(objeto: object, profundidad: number, visitados: WeakSet<object>): unknown` (control de ciclos `WeakSet`, `MAX_PROFUNDIDAD_SANITIZACION` y limpieza en `finally`)
- [X] T008 [P] [US1] Descomponer `registerInitialValues` (CC 22 → 0 en orquestador y ≤ 9 por helper, regla `typescript:S3776` L232) en `backend/src/observability/services/app-metrics.service.ts` extrayendo los métodos privados `inicializarMetricasTrading()`, `inicializarMetricasCotizaciones()`, `inicializarMetricasScraping()` e `inicializarMetricasIntegracionesYSoporte()` manteniendo intacta la inicialización de métricas Prometheus y el diseño `Stateless` del `Service`

### Remediación Frontend — User Story 1 (`typescript:S3776`, 4 issues)

- [X] T009 [P] [US1] Descomponer `mapearTerminusLiveness` (CC 19 → ≤ 5, regla `typescript:S3776` L122) en `frontend/src/api/observabilityApi.ts` extrayendo los helpers puros de módulo `resolverDetallesLiveness(data: any): Record<string, any>`, `extraerBytesDesdeMensajeMemoria(mensaje: unknown, permiteGb: boolean): number` y `resolverBytesMemoria(info: any, fallbackBytes: number | undefined, permiteGb: boolean): number`
- [X] T010 [P] [US1] Descomponer el callback `sincronizar` (CC 22 → ≤ 6, regla `typescript:S3776` L44) en `frontend/src/hooks/useObservability.ts` extrayendo a nivel de módulo las funciones puras `resolverResultadoSonda<T>(result: PromiseSettledResult<T>, mensajeFallback: string): { valor: T | null; error: string | null }` y `aplicarFallbackRuntimeALiveness(liveness: SondaLivenessData | null, metricas: MetricasCompletas | null): SondaLivenessData | null`
- [X] T011 [P] [US1] Descomponer `procesarMetricasPrometheus` (CC 16 → 0 en orquestador y ≤ 8 por helper, regla `typescript:S3776` L78) en `frontend/src/utils/formato-observabilidad.ts` extrayendo las 5 funciones puras de módulo `construirMetricasMarketplace(samples)`, `construirMetricasCotizaciones(samples)`, `construirMetricasIngestion(samples)`, `construirMetricasIntegracionYCache(samples)` y `construirMetricasRuntime(samples)`
- [X] T012 [P] [US1] Descomponer `parsePrometheusText` (CC 19 → ≤ 5, regla `typescript:S3776` L13) en `frontend/src/utils/prometheus-parser.ts` extrayendo las funciones puras de módulo `procesarLineaComentario(trimmed, helpMap, typeMap)`, `parsearLabelsPrometheus(labelString)` y `parsearLineaMuestra(trimmed, helpMap, typeMap)`

### Tests Unitarios Aditivos y Validación — User Story 1

- [X] T013 [US1] Crear la suite unitaria aditiva `backend/test/unit/observability/audit-sanitizer-remediation.spec.ts` (depende de T007) cubriendo `sanitizarValor` y sus helpers (`Date`, `Buffer`, `RegExp`, `Error`, truncado `MAX_ITEMS_ARRAY`/`MAX_CLAVES_OBJETO`, límite `MAX_PROFUNDIDAD_SANITIZACION` y referencias circulares) para sostener cobertura ≥ 80% en líneas y bifurcaciones del código nuevo
- [X] T014 [US1] Crear la suite unitaria aditiva `frontend/tests/unit/utils/observability-remediation.test.ts` (depende de T009, T010, T011 y T012) cubriendo los helpers extraídos en `observabilityApi.ts`, `useObservability.ts` (fallback de runtime sobre liveness), `formato-observabilidad.ts` y `prometheus-parser.ts` para sostener cobertura ≥ 80% en líneas y bifurcaciones del código nuevo
- [X] T015 [US1] Ejecutar `npm run test:unit:cov` en `backend/` (`backend/package.json`) y `npm run test:unit` + `npm run test:coverage` en `frontend/` (`frontend/package.json`) confirmando 0 fallos, cobertura independiente ≥ 80% y resolución de los 6 hallazgos `CRITICAL` (`typescript:S3776`)

**Checkpoint**: User Story 1 (MVP) completada y verificada de forma independiente — 6/6 issues `CRITICAL` remediados.

---

## Phase 4: User Story 2 - Prevención de Degradación de Rendimiento y Protección de Invariantes de Dominio (Priority: P2)

**Goal**: Eliminar la totalidad de los **8 hallazgos `MAJOR`** (`typescript:S8786` x5, `typescript:S5869` x1, `typescript:S4043` x1, `typescript:S2933` x1; 5 en `backend` y 3 en `frontend`, 112 min de deuda técnica), garantizando tiempo lineal O(n) en sanitización/parseo y reforzando el `Rich Domain Model`.

**Independent Test**: Verificar 0 ocurrencias en `typescript:S8786`, `S5869`, `S4043` y `S2933`, confirmar procesamiento en tiempo lineal ante entradas extensas/malformadas en auditoría y observabilidad y validar la preservación exacta de invariantes de negocio en `EquipoSemanal` y `EstadisticaJugador`.

### Remediación Backend — User Story 2 (`S8786` x2, `S5869` x1, `S4043` x1, `S2933` x1)

- [X] T016 [P] [US2] Actualizar `REGEX_CREDENCIALES_URL` a `/\b([a-zA-Z][a-zA-Z0-9+.-]{0,31}:\/\/)([^:@\s/]+):([^@\s/]+)@/g` (regla `typescript:S8786` L75, esquema acotado O(n)) y `REGEX_TOKEN_BEARER` a `/\bBearer\s+[\w.~+/-]+=*/gi` (regla `typescript:S5869` L77, sin duplicación `A-Z`/`a-z` bajo flag `i`) en `backend/src/observability/constants/audit-events.constant.ts` manteniendo las constantes exportadas
- [X] T017 [P] [US2] Reemplazar la regex de fallback en el `catch` de `sanitizarUrlProxy` (regla `typescript:S8786` L61) en `backend/src/observability/utils/audit-sanitizer.util.ts` por la función auxiliar lineal O(n) `redactarCredencialUrlSinParser(url: string): string` basada en `indexOf('://')`, `indexOf('@', idx + 3)` y validación anclada de esquema `/^[a-zA-Z][a-zA-Z0-9+.-]{0,31}$/` verificando ausencia de espacios y `/` en credenciales (preservando `'socks5://soloUser@host invalido'` → `'socks5://[REDACTED]@host invalido'`)
- [X] T018 [P] [US2] Refactorizar `EquipoSemanal.seleccionarPorPosicion()` (regla `typescript:S4043` L177) en `backend/src/domain/equipo-semanal.entity.ts` ordenando sobre una copia superficial en sentencia separada (`const ordenados = [...candidatos]; ordenados.sort(compararCandidatos); return ordenados.slice(0, requeridos);`, compatible con `target: "ES2021"` sin `toSorted`), preservando formación táctica estricta `4-3-3` (1 Portero, 4 Defensas, 3 Mediocampistas, 3 Delanteros), criterio determinista de desempate en `compararCandidatos` (mayor `cotizacion.valor`, mayor `cotizacion.score`, orden alfabético por `jugador.nombre`), `MINUTOS_MINIMOS_ELEGIBILIDAD = 270`, unicidad de 11 miembros y validación de semanas cerradas
- [X] T019 [P] [US2] Refactorizar `EstadisticaJugador` (regla `typescript:S2933` L72) en `backend/src/scraping/domain/estadistica-jugador.entity.ts` encapsulando los 25 campos actualizables de métricas (6 contadores numéricos + 19 métricas opcionales `number | null`) en `private readonly _metricas: EstadoMetricasEstadisticas` (`Record<CampoContadorEstadistico, number> & Record<CampoMetricaOpcional, number | null>`), manteniendo `private readonly` en `_id: string`, `_jugadorId: string`, `_temporada: string`, `_liga: string`, `_fuente: string` y `_metricas`, y `private` mutable en `_competencia: string | null`, `_etapa: string | null` y `_fechaActualizacion: Date`; actualizar `actualizarEstadisticas(props)` iterando tipadamente sobre `CAMPOS_CONTADORES_ESTADISTICOS` y `CAMPOS_METRICAS_OPCIONALES` (eliminando `this as unknown as Record<string, unknown>` y conservando CC ≤ 15) y preservando los 33 getters públicos, `EstadisticaJugador.crear(props)` y todas las invariantes (`jugadorId`, `temporada` y `liga` obligatorios y no vacíos; `competencia` ≤ 100 caracteres; `etapa` ≤ 50 caracteres; contadores `goles`, `asistencias`, `partidosJugados`, `minutosJugados`, `tarjetasAmarillas`, `tarjetasRojas` ≥ 0; rangos `rating` ∈ `[0, 10]`, `precisionPase` ∈ `[0, 100]`, `porcentajeAtajadas` ∈ `[0, 100]`)

### Remediación Frontend — User Story 2 (`S8786` x3)

- [X] T020 [P] [US2] Endurecer `extraerBytesDesdeMensajeMemoria` (regla `typescript:S8786` L136 y L147) en `frontend/src/api/observabilityApi.ts` reemplazando cuantificadores ilimitados por patrones acotados lineales O(n) `/\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}(MB|GB)\b/i` y `/\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}MB\b/i` ejecutados con `.exec()`
- [X] T021 [P] [US2] Reemplazar el bucle con regex global en `parsearLabelsPrometheus` (regla `typescript:S8786` L63) en `frontend/src/utils/prometheus-parser.ts` por un escáner lineal O(n) basado en `indexOf('="', pos)` e `indexOf('"', valueStart)` que respete comas dentro de comillas y valide el nombre de etiqueta con `/^\w+$/`

### Tests Unitarios Aditivos y Validación — User Story 2

- [X] T022 [US2] Ampliar `backend/test/unit/observability/audit-sanitizer-remediation.spec.ts` (depende de T016 y T017) con casos de prueba anti-ReDoS y de borde para `redactarCredencialUrlSinParser` (URLs malformadas con espacios, sin usuario y entradas largas repetitivas), `REGEX_CREDENCIALES_URL` y `REGEX_TOKEN_BEARER`
- [X] T023 [US2] Ampliar `frontend/tests/unit/utils/observability-remediation.test.ts` (depende de T020 y T021) con casos de prueba anti-ReDoS y de borde para `mapearTerminusLiveness` (mensajes `MB`/`GB`, decimales y secuencias extensas de dígitos sin sufijo) y `parsePrometheusText` (labels con comas internas y cadenas largas sin `=`)
- [X] T024 [US2] Ejecutar compilación y pruebas unitarias en `backend/` (`npm run build` y `npm run test:unit:cov` en `backend/package.json`, verificando `equipo-semanal`, `estadistica-jugador` y `observability`) y `frontend/` (`npm run build` y `npm run test:unit` en `frontend/package.json`) confirmando 0 fallos y resolución de los 8 hallazgos `MAJOR`

**Checkpoint**: User Stories 1 y 2 completadas y verificadas de forma independiente — 0 `CRITICAL` y 0 `MAJOR`.

---

## Phase 5: User Story 3 - Fidelidad de Registros de Auditoría, Contratos Claros y Validación Numérica Estricta (Priority: P3)

**Goal**: Eliminar los **18 hallazgos `MINOR`** de impacto en diagnóstico, contratos y precisión numérica (`typescript:S6551` x8, `typescript:S7503` x3, `typescript:S7773` x5, `typescript:S6571` x2; 11 en `backend` y 7 en `frontend`, 75 min de deuda técnica) preservando el 100% de los contratos REST/Swagger/Postman.

**Independent Test**: Verificar 0 ocurrencias en `typescript:S6551`, `S7503`, `S7773` y `S6571`, comprobar ausencia de `'[object Object]'` en logs de auditoría, confirmar preservación intacta de `GET /health/ready`, `GET /health/live` y `GET /metrics` contra `contracts/observability-endpoints-preservation.md` y validar cálculos numéricos estrictos en el panel de observabilidad.

### Contratos Base y Remediaciones Independientes — User Story 3

- [X] T025 [P] [US3] Eliminar la rama muerta `return String(valor);` (regla `typescript:S6551` L171) cubriendo exhaustivamente todos los tipos `typeof` en `sanitizarValor`, y exportar las utilidades puras fail-safe `convertirValorATextoSeguro(valor: unknown): string` (narrowing explícito de primitivos `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`, `function`, y `JSON.stringify(sanitizarValor(valor))` dentro de `try/catch` con fallback `'[Objeto no serializable]'`) y `convertirCampoEscalarATexto(valor: unknown): string | null` (retorna `valor` si `string`, `${valor}` si `number | boolean | bigint`, y `null` para `null`, `undefined` u objetos no escalares) en `backend/src/observability/utils/audit-sanitizer.util.ts`
- [X] T026 [P] [US3] Remover `async` innecesario en `checkReadiness(): Promise<HealthCheckResult>` (L39) y `checkLiveness(): Promise<HealthCheckResult>` (L62) en `backend/src/health/health.controller.ts` (regla `typescript:S7503` x2), manteniendo `async` en los callbacks internos con `await` y preservando intactos `@Get('ready')`, `@Get('live')`, `@HealthCheck()`, `@ApiOperation`, `@ApiResponse(200/503)`, umbrales Heap 300 MB / RSS 1 GB y campo `bytes` según `specs/020-remediate-sonarcloud-issues/contracts/observability-endpoints-preservation.md`
- [X] T027 [P] [US3] Remover `async` innecesario en `index(@Res({ passthrough: true }) response: Response): Promise<string>` (regla `typescript:S7503` L23) en `backend/src/observability/controllers/metrics.controller.ts` preservando intactos `@Get()`, `@ApiOperation`, `@ApiProduces('text/plain; version=0.0.4; charset=utf-8')`, `@ApiResponse(200)` y `return super.index(response)` según `specs/020-remediate-sonarcloud-issues/contracts/observability-endpoints-preservation.md`
- [X] T028 [P] [US3] Migrar las invocaciones globales de `parseFloat(...)` a `Number.parseFloat(...)` dentro de `extraerBytesDesdeMensajeMemoria` (regla `typescript:S7773` L138 y L149) en `frontend/src/api/observabilityApi.ts`
- [X] T029 [P] [US3] Simplificar `mercado: 'primario' | 'secundario' | string;` a `mercado: string;` en `DesgloseTransacciones` (regla `typescript:S6571` L52 x2) en `frontend/src/types/observability.types.ts` agregando JSDoc con los valores nominales `'primario'` y `'secundario'` sin restringir etiquetas adicionales provenientes de Prometheus

### Consumidores de Contratos, Tests Aditivos y Validación — User Story 3

- [X] T030 [US3] Reemplazar `sanitizarTexto(String(error))` por `sanitizarTexto(convertirValorATextoSeguro(error))` (regla `typescript:S6551` L107, depende de T025) en `backend/src/observability/aspects/auditar-operacion.decorator.ts`
- [X] T031 [US3] Reemplazar `String(idRaw)`, `String(emailRaw)` y `String(rolRaw)` en `extraerActorHttp` utilizando `convertirCampoEscalarATexto` (regla `typescript:S6551` L76, L81, L83 y L84; calculando `const idTexto = convertirCampoEscalarATexto(idRaw);` una sola vez y verificando `if (user && idTexto?.trim())`, depende de T025) en `backend/src/observability/config/pino-logger.config.ts`
- [X] T032 [US3] Reemplazar `sanitizarTexto(String(msg))` y `sanitizarTexto(String(error))` por `sanitizarTexto(convertirValorATextoSeguro(...))` (regla `typescript:S6551` L154 y L179, depende de T025) en `backend/src/observability/interceptors/audit-logging.interceptor.ts`
- [X] T033 [US3] Migrar `isNaN(...)` a `Number.isNaN(...)` e `isFinite(...)` a `Number.isFinite(...)` (regla `typescript:S7773` L17 y L21 x2) y suprimir el cast innecesario `as any` dejando `s.labels.mercado || 'secundario'` (depende de T029) en `frontend/src/utils/formato-observabilidad.ts`
- [X] T034 [US3] Ampliar `backend/test/unit/observability/audit-sanitizer-remediation.spec.ts` (depende de T025) cubriendo `convertirValorATextoSeguro` (objetos anidados, referencias circulares, secretos redactados, funciones, símbolos, `null`, `undefined`, `BigInt`, fallback `'[Objeto no serializable]'`) y `convertirCampoEscalarATexto` (escalares válidos, `null`, `undefined` y objetos no escalares)
- [X] T035 [US3] Auditar el diff de `backend/src/health/health.controller.ts` y `backend/src/observability/controllers/metrics.controller.ts` contra `specs/020-remediate-sonarcloud-issues/contracts/observability-endpoints-preservation.md` y ejecutar `npm run test:unit:cov` en `backend/` y `npm run test:unit` en `frontend/` confirmando 0 fallos y resolución de los 18 hallazgos `MINOR` de US3

**Checkpoint**: User Stories 1, 2 y 3 completadas y verificadas de forma independiente — 32/49 issues remediados sin alteración de contratos públicos.

---

## Phase 6: User Story 4 - Estandarización, Higiene Expresiva y Deuda Técnica Cero en Todo el Repositorio (Priority: P4)

**Goal**: Eliminar los **17 hallazgos `MINOR`** restantes de estandarización e higiene (`typescript:S7772` x5, `typescript:S6606` x3, `typescript:S7744` x2, `typescript:S6582` x2, `typescript:S6353` x2, `typescript:S7778` x1, `typescript:S6594` x1, `typescript:S5906` x1; 8 en `backend` y 9 en `frontend`, 81 min de deuda técnica) alcanzando 0 hallazgos abiertos bajo estricto cumplimiento del Principio IV.

**Independent Test**: Verificar 0 ocurrencias en las 8 reglas listadas, comprobar preservación de valores falsy significativos (`0`, `''`, `false`), navegación por rol `'ADMIN'` y parseo de métricas Prometheus, y validar el cumplimiento formal de la compuerta del Principio IV para `audit-sanitizer.spec.ts:74`.

### Estandarización Backend — User Story 4 (Código de Producción, 7 issues)

- [X] T036 [P] [US4] Prefijar el import de módulo nativo `'perf_hooks'` como `'node:perf_hooks'` (regla `typescript:S7772` L2) en `backend/src/observability/aspects/auditar-operacion.decorator.ts`
- [X] T037 [P] [US4] Prefijar los imports de módulos nativos `'crypto'` y `'http'` como `'node:crypto'` y `'node:http'` (regla `typescript:S7772` L1 y L2) en `backend/src/observability/config/pino-logger.config.ts`
- [X] T038 [P] [US4] Prefijar el import de módulo nativo `'perf_hooks'` como `'node:perf_hooks'` (regla `typescript:S7772` L9) en `backend/src/observability/interceptors/audit-logging.interceptor.ts`
- [X] T039 [P] [US4] Prefijar el import de módulo nativo `'async_hooks'` como `'node:async_hooks'` (regla `typescript:S7772` L2) en `backend/src/observability/services/audit-context.service.ts`
- [X] T040 [P] [US4] Simplificar la resolución de `requestId` a `const requestId = entrada.requestId ?? this.auditContext.obtenerRequestId();` (regla `typescript:S6606` L80-82, preservando `''`) en `backend/src/observability/services/audit-logger.service.ts`
- [X] T041 [P] [US4] Simplificar la comprobación encadenada a `if (prometheusIoClient?.register && ...)` (regla `typescript:S6582` L72) en `backend/src/observability/services/app-metrics.service.ts`

### Higiene Expresiva Frontend — User Story 4 (Código de Producción, 9 issues)

- [X] T042 [P] [US4] Eliminar ambos `|| {}` redundantes en `resolverDetallesLiveness` dejando `{ ...data?.info, ...data?.error }` (regla `typescript:S7744` L129 x2) en `frontend/src/api/observabilityApi.ts`
- [X] T043 [P] [US4] Extraer `const intervaloInicial = options?.intervaloInicial ?? 10000;` y reutilizarlo en ambos `useState` preservando estrictamente `intervaloInicial: 0` (refresco pausado, regla `typescript:S6606` L20 y L27) en `frontend/src/hooks/useObservability.ts`
- [X] T044 [P] [US4] Aplicar optional chaining `if (!rawText?.trim())` (regla `typescript:S6582` L14), promover la regex de línea de muestra a constante de módulo `REGEX_LINEA_MUESTRA` reemplazando `[0-9]+` por `\d+` (regla `typescript:S6353` L49) e invocarla mediante `REGEX_LINEA_MUESTRA.exec(trimmed)` (regla `typescript:S6594` L49), y verificar la clase concisa `/^\w+$/` en `parsearLabelsPrometheus` (regla `typescript:S6353` L63) en `frontend/src/utils/prometheus-parser.ts`
- [X] T045 [P] [US4] Consolidar las dos llamadas consecutivas a `items.push(...)` dentro del bloque `if (rol === 'ADMIN')` en una sola invocación `items.push({ ...Gobernanza }, { ...Observabilidad })` (regla `typescript:S7778` L39) en `frontend/src/utils/navegacion.ts`

### Tests Aditivos y Compuerta Constitucional de Inmutabilidad — User Story 4 (`typescript:S5906`, 1 issue)

- [X] T046 [US4] Ampliar `frontend/tests/unit/utils/observability-remediation.test.ts` (depende de T043, T044 y T045) agregando pruebas de casos límite para `useObservability` con `intervaloInicial: 0`, `parsePrometheusText` con texto vacío/espacios y líneas con timestamp numérico, y navegación para rol `'ADMIN'`
- [X] T047 [US4] **COMPUERTA OBLIGATORIA (Principio IV — Inmutabilidad de Tests)**: Antes de editar `backend/test/unit/observability/audit-sanitizer.spec.ts` L74 (`typescript:S5906`), solicitar autorización explícita `"sí"` del usuario informando que la aserción conserva exactamente el mismo contrato de longitud `700` y documentando que, en caso de negativa, el archivo permanecerá intacto (48/49 en código + cierre administrativo opcional en SonarQube Cloud) — *Autorización explícita `"sí"` otorgada por el usuario.*
- [X] T048 [US4] *(Condicionado estrictamente a recibir `"sí"` explícito en T047)* Actualizar únicamente la línea 74 de `backend/test/unit/observability/audit-sanitizer.spec.ts` cambiando `expect(sanitizarTexto(largo, false).length).toBe(700);` por `expect(sanitizarTexto(largo, false)).toHaveLength(700);` (regla `typescript:S5906` L74); si el usuario deniega T047, omitir la edición y registrar la excepción constitucional en el cierre — *Aplicado únicamente en L74 con autorización explícita `"sí"` recibida en T047.*
- [X] T049 [US4] Ejecutar `npm run test:unit:cov` en `backend/` (`backend/package.json`) y `npm run test:unit` en `frontend/` (`frontend/package.json`) confirmando 0 fallos y resolución completa de US4

**Checkpoint**: Las 4 User Stories están completas e independientemente verificadas — 49/49 hallazgos remediados (o 48/49 en código + 1 excepción documentada bajo Principio IV si T047 fue denegado).

---

## Phase 7: Polish & Cross-Cutting Concerns (Compuertas Constitucionales, Quickstart y DoD)

**Purpose**: Ejecutar la batería completa de validación definida en `specs/020-remediate-sonarcloud-issues/quickstart.md` y certificar los tres criterios del Definition of Done (DoD #1, #2 y #3) más los Principios I–VI de la Constitución.

- [X] T050 Ejecutar Escenario 1 de `specs/020-remediate-sonarcloud-issues/quickstart.md` compilando ambos módulos (`npm run build` en `backend/package.json` y `npm run build` en `frontend/package.json`) confirmando 0 errores de tipado (`ES2021` / `ES2022` estricto) y empaquetado limpio (DoD #2)
- [X] T051 Ejecutar Escenario 2 de `specs/020-remediate-sonarcloud-issues/quickstart.md` en `backend/` (`npm run test:unit:cov`, `npm run test:cov`, `npm run test:integration` y `npm run test:e2e` con Testcontainers PostgreSQL según `backend/package.json`) confirmando 0 fallos, cobertura independiente ≥ 80% en líneas y bifurcaciones, cobertura ≥ 80% en código nuevo y cero regresión respecto de T001 (Principios III y VI, DoD #1)
- [X] T052 [P] Ejecutar Escenario 3 de `specs/020-remediate-sonarcloud-issues/quickstart.md` en `frontend/` (`npm run test:all` y `npm run test:coverage` según `frontend/package.json`) confirmando 0 fallos, cobertura independiente ≥ 80% en líneas y bifurcaciones, cobertura ≥ 80% en código nuevo y cero regresión respecto de T002 (Principios III y VI, DoD #1)
- [X] T053 [P] Ejecutar Escenario 4 de `specs/020-remediate-sonarcloud-issues/quickstart.md`: auditar `git diff --name-only -- backend/test frontend/tests` (0 pruebas preexistentes modificadas salvo `backend/test/unit/observability/audit-sanitizer.spec.ts` con aprobación explícita de T047), verificar el diff de `backend/src/health/health.controller.ts` y `backend/src/observability/controllers/metrics.controller.ts` contra `specs/020-remediate-sonarcloud-issues/contracts/observability-endpoints-preservation.md`, y registrar explícitamente en el cierre que no hubo cambios de contrato API y que `postman/football_tokens_auth.postman_collection.json` y `postman/football_tokens.postman_environment.json` permanecen 100% sincronizados con OpenAPI/Swagger (Principio IV y DoD #3)
- [X] T054 Verificar seguridad de credenciales (`SONARQUBE_TOKEN` ausente de todo archivo versionado) y ejecutar Escenario 5 de `specs/020-remediate-sonarcloud-issues/quickstart.md` (`python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --summary` tras el análisis en SonarQube Cloud) confirmando 49 → 0 hallazgos abiertos (0 `CRITICAL`, 0 `MAJOR`, 0 `MINOR`, 0 nuevos hallazgos ni duplicaciones adicionales; o 1 exclusivamente si T047 fue declinado bajo Principio IV) — *Credenciales verificadas limpias; los 49/49 hallazgos están remediados localmente y la actualización remota `49 → 0` en SonarQube Cloud se reflejará cuando el usuario realice push/PR y se ejecute el análisis de CI.*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — puede comenzar de inmediato (`T001`, `T002` y `T003` en paralelo).
- **Phase 2 (Foundational)**: Depende de Phase 1 — **BLOQUEA** el inicio de todas las User Stories (`T004`, `T005` y `T006` en paralelo).
- **Phase 3 (US1 - P1 MVP)**: Depende de Phase 2. Resuelve la descomposición estructural base en 6 archivos compartidos (`audit-sanitizer.util.ts`, `app-metrics.service.ts`, `observabilityApi.ts`, `useObservability.ts`, `formato-observabilidad.ts`, `prometheus-parser.ts`), por lo que conviene completarla antes de intervenir los mismos archivos en US2–US4.
- **Phase 4 (US2 - P2)**: Depende de Phase 2 (y de `T007`, `T009`, `T012` para evitar conflictos de merge en `audit-sanitizer.util.ts`, `observabilityApi.ts` y `prometheus-parser.ts`; las tareas `T016`, `T018` y `T019` tocan archivos exclusivos y no dependen de US1).
- **Phase 5 (US3 - P3)**: Depende de Phase 2 (y secuencialmente sobre `audit-sanitizer.util.ts`, `observabilityApi.ts` y `formato-observabilidad.ts` tras US1/US2; `T026`, `T027` y `T029` tocan archivos exclusivos). Dentro de US3, `T025` desbloquea a `T030`, `T031`, `T032` y `T034`; `T029` desbloquea a `T033`.
- **Phase 6 (US4 - P4)**: Depende de Phase 2 (y secuencialmente sobre los archivos compartidos de US1–US3; `T039`, `T040` y `T045` tocan archivos exclusivos). Dentro de US4, `T047` (compuerta del Principio IV) bloquea obligatoriamente a `T048`.
- **Phase 7 (Polish & Validation)**: Depende de la finalización de todas las User Stories planificadas (`T050` precede a `T051` y `T052`; `T054` cierra tras `T050`–`T053`).

### Matriz de Archivos Compartidos Entre Historias (Orden Secuencial Requerido)

| Archivo | US1 (P1) | US2 (P2) | US3 (P3) | US4 (P4) |
| --- | --- | --- | --- | --- |
| `backend/src/observability/utils/audit-sanitizer.util.ts` | `T007` (`S3776`) | `T017` (`S8786`) | `T025` (`S6551` + helpers) | — |
| `backend/src/observability/services/app-metrics.service.ts` | `T008` (`S3776`) | — | — | `T041` (`S6582`) |
| `backend/src/observability/aspects/auditar-operacion.decorator.ts` | — | — | `T030` (`S6551`) | `T036` (`S7772`) |
| `backend/src/observability/config/pino-logger.config.ts` | — | — | `T031` (`S6551` x4) | `T037` (`S7772` x2) |
| `backend/src/observability/interceptors/audit-logging.interceptor.ts` | — | — | `T032` (`S6551` x2) | `T038` (`S7772`) |
| `frontend/src/api/observabilityApi.ts` | `T009` (`S3776`) | `T020` (`S8786` x2) | `T028` (`S7773` x2) | `T042` (`S7744` x2) |
| `frontend/src/hooks/useObservability.ts` | `T010` (`S3776`) | — | — | `T043` (`S6606` x2) |
| `frontend/src/utils/formato-observabilidad.ts` | `T011` (`S3776`) | — | `T033` (`S7773` x3 + cleanup) | — |
| `frontend/src/utils/prometheus-parser.ts` | `T012` (`S3776`) | `T021` (`S8786`) | — | `T044` (`S6582`, `S6353` x2, `S6594`) |

---

## Parallel Execution Examples

### Parallel Example: User Story 1 (6 archivos distintos en simultáneo)

```text
Ola 1 (Remediación CRITICAL en paralelo):
- T007: backend/src/observability/utils/audit-sanitizer.util.ts (S3776)
- T008: backend/src/observability/services/app-metrics.service.ts (S3776)
- T009: frontend/src/api/observabilityApi.ts (S3776)
- T010: frontend/src/hooks/useObservability.ts (S3776)
- T011: frontend/src/utils/formato-observabilidad.ts (S3776)
- T012: frontend/src/utils/prometheus-parser.ts (S3776)

Ola 2 (Suites unitarias aditivas en paralelo tras Ola 1):
- T013: backend/test/unit/observability/audit-sanitizer-remediation.spec.ts
- T014: frontend/tests/unit/utils/observability-remediation.test.ts
```

### Parallel Example: User Story 2 (6 archivos distintos en simultáneo)

```text
Ola 1 (Remediación MAJOR en paralelo):
- T016: backend/src/observability/constants/audit-events.constant.ts (S8786, S5869)
- T017: backend/src/observability/utils/audit-sanitizer.util.ts (S8786)
- T018: backend/src/domain/equipo-semanal.entity.ts (S4043)
- T019: backend/src/scraping/domain/estadistica-jugador.entity.ts (S2933)
- T020: frontend/src/api/observabilityApi.ts (S8786 x2)
- T021: frontend/src/utils/prometheus-parser.ts (S8786)

Ola 2 (Ampliación de tests anti-ReDoS en paralelo tras Ola 1):
- T022: backend/test/unit/observability/audit-sanitizer-remediation.spec.ts
- T023: frontend/tests/unit/utils/observability-remediation.test.ts
```

### Parallel Example: User Story 3 (2 olas con contrato compartido)

```text
Ola 1 (Contratos base y remediaciones independientes en paralelo):
- T025: backend/src/observability/utils/audit-sanitizer.util.ts (S6551 + helpers)
- T026: backend/src/health/health.controller.ts (S7503 x2)
- T027: backend/src/observability/controllers/metrics.controller.ts (S7503)
- T028: frontend/src/api/observabilityApi.ts (S7773 x2)
- T029: frontend/src/types/observability.types.ts (S6571 x2)

Ola 2 (Consumidores en paralelo tras completar T025 y T029):
- T030: backend/src/observability/aspects/auditar-operacion.decorator.ts (S6551)
- T031: backend/src/observability/config/pino-logger.config.ts (S6551 x4)
- T032: backend/src/observability/interceptors/audit-logging.interceptor.ts (S6551 x2)
- T033: frontend/src/utils/formato-observabilidad.ts (S7773 x3 + cleanup S6571)
- T034: backend/test/unit/observability/audit-sanitizer-remediation.spec.ts
```

### Parallel Example: User Story 4 (10 archivos de producción en paralelo)

```text
Ola 1 (Higiene y estandarización en paralelo):
- T036..T041: 6 archivos de backend/src/observability/
- T042..T045: 4 archivos de frontend/src/

Ola 2 (Tests aditivos y compuerta constitucional):
- T046: frontend/tests/unit/utils/observability-remediation.test.ts
- T047 -> T048: Compuerta Principio IV para backend/test/unit/observability/audit-sanitizer.spec.ts:74
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar **Phase 1 (Setup)** y **Phase 2 (Foundational)** registrando pisos de cobertura y verificando compuertas de compilador/tests.
2. Completar **Phase 3 (User Story 1)**: elimina el 100% de los **6 issues `CRITICAL`** (`typescript:S3776`) y crea las dos suites unitarias aditivas.
3. **STOP and VALIDATE** (`T015`): confirmar 0 fallos, cobertura independiente ≥ 80% y 0 tests existentes modificados antes de avanzar.

### Incremental Delivery

1. **Setup + Foundational** (`T001`–`T006`) → Base y pisos de cobertura registrados.
2. **US1 (P1 MVP)** (`T007`–`T015`) → 6/6 `CRITICAL` resueltos.
3. **US2 (P2)** (`T016`–`T024`) → 8/8 `MAJOR` resueltos (anti-ReDoS + `Rich Domain Model`).
4. **US3 (P3)** (`T025`–`T035`) → 18/18 `MINOR` de diagnóstico, contratos y precisión numérica resueltos.
5. **US4 (P4)** (`T036`–`T049`) → 17/17 `MINOR` restantes resueltos respetando la compuerta del Principio IV (`T047` → `T048`).
6. **Polish & DoD** (`T050`–`T054`) → Compilación completa, suites unitarias/integración/E2E con Testcontainers, verificación de cobertura ≥ 80%, auditoría Postman/Swagger y validación final 49 → 0 en SonarQube Cloud.

---

## Notes

- `[P]` indica tareas en archivos independientes sin bloqueo dentro de su ola; respetar la *Matriz de Archivos Compartidos Entre Historias* al combinar trabajo entre fases.
- Ningún archivo de prueba existente en `backend/test/` o `frontend/tests/` puede ser modificado para resolver los 48 hallazgos en código de producción (Principio IV).
- `T048` (`backend/test/unit/observability/audit-sanitizer.spec.ts:74`, `typescript:S5906`) **NO** puede ejecutarse sin un `"sí"` explícito previo del usuario en `T047`.
- Cada fase termina con verificación independiente para garantizar cero regresiones y cumplimiento continuo del umbral ≥ 80% de líneas y bifurcaciones por stack (Principio VI).
