# Data Model: Auditoría de Web-Services y Eventos Críticos de Negocio

**Feature**: `019-backend-audit-logging` | **Date**: 2026-11-28

> **Nota de Almacenamiento (FR-008)**: Esta funcionalidad **no crea nuevas tablas ni migraciones** en PostgreSQL (Supabase plan gratuito, cuota 500 MB) ni escribe archivos locales en disco (Render plan gratuito, filesystem efímero). Todos los modelos definidos en este documento representan **esquemas estructurados JSON (NDJSON)** emitidos a `stdout` por `nestjs-pino` y estructuras de política en memoria dentro del módulo transversal `ObservabilityModule`. Las tablas de dominio existentes (`transacciones`, `ordenes`, `cotizaciones`, `equipos_semanales`, `ejecuciones_scraping`) actúan como respaldo histórico persistente del negocio.

---

## 1. Entidad: `RegistroAuditoriaHttp` (Web-Service Audit Record)

Representa el rastro estructurado único emitido por `AuditLoggingInterceptor` (aspecto AOP HTTP) al finalizar cada solicitud HTTP dirigida a un endpoint funcional del backend, o por el fallback coordinado de `pino-http` cuando la solicitud falla antes de alcanzar el ciclo de interceptores (401/403/404).

### Campos

| Campo | Tipo | Obligatorio | Reglas de Validación / Formato |
|---|---|---|---|
| `level` | `number` | Sí | Nivel numérico Pino (`30` = `info` para 2xx/3xx, `40` = `warn` para 4xx, `50` = `error` para 5xx o excepción no controlada, `20` = `debug` para rutas técnicas si `LOG_LEVEL=debug`). |
| `timestamp` | `string` | Sí | Marca temporal UTC en formato ISO-8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`). |
| `servicio` | `string` | Sí | Valor constante `'football-tokens-backend'`. |
| `entorno` | `string` | Sí | Valor de `NODE_ENV` (por defecto `'development'`). |
| `tipoEvento` | `'HTTP_AUDIT'` | Sí | Discriminador fijo para distinguir trazas HTTP de eventos de negocio y logs operativos. |
| `requestId` | `string` | Sí | Identificador de correlación único por solicitud. Reutiliza encabezado entrante `x-request-id` (sanitizado, longitud máx. 128 caracteres alfanuméricos/guiones) o genera UUID v4. |
| `usuario` | `ActorAuditoriaHttp` | Sí | Identidad resuelta tras guards de autenticación (ver sub-estructura). |
| `operacion` | `OperacionHttp` | Sí | Método HTTP, ruta normalizada y controlador/handler cuando aplica (ver sub-estructura). |
| `parametros` | `ParametrosHttpSanitizados` | Sí | Parámetros de ruta, consulta y cuerpo tras aplicar `PoliticaSanitizacion` (ver sub-estructura). |
| `codigoEstado` | `number` | Sí | Código de estado HTTP de respuesta (`100`–`599`). |
| `tiempoEjecucion` | `number` | Sí | Duración total de la solicitud en milisegundos (`>= 0`, redondeada a entero o 2 decimales). |
| `error` | `ResumenErrorHttp \| undefined` | Condicional | Presente únicamente cuando `codigoEstado >= 400`. Contiene `{ codigoEstado: number, mensaje: string \| string[] }` sanitizado. |
| `msg` | `string` | Sí | Resumen legible corto (ej. `'HTTP POST /orders/buy 200'`). |

### Sub-estructuras de `RegistroAuditoriaHttp`

#### `ActorAuditoriaHttp`
- **Autenticado**:
  ```json
  {
    "autenticado": true,
    "id": "uuid-usuario",
    "email": "usuario@ejemplo.com",
    "rol": "USUARIO"
  }
  ```
  - `rol` puede ser `'USUARIO'`, `'ADMIN'` o `null` (si `JwtAuthGuard` pobló `{ id, email }` sin pasar por `RolesGuard`).
- **Anónimo** (endpoints públicos o fallo antes de autenticación, ej. 401/404):
  ```json
  {
    "autenticado": false,
    "tipo": "ANONIMO",
    "id": null,
    "email": null,
    "rol": null
  }
  ```

#### `OperacionHttp`
- `metodo`: `string` (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc.).
- `ruta`: `string` — ruta sin querystring (preferiblemente plantilla de ruta Express `req.route.path` combinada con baseUrl cuando existe, o `pathname` limpio en 404).
- `controlador`: `string | null` — `NombreController.nombreMetodo` capturado por `AuditLoggingInterceptor` (aspecto AOP HTTP) si la solicitud alcanzó un handler NestJS; `null` si falló antes (401/403/404).

#### `ParametrosHttpSanitizados`
- `ruta`: `Record<string, unknown>` — copia sanitizada de `req.params`.
- `consulta`: `Record<string, unknown>` — copia sanitizada de `req.query`.
- `cuerpo`: `Record<string, unknown> | null` — copia sanitizada de `req.body` (solo presente en métodos con cuerpo; `null` o `{}` en `GET`/`DELETE` sin body).

### Reglas de Nivel de Severidad (Transiciones por Resultado HTTP)
- `codigoEstado < 400` → nivel `info`
- `400 <= codigoEstado < 500` → nivel `warn`
- `codigoEstado >= 500` o error de stream/socket → nivel `error`
- Ruta excluida (`/health/*`, `/metrics`, `/api/docs*`):
  - Si `LOG_LEVEL !== 'debug'` → **omitido** (no se emite registro).
  - Si `LOG_LEVEL === 'debug'` → nivel `debug`.

---

## 2. Entidad Base: `EventoAuditoriaNegocio` (Business Audit Event)

Representa un hito crítico del dominio emitido por `AuditLoggerService` (tanto desde una solicitud HTTP como desde tareas programadas `@Cron` o scripts standalone).

### Campos Comunes Obligatorios

| Campo | Tipo | Obligatorio | Reglas de Validación |
|---|---|---|---|
| `timestamp` | `string` | Sí | Marca temporal UTC en formato ISO-8601. |
| `servicio` | `string` | Sí | `'football-tokens-backend'`. |
| `entorno` | `string` | Sí | Valor de `NODE_ENV`. |
| `tipoEvento` | `'BUSINESS_AUDIT'` | Sí | Discriminador fijo para eventos críticos de negocio. |
| `evento` | `NombreEventoNegocio` | Sí | Uno de los valores del catálogo cerrado de eventos (ver sección 2.1). |
| `requestId` | `string \| null` | Sí | Correlación automática obtenida vía `AsyncLocalStorage` si se originó en un request HTTP; `null` en ejecuciones `@Cron` o standalone. |
| `origen` | `OrigenEventoNegocio` | Sí | `'HTTP'` \| `'MANUAL'` \| `'PROGRAMADO'` \| `'PROGRAMADO_TOTW'` \| `'STANDALONE'` \| `'SISTEMA'`. |
| `usuarioId` | `string \| null` | Sí | Identificador del actor responsable (comprador, vendedor o administrador); `null` en procesos automáticos/sistema. |
| `resultado` | `ResultadoAuditoriaNegocio` | Sí | `'EXITO'` \| `'RECHAZADO'` \| `'OMITIDO'` \| `'FALLIDO'`. |
| `motivo` | `string \| null` | Sí | Motivo resumido y sanitizado cuando `resultado !== 'EXITO'`; `null` en éxito. |
| `tiempoEjecucion` | `number` | Sí | Duración en milisegundos (`>= 0`). |
| `datos` | `Record<string, unknown>` | Sí | Metadatos específicos del evento según su tipo (sanitizados recursivamente). |

### Política de Nivel de Severidad para Eventos de Negocio
- `resultado === 'EXITO'` → nivel `info`
- `resultado === 'RECHAZADO'` o `'OMITIDO'` → nivel `warn`
- `resultado === 'FALLIDO'` → nivel `error`

---

### 2.1 Variantes Especializadas de `EventoAuditoriaNegocio`

#### A. `TRANSACCION_TOKENS` (FR-004 / US2 — `OmsService`)
Emitido al liquidar o rechazar una compra de tokens en mercado primario o secundario.
- **Campos en `datos`**:
  - `mercado`: `'PRIMARIO' | 'SECUNDARIO'`
  - `operacion`: `'COMPRA'`
  - `compradorId`: `string`
  - `vendedorId`: `string | null` (UUID del vendedor o del ADMIN en mercado primario; `null` si rechazado antes de resolver)
  - `transaccionId`: `string | null` (`null` si rechazado/fallido)
  - `ordenId`: `string | null` (UUID de orden de compra en primario o de orden de venta liquidada en secundario)
  - `jugadorId`: `string | null`
  - `cantidad`: `number`
  - `precioUnitario`: `number | null`
  - `montoTotal`: `number | null`
  - `estrategiaCotizacion`: `string | null`

#### B. `ORDEN_MERCADO_SECUNDARIO` (US2 — `OmsService`)
Emitido al crear o cancelar una orden de venta en mercado secundario (éxito o rechazo).
- **Campos en `datos`**:
  - `mercado`: `'SECUNDARIO'`
  - `accion`: `'CREAR_VENTA' | 'CANCELAR_VENTA'`
  - `vendedorId`: `string`
  - `ordenId`: `string | null`
  - `jugadorId`: `string | null`
  - `cantidad`: `number | null`
  - `precioUnitario`: `number | null`
  - `estadoOrden`: `'PENDIENTE' | 'CANCELADA' | null`

#### C. `CALCULO_COTIZACIONES` (FR-005 / US3 — `QuotesService` & `QuotesSchedulerService`)
Emitido al finalizar, omitir o fallar un recálculo masivo de cotizaciones.
- **Campos en `datos`**:
  - `estrategiaId`: `string | null` (`'GLOBAL' | 'POSICIONAL'`)
  - `estrategiaVersion`: `string | null` (ej. `'GLOBAL_v1'`, `'POSICIONAL_v1'`)
  - `procesados`: `number` (jugadores con cotización calculada)
  - `sinEstadisticas`: `number` (jugadores sin estadísticas disponibles)
  - `fallidos`: `number` (jugadores con error de cálculo o persistencia)

#### D. `CAMBIO_ESTRATEGIA_COTIZACION` (FR-005 / US3 — `QuotesService`)
Emitido al intentar o concretar el cambio de estrategia activa del marketplace.
- **Campos en `datos`**:
  - `estrategiaAnterior`: `string | null`
  - `estrategiaNueva`: `string`
  - `versionNueva`: `string | null`

#### E. `CALCULO_TEAM_OF_THE_WEEK` (FR-006 / US3 — `EquipoSemanalService` & `TeamOfTheWeekSchedulerService`)
Emitido en cada generación manual o automática del Equipo de la Semana (generado, omitido, rechazado o fallido).
- **Campos en `datos`**:
  - `ano`: `number` (año ISO)
  - `semanaIso`: `number` (`1`–`53`)
  - `estrategiaId`: `string | null`
  - `estrategiaVersion`: `string | null`
  - `cantidadMiembros`: `number` (`11` en éxito, `0` en omisión/fallo)

#### F. `SCRAPING_ESTADISTICAS` y `SCRAPING_LIGA` (FR-007 / US4 — `ScrapingService`)
Emitido para cada corrida del scraper (API administrativa, cron o standalone), cada liga procesada, recuperación de ejecuciones huérfanas/atascadas y rechazos por concurrencia.
- **Campos en `datos` (`SCRAPING_ESTADISTICAS`)**:
  - `subtipo`: `'EJECUCION_COMPLETA' | 'RECUPERACION_HUERFANA' | 'RECUPERACION_ATASCADA' | 'RECHAZO_CONCURRENCIA'` (`RECUPERACION_HUERFANA` en `recuperarEjecucionesAtascadas()` al arrancar el módulo; `RECUPERACION_ATASCADA` en `resolverEjecucionEnProgreso()` cuando una ejecución previa excedió `STALE_TIMEOUT_MS`)
  - `ejecucionId`: `string | null`
  - `disparador`: `string` (`'manual'`, `'programado'`, `'standalone'`, `'SISTEMA'`). Mapeo determinista a `origen`: `'manual'` → `'MANUAL'`, `'programado'` → `'PROGRAMADO'` (usado también por `run-scraper.ts` para preservar retrocompatibilidad con `run-scraper.spec.ts`, con `requestId: null`), `'standalone'` → `'STANDALONE'`, y recuperaciones automáticas → `'SISTEMA'`.
  - `ligasProcesadas`: `string[]` (códigos de liga, ej. `['PL', 'PD', 'SA', 'BL1', 'FL1']`)
  - `tasaAsociacion`: `number | null` (porcentaje promedio `0`–`100`)
  - `conteoIncidencias`: `number`
  - `jugadoresProcesados`: `number`
  - `errores`: `number`
  - `estadoFinal`: `'EXITOSO' | 'FALLIDO' | 'RECHAZADO' | 'EN_PROGRESO'`
- **Campos en `datos` (`SCRAPING_LIGA`)**:
  - `ejecucionId`: `string`
  - `liga`: `string`
  - `descubiertos`: `number`
  - `deduplicados`: `number`
  - `asociados`: `number`
  - `descartados`: `number`
  - `tasaAsociacion`: `number`
  - `conteoIncidencias`: `number`
  - `rechazadaPorCobertura`: `boolean`

---

## 3. Entidad de Configuración: `PoliticaSanitizacionYFiltrado`

Define las reglas deterministas aplicadas antes de la emisión de cualquier registro.

### 3.1 Claves Sensibles Redactadas (`[REDACTED]`)
Coincidencia case-insensitive sobre nombres de propiedad (normalizando guiones y guiones bajos):
- **Autenticación y sesiones**: `password`, `contrasena`, `contraseña`, `passwordhash`, `contrasenahash`, `passwd`, `pwd`, `authorization`, `cookie`, `set-cookie`, `token`, `tokendeacceso`, `accesstoken`, `refreshtoken`, `idtoken`, `jwt`, `bearer`, `secret`, `apikey`, `x-api-key`, `x-auth-token`, `clientsecret`.
- **Proxies del Scraper**: `proxy`, `proxyurl`, `proxyusername`, `proxypassword`, `scraping_proxy_url`, `scraping_proxy_server`, `scraping_proxy_username`, `scraping_proxy_password`, `http_proxy`, `https_proxy`.

### 3.2 Patrones de Redacción en Cadenas de Texto
1. Credenciales embebidas en URLs: `/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:@\s/]+):([^@\s/]+)@/g` → `$1[REDACTED]@`
2. Encabezados Bearer embebidos: `/\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi` → `Bearer [REDACTED]`

### 3.3 Límites de Seguridad de Memoria (Render 512 MB Free Tier)
- Profundidad máxima de recursión: `5` niveles (`'[MAX_DEPTH]'`).
- Referencias circulares: detectadas con `WeakSet` (`'[CIRCULAR]'`).
- Longitud máxima de string individual: `512` caracteres (sufijo `'...[TRUNCATED]'`).
- Máximo de elementos por array: `25` ítems (elemento resumen `'[+N items]'`).
- Máximo de propiedades por objeto: `30` claves (propiedad resumen `_truncatedKeys: N`).
- Presupuesto máximo por objeto `parametros` serializado: `4096` bytes (si lo excede, se reemplaza conservando las 3 claves obligatorias del contrato JSON Schema: `{ ruta: {}, consulta: {}, cuerpo: { _truncated: true, bytesOriginales: N } }`).

### 3.4 Rutas Técnicas Excluidas de Auditoría HTTP Estándar (FR-002)
- `/health` y cualquier subruta `/health/*` (`/health/live`, `/health/ready`)
- `/metrics`
- `/api/docs`, `/api/docs/*`, `/api/docs-json`, `/api/docs-yaml`

### 3.5 Política de Entorno y Niveles de Log

| Entorno (`NODE_ENV`) | Nivel por defecto (`LOG_LEVEL`) | Formato de salida | Rutas técnicas (`/health/*`, `/metrics`, `/api/docs*`) | Política Redis sin configurar |
|---|---|---|---|---|
| `production` | `info` | JSON NDJSON crudo en `stdout` (sin `pino-pretty`) | Excluidas (solo si `LOG_LEVEL=debug`) | Deshabilitado silenciosamente (`0` warnings) si no hay `REDIS_URL`/`REDIS_HOST` |
| `development` | `info` (configurable vía `LOG_LEVEL`) | `pino-pretty` en `stdout` (desactivable con `LOG_PRETTY=false`) | Excluidas salvo `LOG_LEVEL=debug` | Habilitado por defecto (`127.0.0.1:6379`) salvo `REDIS_ENABLED=false` |
| `test` | `silent` (o `info` si `LOG_LEVEL` explícito) | JSON NDJSON (inyectable en stream de prueba) | Excluidas salvo `LOG_LEVEL=debug` | Habilitado por defecto (retrocompatible con tests existentes) |

---

## 4. Entidad de Aspecto AOP: `OpcionesAspectoAuditoria` y Relaciones Conceptuales

### 4.1 Contrato de Configuración del Decorador `@AuditarOperacion`

| Propiedad | Tipo | Obligatoria | Descripción |
|---|---|---|---|
| `evento` | `NombreEventoNegocio` | Sí | Evento de auditoría que emitirá el *around advice*. |
| `origen` | `OrigenEventoNegocio \| ((args, metadatos) => OrigenEventoNegocio)` | Sí | Origen fijo o resuelto dinámicamente a partir de los argumentos/contexto. |
| `extraerUsuarioId` | `(args, metadatos) => string \| null` | No | Resuelve el identificador del actor responsable (`null` por defecto). |
| `debeEmitir` | `(resultado, args, metadatos) => boolean` | No | Condición opcional para omitir la emisión en caminos exitosos (ej. sin huérfanas recuperadas o evento ya emitido por servicio delegado). |
| `debeEmitirError` | `(error, args, metadatos) => boolean` | No | Condición opcional para omitir la emisión ante excepciones. Adicionalmente, el aspecto deduplica automáticamente errores propagados desde un método interno decorado con el mismo `evento` (marcando el error o alcance como ya auditado para ese `evento`), evitando duplicados entre schedulers y servicios delegados. |
| `extraerResultadoExito` | `(resultado, args, metadatos) => { resultado: ResultadoAuditoriaNegocio; motivo?: string \| null; datos: Record<string, unknown> }` | Sí | Proyecta el retorno del método y metadatos contextuales al payload `datos` (sin alterar el retorno original). |
| `extraerDatosError` | `(error, args, metadatos) => Record<string, unknown>` | No | Proyecta metadatos adicionales ante excepciones; el aspecto clasifica automáticamente `RECHAZADO` (4xx / `ReglaDeNegocioException`) vs `FALLIDO` (5xx / inesperado) y sanitiza `motivo`. |

### 4.2 Flujo de Ejecución AOP y Correlación

```text
Solicitud HTTP entrante (x-request-id opcional)
   │
   ├──► AuditContextMiddleware (AsyncLocalStorage: { requestId })
   │       │
   │       ├──► [Si falla antes del Controller: 401 / 403 / 404]
   │       │        └──► pino-http fallback emite [1] RegistroAuditoriaHttp (HTTP_AUDIT)
   │       │             (Nota: los errores 400 de ValidationPipe pasan por AuditLoggingInterceptor;
   │       │              el parsing JSON crudo de express.json() corre previo al middleware de módulo)
   │       │
   │       └──► [Si alcanza Controller funcional (incl. 400 ValidationPipe)]
   │                └──► AuditLoggingInterceptor (AOP NestInterceptor — Around Advice)
   │                         ├──► Invoca Controller -> Service
   │                         │        └──► @AuditarOperacion (AOP Method Decorator — Around Advice)
   │                         │                 ├── Cronometra, captura metadatos de operación y excepciones
   │                         │                 └── Emite [0..N] EventoAuditoriaNegocio (BUSINESS_AUDIT, requestId = <id>)
   │                         └──► Emite [1] RegistroAuditoriaHttp (HTTP_AUDIT, requestId = <id>)
   │                                  y marca req.__httpAuditLogged = true (evita duplicado en pino-http)
   │
Proceso @Cron / Script Standalone (sin ciclo HTTP)
   │
   └──► @AuditarOperacion (AOP Method Decorator — Around Advice, preservando metadatos Reflect/@Cron)
            └──► Emite [1..N] EventoAuditoriaNegocio (BUSINESS_AUDIT, requestId = null)
```
