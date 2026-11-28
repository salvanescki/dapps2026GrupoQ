# Phase 0 Research: Remediación Integral de los 49 Issues Abiertos en SonarQube Cloud

**Feature**: `020-remediate-sonarcloud-issues`
**Proyecto SonarQube Cloud**: `salvanescki_dapps2026GrupoQ` (Organización `salvanescki`, Región EU)
**Alcance técnico verificado**: **49 issues abiertos** en **17 reglas** distribuidos en **19 archivos** (**13** en `backend` con 26 issues y **6** en `frontend` con 23 issues).
**Fuente de verdad**: Salida de `python3 .agents/skills/sonarqube-speckit/scripts/sonarcloud_issues.py --speckit-brief` e inspección directa de los 19 archivos afectados y sus suites de prueba existentes.

---

## 1. Contexto Técnico del Entorno Verificado

- **Backend**: NestJS `^11.2.5`, TypeScript `^5.3.3` con `target: "ES2021"` (`backend/tsconfig.json`), `strictNullChecks: false`, `@types/node ^20.11.24`, Jest `^30.5.2` + `ts-jest`, Testcontainers PostgreSQL (`@testcontainers/postgresql ^10.7.1`), `nestjs-pino ^4.6.1`, `@nestjs/terminus ^11.1.1`, `@willsoto/nestjs-prometheus ^7.0.0`, `prom-client ^15.1.3`.
- **Frontend**: React `^18.3.1`, TypeScript `~5.6.0` con `target: "ES2022"` y `strict: true` (`frontend/tsconfig.json`), Vite `^6.0.0`, Vitest `^4.1.11` con `@vitest/coverage-v8 ^4.1.11`, jsdom `^25.0.1`.
- **Hallazgo clave de compilación**: Debido a que `backend/tsconfig.json` define `target: "ES2021"` sin incluir `ES2023` en `lib`, `Array.prototype.toSorted()` no está disponible en el tipado del `backend`. Cualquier remediación de ordenamiento (`typescript:S4043`) debe usar copia superficial + `.sort()` en sentencia separada.

---

## 2. Decisiones Técnicas de Remediación por Regla (17 Reglas / 49 Issues)

### Grupo A — Severidad `CRITICAL` (1 regla, 6 ocurrencias)

#### R-01: `typescript:S3776` — Complejidad Cognitiva ≤ 15 (6 ocurrencias: 2 `backend`, 4 `frontend`)

| Archivo | Línea | Función afectada | CC actual | Meta |
| --- | --- | --- | --- | --- |
| `backend/src/observability/utils/audit-sanitizer.util.ts` | 70 | `sanitizarValor` | 31 | ≤ 15 |
| `backend/src/observability/services/app-metrics.service.ts` | 232 | `registerInitialValues` | 22 | ≤ 15 |
| `frontend/src/api/observabilityApi.ts` | 122 | `mapearTerminusLiveness` | 19 | ≤ 15 |
| `frontend/src/hooks/useObservability.ts` | 44 | `sincronizar` (callback en `useCallback`) | 22 | ≤ 15 |
| `frontend/src/utils/formato-observabilidad.ts` | 78 | `procesarMetricasPrometheus` | 16 | ≤ 15 |
| `frontend/src/utils/prometheus-parser.ts` | 13 | `parsePrometheusText` | 19 | ≤ 15 |

- **Decision**:
  1. **`audit-sanitizer.util.ts` (`sanitizarValor`, CC 31 → ≤ 8)**: Extraer funciones puras privadas en el mismo módulo respetando la cohesión funcional:
     - `sanitizarValorEspecial(valor: object): { manejado: boolean; resultado?: unknown }` para `Date`, `Buffer`, `RegExp` y `Error`.
     - `sanitizarArray(lista: unknown[], profundidad: number, visitados: WeakSet<object>): unknown[]` para truncado de arrays (`MAX_ITEMS_ARRAY`) y recursión.
     - `sanitizarObjetoPlano(registro: Record<string, unknown>, profundidad: number, visitados: WeakSet<object>): Record<string, unknown>` para redacción de claves sensibles y truncado (`MAX_CLAVES_OBJETO`).
     - `sanitizarEstructuraObjeto(objeto: object, profundidad: number, visitados: WeakSet<object>): unknown` para control de ciclos (`WeakSet`), `MAX_PROFUNDIDAD_SANITIZACION` y limpieza en `finally`.
     - `sanitizarValor` delega primitivos (`null`, `undefined`, `boolean`, `number`, `bigint`, `string`, `symbol`, `function`), luego invoca `sanitizarValorEspecial` y finalmente `sanitizarEstructuraObjeto` (eliminando además la rama muerta de línea 171 señalada por `S6551`).
  2. **`app-metrics.service.ts` (`registerInitialValues`, CC 22 → 0 en método orquestador, ≤ 9 por helper)**: Descomponer en cuatro métodos privados alineados a las secciones ya comentadas en el archivo:
     - `inicializarMetricasTrading()` (CC 9)
     - `inicializarMetricasCotizaciones()` (CC 7)
     - `inicializarMetricasScraping()` (CC 2)
     - `inicializarMetricasIntegracionesYSoporte()` (CC 5)
  3. **`observabilityApi.ts` (`mapearTerminusLiveness`, CC 19 → ≤ 5)**: Extraer funciones puras privadas/de módulo:
     - `resolverDetallesLiveness(data: any): Record<string, any>` (resuelve también `S7744`).
     - `extraerBytesDesdeMensajeMemoria(mensaje: unknown, permiteGb: boolean): number` (centraliza el parseo lineal sin backtracking de `MB`/`GB` resolviendo también `S8786` y `S7773`).
     - `resolverBytesMemoria(info: any, fallbackBytes: number | undefined, permiteGb: boolean): number`.
  4. **`useObservability.ts` (`sincronizar`, CC 22 → ≤ 6)**: Extraer funciones puras a nivel de módulo fuera del hook:
     - `resolverResultadoSonda<T>(result: PromiseSettledResult<T>, mensajeFallback: string): { valor: T | null; error: string | null }` para eliminar los 3 bloques condicionales repetidos de `Promise.allSettled`.
     - `aplicarFallbackRuntimeALiveness(liveness: SondaLivenessData | null, metricas: MetricasCompletas | null): SondaLivenessData | null` para encapsular el recálculo de fallback de memoria desde runtime Node.js.
  5. **`formato-observabilidad.ts` (`procesarMetricasPrometheus`, CC 16 → 0 en orquestador, ≤ 8 por helper)**: Descomponer en 5 funciones puras de módulo correspondientes a cada bloque del tablero:
     - `construirMetricasMarketplace(samples)`
     - `construirMetricasCotizaciones(samples)`
     - `construirMetricasIngestion(samples)`
     - `construirMetricasIntegracionYCache(samples)`
     - `construirMetricasRuntime(samples)`
  6. **`prometheus-parser.ts` (`parsePrometheusText`, CC 19 → ≤ 5)**: Extraer funciones puras de módulo:
     - `procesarLineaComentario(trimmed, helpMap, typeMap)` para `# HELP ` y `# TYPE `.
     - `parsearLabelsPrometheus(labelString)` para extracción lineal de etiquetas `clave="valor"` (resuelve también `S8786` y `S6353`).
     - `parsearLineaMuestra(trimmed, helpMap, typeMap)` para parsear una muestra válida y asociar su `help`/`type` (resuelve también `S6353` y `S6594`).
- **Rationale**: Mantiene cada función dentro de su misma capa y módulo (sin filtrar lógica de negocio entre capas), baja la complejidad muy por debajo del umbral de 15 y facilita pruebas unitarias directas de las nuevas unidades auxiliares para cumplir con el ≥ 80% de cobertura en líneas y bifurcaciones.
- **Alternatives considered**:
  - *Extraer clases o servicios nuevos inyectables*: Descartado por sobreingeniería; en NestJS alteraría grafos de inyección y mocks de tests existentes (riesgo contra Principio IV).
  - *Suprimir advertencias con `// NOSONAR`*: Descartado explícitamente por la spec (FR-001, FR-002).

---

### Grupo B — Severidad `MAJOR` (4 reglas, 8 ocurrencias)

#### R-02: `typescript:S8786` — Expresiones Regulares con Retroceso Superlineal / Polynomial ReDoS (5 ocurrencias: 2 `backend`, 3 `frontend`)

| Archivo | Línea | Patrón actual | Causa exacta del retroceso superlineal |
| --- | --- | --- | --- |
| `backend/src/observability/constants/audit-events.constant.ts` | 75 | `/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:@\s/]+):([^@\s/]+)@/g` | Prefijo no anclado con cuantificador ilimitado `[a-zA-Z0-9+.-]*` antes de `://` produce O(n²) sobre cadenas largas de letras sin `://`. |
| `backend/src/observability/utils/audit-sanitizer.util.ts` | 61 | `/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^@\s/]+)@/g` | Misma causa en la ruta de fallback de `sanitizarUrlProxy` cuando `new URL(url)` lanza excepción. |
| `frontend/src/api/observabilityApi.ts` | 136 | `/(\d+(?:\.\d+)?)\s*MB/i` | `\d+` no anclado seguido de `\s*MB` produce O(n²) sobre secuencias largas de dígitos sin `MB`. |
| `frontend/src/api/observabilityApi.ts` | 147 | `/(\d+(?:\.\d+)?)\s*(MB|GB)/i` | Misma causa sobre secuencias largas de dígitos sin `MB`/`GB`. |
| `frontend/src/utils/prometheus-parser.ts` | 63 | `/([a-zA-Z_0-9]+)="([^"]*)"/g` | `[a-zA-Z_0-9]+` no anclado antes de `=` produce O(n²) sobre cadenas largas de caracteres de palabra sin `=`. |

- **Decision**:
  1. **`audit-events.constant.ts` L75 (`REGEX_CREDENCIALES_URL`)**: Reemplazar por un patrón con límite de palabra y longitud máxima acotada de esquema (RFC 3986):
     ```ts
     export const REGEX_CREDENCIALES_URL =
       /\b([a-zA-Z][a-zA-Z0-9+.-]{0,31}:\/\/)([^:@\s/]+):([^@\s/]+)@/g;
     ```
     Al acotar el esquema a `{0,31}` tras `\b`, cada posición realiza trabajo O(1) antes de `://`, y como `[^:@\s/]+` y `[^@\s/]+` excluyen `/` y `@` (y la primera también `:`), el tiempo de ejecución total es estrictamente lineal O(n). Mantiene la constante exportada para retrocompatibilidad.
  2. **`audit-sanitizer.util.ts` L61 (`sanitizarUrlProxy` catch)**: Eliminar la expresión regular de fallback y delegar a una función auxiliar lineal `redactarCredencialUrlSinParser(url: string): string` basada en búsqueda determinista por índices (`indexOf('://')` e `indexOf('@', idx + 3)`), validando el esquema con regex anclada en ambos extremos (`/^[a-zA-Z][a-zA-Z0-9+.-]{0,31}$/`) y verificando que las credenciales no contengan espacios ni `/`. Tiempo estrictamente O(n) sin backtracking posible, preservando `'socks5://soloUser@host invalido'` → `'socks5://[REDACTED]@host invalido'`.
  3. **`observabilityApi.ts` L136 y L147**: Unificar en el helper `extraerBytesDesdeMensajeMemoria(mensaje: unknown, permiteGb: boolean): number` utilizando regex con límite de palabra y cuantificadores acotados (`/\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}(MB|GB)\b/i` y `/\b(\d{1,12}(?:\.\d{1,6})?)\s{0,4}MB\b/i`, ejecutados con `.exec()` y `Number.parseFloat`). Al no existir cuantificadores ilimitados, la evaluación es estrictamente O(n) y no dispara `S8786` ni `S6594` ni `S7773`.
  4. **`prometheus-parser.ts` L63 (`parsearLabelsPrometheus`)**: Reemplazar el bucle con regex global por un escáner lineal O(n) basado en `indexOf('="', pos)` e `indexOf('"', valueStart)` que extrae pares `clave="valor"` respetando comas dentro de comillas y validando el nombre de etiqueta con `/^\w+$/` (anclada inicio/fin). Resuelve simultáneamente `S8786` y `S6353` en línea 63.
- **Rationale**: Garantiza complejidad temporal O(n) verificable ante entradas extensas o malformadas (cumpliendo FR-003 y Edge Cases de la spec) y conserva 100% de las coincidencias válidas e inválidas de los tests existentes.
- **Alternatives considered**:
  - *Usar lookbehinds complejos `(?<![...])` manteniendo cuantificadores ilimitados*: Más frágil frente a las heurísticas de `S8786` en SonarJS y menos legible que cuantificadores acotados o escáneres por índice.

#### R-03: `typescript:S5869` — Caracteres Duplicados en Clase de Caracteres (1 ocurrencia: `backend`)

| Archivo | Línea | Patrón actual | Causa |
| --- | --- | --- | --- |
| `backend/src/observability/constants/audit-events.constant.ts` | 77 | `/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi` | Con el flag `i` (case-insensitive), los rangos `A-Z` y `a-z` son duplicados dentro de la misma clase. |

- **Decision**: Reemplazar por `/\bBearer\s+[\w.~+/-]+=*/gi`.
- **Rationale**: `\w` cubre exactamente `[A-Za-z0-9_]`, por lo que `[\w.~+/-]` representa el conjunto idéntico de caracteres sin duplicación entre `A-Z`/`a-z`, sin escapar `-` innecesariamente (ubicado al final de la clase) y evitando cualquier alerta futura de `S6353`.
- **Alternatives considered**: `/\bBearer\s+[a-z0-9\-._~+/]+=*/gi` (válido, pero `[\w.~+/-]` es más conciso y estándar).

#### R-04: `typescript:S4043` — Mutación In-Place de `Array.prototype.sort` en Expresión de Retorno (1 ocurrencia: `backend`)

| Archivo | Línea | Código actual |
| --- | --- | --- |
| `backend/src/domain/equipo-semanal.entity.ts` | 177 | `return candidatos.sort(compararCandidatos).slice(0, requeridos);` |

- **Decision**: Realizar el ordenamiento sobre una copia superficial en una sentencia separada:
  ```ts
  const ordenados = [...candidatos];
  ordenados.sort(compararCandidatos);
  return ordenados.slice(0, requeridos);
  ```
- **Rationale**: Compatible con `target: "ES2021"` configurado en `backend/tsconfig.json`, evita mutar directamente la referencia `candidatos` en la expresión de retorno, preserva el algoritmo `compararCandidatos` y mantiene 100% intactas las invariantes de formación 4-3-3 en la capa Model (Rich Domain Model).
- **Alternatives considered**:
  - *`candidatos.toSorted(compararCandidatos)`*: Rechazado porque `toSorted` requiere `ES2023` en `tsconfig.json` y rompería `npm run build` en `backend` sin alterar la configuración global del compilador.

#### R-05: `typescript:S2933` — Miembros de Clase No Marcados como `readonly` (1 ocurrencia: `backend`)

| Archivo | Línea | Mensaje | Causa raíz verificada |
| --- | --- | --- | --- |
| `backend/src/scraping/domain/estadistica-jugador.entity.ts` | 72 | `Mark these members as readonly.` | Los 25 atributos privados de métricas (`_partidosJugados` .. `_autogoles`) solo tienen asignación estática en el constructor porque `actualizarEstadisticas()` los muta dinámicamente mediante `(this as unknown as Record<string, unknown>)['_' + campo] = valor`. |

- **Decision**: Encapsular los 25 campos actualizables de métricas en un único atributo interno fuertemente tipado `private readonly _metricas: EstadoMetricasEstadisticas` (donde `EstadoMetricasEstadisticas = Record<CampoContadorEstadistico, number> & Record<CampoMetricaOpcional, number | null>`), inicializado en el constructor y actualizado con seguridad de tipos en `actualizarEstadisticas()` mediante iteración separada sobre `CAMPOS_CONTADORES_ESTADISTICOS` y `CAMPOS_METRICAS_OPCIONALES`. Se mantienen exactamente los mismos getters públicos y las mismas reglas de `validarInvariantes()`. Los campos escalares que sí se reasignan directamente (`_competencia`, `_etapa`, `_fechaActualizacion`) permanecen mutables, mientras los inmutables (`_id`, `_jugadorId`, `_temporada`, `_liga`, `_fuente`, `_metricas`) son genuinamente `private readonly`.
- **Rationale**: Resuelve `S2933` sin mentir al sistema de tipos, elimina el cast inseguro `this as unknown as Record<string, unknown>`, fortalece el `Rich Domain Model` (Principio II) y se verificó mediante grep que ningún test ni repositorio accede a atributos privados `_...` de `EstadisticaJugador`.
- **Alternatives considered**:
  - *Marcar los 25 campos como `readonly` manteniendo el cast dinámico*: Rechazado porque contradice la semántica real de `actualizarEstadisticas()` y constituye un engaño al compilador.
  - *Escribir 25 bloques `if (props.x !== undefined) this._x = props.x;`*: Rechazado porque incrementaría la complejidad cognitiva de `actualizarEstadisticas()` a 27 (> 15), introduciendo una nueva violación `CRITICAL` (`typescript:S3776`)!

---

### Grupo C — Severidad `MINOR` de Impacto en Diagnóstico y Contratos (4 reglas, 18 ocurrencias)

#### R-06: `typescript:S6551` — Conversión Implícita a `'[object Object]'` (8 ocurrencias: `backend`)

| Archivo | Línea(s) | Expresión señalada |
| --- | --- | --- |
| `backend/src/observability/aspects/auditar-operacion.decorator.ts` | 107 | `sanitizarTexto(String(error))` |
| `backend/src/observability/config/pino-logger.config.ts` | 76, 81, 83, 84 | `String(idRaw)`, `String(emailRaw)`, `String(rolRaw)` |
| `backend/src/observability/interceptors/audit-logging.interceptor.ts` | 154, 179 | `sanitizarTexto(String(msg))`, `sanitizarTexto(String(error))` |
| `backend/src/observability/utils/audit-sanitizer.util.ts` | 171 | `return String(valor);` |

- **Decision**:
  1. Exportar desde `backend/src/observability/utils/audit-sanitizer.util.ts` dos funciones puras, deterministas y fail-safe:
     - `convertirValorATextoSeguro(valor: unknown): string`: Convierte primitivos (`string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`, `function`) de forma explícita y narrowed; para objetos (incluidos errores no estándar o payloads complejos), serializa mediante `JSON.stringify(sanitizarValor(valor))` dentro de `try/catch` (fallback `'[Objeto no serializable]'`), garantizando ausencia de `'[object Object]'`, redacción de secretos y protección ante referencias circulares.
     - `convertirCampoEscalarATexto(valor: unknown): string | null`: Para campos de actor HTTP (`idRaw`, `emailRaw`, `rolRaw` en `extraerActorHttp`), retorna `valor` si es `string`, `${valor}` si es `number | boolean | bigint`, y `null` para `null`, `undefined` u objetos no escalares.
  2. Usar `convertirValorATextoSeguro` en `auditar-operacion.decorator.ts` (L107) y `audit-logging.interceptor.ts` (L154, L179).
  3. Usar `convertirCampoEscalarATexto` en `pino-logger.config.ts` (`extraerActorHttp`, L76-84), calculando `const idTexto = convertirCampoEscalarATexto(idRaw);` una sola vez y verificando `if (user && idTexto?.trim())`.
  4. Eliminar la línea muerta L171 en `audit-sanitizer.util.ts` al reestructurar `sanitizarValor` (R-01), ya que todos los valores `typeof` de JavaScript quedan cubiertos exhaustivamente.
- **Rationale**: Centraliza la serialización segura de valores desconocidos en un único punto reusable sin duplicación de código y cumple estrictamente el requisito de diagnóstico legible (FR-005 y Edge Cases).
- **Alternatives considered**:
  - *Reemplazar por `JSON.stringify(valor)` directamente sin sanitización*: Rechazado por riesgo de fuga de datos sensibles y excepciones con referencias circulares o `BigInt`.

#### R-07: `typescript:S7773` — Métodos Numéricos Estrictos de `Number` (5 ocurrencias: `frontend`)

| Archivo | Línea(s) | Cambio exacto |
| --- | --- | --- |
| `frontend/src/api/observabilityApi.ts` | 138, 149 | `parseFloat(...)` → `Number.parseFloat(...)` (dentro del helper extraído `extraerBytesDesdeMensajeMemoria`) |
| `frontend/src/utils/formato-observabilidad.ts` | 17, 21 (x2) | `isNaN(...)` → `Number.isNaN(...)`; `isFinite(...)` → `Number.isFinite(...)` |

- **Decision**: Migrar las 5 invocaciones globales a sus equivalentes estrictos en `Number.*`.
- **Rationale**: Los parámetros ya están tipados como `string` (para `parseFloat`) o `number` (para `isNaN`/`isFinite`), preservando semántica exacta sin coerción implícita global.

#### R-08: `typescript:S7503` — Funciones `async` sin `await` (3 ocurrencias: `backend`)

| Archivo | Línea | Método | Verificación de firma |
| --- | --- | --- | --- |
| `backend/src/health/health.controller.ts` | 39 | `checkReadiness()` | `this.health.check(...)` retorna `Promise<HealthCheckResult>`. |
| `backend/src/health/health.controller.ts` | 62 | `checkLiveness()` | `this.health.check(...)` retorna `Promise<HealthCheckResult>`. (Los callbacks internos con `await` mantienen `async`). |
| `backend/src/observability/controllers/metrics.controller.ts` | 23 | `index(response)` | `PrometheusController.prototype.index` retorna `Promise<string>` (la propia documentación de `@willsoto/nestjs-prometheus` omite `async` en el override). |

- **Decision**: Remover la palabra clave `async` en las 3 firmas manteniendo explícitamente el tipo de retorno `Promise<HealthCheckResult>` y `Promise<string>`.
- **Rationale**: Mantiene el contrato HTTP, Swagger/OpenAPI y compatibilidad total con invocadores que hagan `await` en tests unitarios e integración.
- **Alternatives considered**: *Agregar `return await ...`*: Descartado porque `return await` fuera de `try/catch` es redundante y puede disparar reglas de `no-return-await`.

#### R-09: `typescript:S6571` — Literales Sobrescritos por `string` en Tipo Unión (2 ocurrencias: `frontend`)

| Archivo | Línea | Definición actual |
| --- | --- | --- |
| `frontend/src/types/observability.types.ts` | 52 | `mercado: 'primario' | 'secundario' | string;` |

- **Decision**: Simplificar el tipo a `mercado: string;` con comentario JSDoc documentando los valores esperados (`'primario'`, `'secundario'`) y mantener compatibilidad abierta con futuras etiquetas provenientes de Prometheus. En `frontend/src/utils/formato-observabilidad.ts` (L92), eliminar el cast innecesario `as any` dejando `s.labels.mercado || 'secundario'`.
- **Rationale**: En TypeScript, `'primario' | 'secundario' | string` ya se reducía a `string`. Declararlo explícitamente como `string` elimina ambas ocurrencias de `S6571` sin introducir tipos de intersección frágiles como `(string & {})` que podrían activar otras reglas de linting, y se verificó que ningún consumidor depende de literales cerrados en `DesgloseTransacciones.mercado`.
- **Alternatives considered**:
  - *`'primario' | 'secundario' | (string & {})`*: Rechazado por riesgo de activar reglas de tipo `{}` vacío en SonarJS/TypeScript.
  - *Restringir a `'primario' | 'secundario'`*: Rechazado porque `spec.md` (US3 AS4) exige explícitamente no restringir valores legítimos provenientes del servicio.

---

### Grupo D — Severidad `MINOR` de Estandarización e Higiene (8 reglas, 17 ocurrencias)

#### R-10: `typescript:S7772` — Protocolo `node:` en Módulos Nativos (5 ocurrencias: `backend`)

| Archivo | Línea | Import actual → Import remediado |
| --- | --- | --- |
| `backend/src/observability/aspects/auditar-operacion.decorator.ts` | 2 | `'perf_hooks'` → `'node:perf_hooks'` |
| `backend/src/observability/config/pino-logger.config.ts` | 1 | `'crypto'` → `'node:crypto'` |
| `backend/src/observability/config/pino-logger.config.ts` | 2 | `'http'` → `'node:http'` |
| `backend/src/observability/interceptors/audit-logging.interceptor.ts` | 9 | `'perf_hooks'` → `'node:perf_hooks'` |
| `backend/src/observability/services/audit-context.service.ts` | 2 | `'async_hooks'` → `'node:async_hooks'` |

- **Decision**: Prefijar los 5 imports nativos con `node:`. Totalmente soportado por `@types/node ^20.11.24`, TypeScript 5.3 y Jest 30.

#### R-11: `typescript:S6606` — Nullish Coalescing `??` en Lugar de Ternario (3 ocurrencias: 1 `backend`, 2 `frontend`)

| Archivo | Línea(s) | Cambio exacto | Preservación de falsy (`0`, `''`, `false`) |
| --- | --- | --- | --- |
| `backend/src/observability/services/audit-logger.service.ts` | 80-82 | `const requestId = entrada.requestId ?? this.auditContext.obtenerRequestId();` | `''` se preserva intacto; `undefined` y `null` consultan el contexto activo (`null` fuera de HTTP). Se verificó que ningún llamador pasa `requestId: null` con intención de suprimir un contexto HTTP activo. |
| `frontend/src/hooks/useObservability.ts` | 20, 27 | Extraer `const intervaloInicial = options?.intervaloInicial ?? 10000;` y reutilizarlo en ambos `useState`. | `0` (refresco pausado) se preserva intacto porque `0 ?? 10000 === 0`. |

#### R-12: `typescript:S7744` — Objeto Vacío Redundante en Spread (2 ocurrencias: `frontend`)

| Archivo | Línea | Código actual → Código remediado |
| --- | --- | --- |
| `frontend/src/api/observabilityApi.ts` | 129 | `{ ...(data?.info || {}), ...(data?.error || {}) }` → `{ ...data?.info, ...data?.error }` |

- **Decision**: Eliminar ambos `|| {}` redundantes dentro del helper `resolverDetallesLiveness`. En ECMAScript, propagar `undefined` o `null` en un literal de objeto es un no-op seguro (patrón ya usado en la línea 89 del mismo archivo).

#### R-13: `typescript:S6582` — Optional Chaining `?.` (2 ocurrencias: 1 `backend`, 1 `frontend`)

| Archivo | Línea | Código actual → Código remediado |
| --- | --- | --- |
| `backend/src/observability/services/app-metrics.service.ts` | 72 | `if (prometheusIoClient && prometheusIoClient.register && ...)` → `if (prometheusIoClient?.register && ...)` |
| `frontend/src/utils/prometheus-parser.ts` | 14 | `if (!rawText || !rawText.trim())` → `if (!rawText?.trim())` |

#### R-14: `typescript:S6353` — Clases de Caracteres Concisas `\d` y `\w` (2 ocurrencias: `frontend`)

| Archivo | Línea | Remediación |
| --- | --- | --- |
| `frontend/src/utils/prometheus-parser.ts` | 49 | En la regex de línea de muestra (promovida a constante de módulo `REGEX_LINEA_MUESTRA`), reemplazar `[0-9]+` por `\d+`. |
| `frontend/src/utils/prometheus-parser.ts` | 63 | Eliminada junto con `S8786` al introducir `parsearLabelsPrometheus` (valida claves con `/^\w+$/`). |

#### R-15: `typescript:S6594` — Uso de `RegExp.exec()` en Lugar de `String.match()` (1 ocurrencia: `frontend`)

| Archivo | Línea | Remediación |
| --- | --- | --- |
| `frontend/src/utils/prometheus-parser.ts` | 49 | Reemplazar `trimmed.match(...)` por `REGEX_LINEA_MUESTRA.exec(trimmed)`. |

#### R-16: `typescript:S7778` — Consolidación de Llamadas Consecutivas a `Array.push()` (1 ocurrencia: `frontend`)

| Archivo | Línea | Remediación |
| --- | --- | --- |
| `frontend/src/utils/navegacion.ts` | 39 | Unificar los dos `items.push(...)` del bloque `if (rol === 'ADMIN')` en una sola invocación `items.push({ ...Gobernanza }, { ...Observabilidad })`. |

#### R-17: `typescript:S5906` — Aserción Específica `.toHaveLength(700)` en Archivo de Prueba Existente (1 ocurrencia: `backend`)

| Archivo | Línea | Código actual → Cambio condicionado |
| --- | --- | --- |
| `backend/test/unit/observability/audit-sanitizer.spec.ts` | 74 | `expect(sanitizarTexto(largo, false).length).toBe(700);` → `expect(sanitizarTexto(largo, false)).toHaveLength(700);` |

- **Decision (Gobernanza Constitucional — Principio IV)**:
  - Este es el **único** de los 49 issues ubicado en una prueba preexistente.
  - Por mandato no negociable del **Principio IV de la Constitución** y **FR-009 / SC-003 de `spec.md`**, la aplicación de este cambio queda **bloqueada tras una compuerta de confirmación explícita del usuario ("sí")** en la fase de implementación (`speckit-implement`) inmediatamente antes de editar `backend/test/unit/observability/audit-sanitizer.spec.ts`.
  - Si el usuario autoriza explícitamente: se aplica únicamente esa línea preservando el contrato exacto de verificación (longitud 700), logrando 49/49 issues resueltos en código.
  - Si el usuario no autoriza modificar el archivo de prueba: el archivo permanece inalterado, los 48 issues de producción quedan 100% resueltos y el hallazgo restante se documenta como excepción constitucional (Principio IV) para resolución opcional administrativa en SonarQube Cloud.
- **Rationale**: Concilia la meta de 0 issues solicitada por el usuario con la supremacía absoluta del Principio IV de la Constitución.

---

## 3. Estrategia de Testing Aditivo y Cobertura ≥ 80%

- **Decision**:
  - **Cero modificaciones** a archivos de prueba existentes para los 48 hallazgos en código de producción (Principio IV).
  - Crear **suites unitarias aditivas nuevas** para ejercitar explícitamente todas las nuevas funciones auxiliares, ramas de error y casos límite introducidos o refactorizados (garantizando ≥ 80% de cobertura en líneas y branches en código nuevo y evitando cualquier descenso en la cobertura global de `backend` y `frontend` según Principio VI):
    1. `backend/test/unit/observability/audit-sanitizer-remediation.spec.ts`: pruebas para `convertirValorATextoSeguro` (objetos anidados, referencias circulares, secretos redactados, funciones, símbolos, `null`/`undefined`, `BigInt`), `convertirCampoEscalarATexto`, `redactarCredencialUrlSinParser` (URLs malformadas sin usuario/con espacios/entradas largas anti-ReDoS) y casos borde de `REGEX_CREDENCIALES_URL` y `REGEX_TOKEN_BEARER` con cadenas extensas.
    2. `frontend/tests/unit/utils/observability-remediation.test.ts`: pruebas para entradas extensas anti-ReDoS en `mapearTerminusLiveness` (mensajes `MB`/`GB`, decimales, mensajes malformados largos) y `parsePrometheusText` (labels con comas internas, etiquetas largas sin `=`, líneas con timestamp numérico), más `useObservability` con `intervaloInicial: 0` y fallback de runtime.
- **Rationale**: Satisface simultáneamente el Principio III (happy paths + edge cases), el Principio IV (inmutabilidad de tests existentes) y el Principio VI (≥ 80% cobertura en líneas y branches en ambos stacks y en todo código nuevo).
